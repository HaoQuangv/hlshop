const express = require("express");
const multer = require("multer");

const router = express.Router();
const database = require("../../config");

const checkAuth = require("../../middleware/check_auth");
const checkRoleAdmin = require("../../middleware/check_role_admin");
const redisClient = require("../../middleware/redisClient");

require("dotenv").config();

const firebase = require("../../firebase");

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
});

const set = (key, value) => {
  redisClient.set(key, JSON.stringify(value), "EX", 3600);
};

const get = async (request, response, next) => {
  let key = request.route.path + JSON.stringify(request.query) + new Date();
  console.log("HLSHOP");
  console.log(key);
  let headersSent = false; // Cờ để kiểm tra xem header đã được gửi đi chưa

  redisClient.on("error", (error) => {
    console.error("Redis connection error:", error);
    if (!headersSent) {
      response.status(500).json({ error: "Internal Server Error" });
      headersSent = true;
    }
  });

  redisClient.get(key, (error, data) => {
    if (error) {
      if (!headersSent) {
        response.status(400).send(error);
        headersSent = true;
      }
    } else {
      if (data !== null) {
        if (!headersSent) {
          response.status(200).send(JSON.parse(data));
          headersSent = true;
        }
      } else {
        next();
      }
    }
  });
};

router.post(
  "/create-media-product",
  upload.array("file", 9),
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const idProduct = request.body.idProduct;
      var urls = [];

      if (!request.files) {
        response.status(400).json({
          Message: "Khong tim thay file",
        });
      } else {
        console.log(27);
        const files = request.files;

        for (const file of files) {
          try {
            const blob = firebase.bucket.file(file.originalname);
            console.log(32);
            const blobWriter = blob.createWriteStream({
              metadata: {
                contentType: file.mimetype,
              },
            });

            await new Promise((resolve, reject) => {
              blobWriter.on("error", (err) => {
                console.log(err);
                reject(err);
              });

              blobWriter.on("finish", async () => {
                try {
                  const url = await blob.getSignedUrl({
                    action: "read",
                    expires: "03-09-2491",
                  });
                  const publicUrl = url[0];
                  urls.push(publicUrl);

                  const createDated = new Date();
                  const queryMedia =
                    "INSERT INTO Media(linkString, title, description, id_product, createdDate, isDefault) VALUES (@linkString, @title, @description, @idProduct, @createdDate, 0)";
                  await database
                    .request()
                    .input("linkString", publicUrl)
                    .input("title", "")
                    .input("description", "")
                    .input("idProduct", idProduct)
                    .input("createdDate", createDated)
                    .query(queryMedia);

                  resolve();
                } catch (err) {
                  reject(err);
                }
              });

              blobWriter.end(file.buffer);
            });
          } catch (err) {
            console.log(err);
            // Xử lý lỗi nếu cần thiết
          }
        }

        console.log(101);
        const queryDefaultMedia =
          "UPDATE Media SET isDefault = 1 OUTPUT inserted.id WHERE id_product = @idProduct AND createdDate = (SELECT MIN(createdDate) FROM Media WHERE id_product = @idProduct)";
        const resultDefaultMedia = await database
          .request()
          .input("idProduct", idProduct)
          .query(queryDefaultMedia);

        console.log(resultDefaultMedia.recordset[0].id);
        response.status(200).json({
          Message: "Upload successful!",
          urls: urls,
        });
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.post(
  "/create-media-attribute",
  upload.single("file"),
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const idAttribute = request.body.idAttribute;
      console.log(idAttribute);
      if (!request.file) {
        response.status(400).json({
          Message: "Khong tim thay file",
        });
      } else {
        const blob = firebase.bucket.file(request.file.originalname);
        const blobWriter = blob.createWriteStream({
          metadata: {
            contentType: request.file.mimetype,
          },
        });
        blobWriter.on("error", (err) => {
          response.status(500).json({
            error: err.message,
          });
        });

        blobWriter.on("finish", async () => {
          try {
            const signedUrls = await blob.getSignedUrl({
              action: "read",
              expires: "03-01-2500", // Ngày hết hạn của đường dẫn
            });
            const publicUrl = signedUrls[0];

            const queryAttribute =
              "UPDATE Product_attribute1 SET image = @image WHERE id = @idAttribute";
            const resultAttribute = await database
              .request()
              .input("image", publicUrl)
              .input("idAttribute", idAttribute)
              .query(queryAttribute);

            response.status(201).json({
              Message: "Upload successful!",
            });
          } catch (err) {
            response.status(500).json({
              error: err.message,
            });
          }
        });

        blobWriter.end(request.file.buffer);
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.post(
  "/create-product",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const name = request.body.name;
      const slogan = request.body.slogan;
      const description = request.body.description;
      const notes = request.body.notes;
      const madeIn = request.body.madeIn;
      const uses = request.body.uses;
      const idCategory = request.body.idCategory;
      const attribute1 = request.body.attribute1;
      const attribute2 = request.body.attribute2;
      const atttributeValue1 = request.body.atttributeValue1;
      const atttributeValue2 = request.body.atttributeValue2;
      const quantity = request.body.quantity;
      const price = request.body.price;

      var arrayIdAttribureValue1 = [];
      var arrayIdAttribureValue2 = [];
      const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
      const userResult = await database
        .request()
        .input("idAccount", request.userData.uuid)
        .query(queryUser);

      const queryProduct =
        "INSERT INTO Product(name, slogan, description, notes, madeIn, uses, priceDisplay, sellQuantity, id_Category, id_User) OUTPUT inserted.id  VALUES (@name, @slogan, @description, @notes, @madeIn, @uses, @priceDisplay, @sellQuantity, @idCategory, @idUser)";
      const productResult = await database
        .request()
        .input("name", name)
        .input("slogan", slogan)
        .input("description", description)
        .input("notes", notes)
        .input("madeIn", madeIn)
        .input("uses", uses)
        .input("priceDisplay", "")
        .input("sellQuantity", 0)
        .input("idCategory", idCategory)
        .input("idUser", userResult.recordset[0].id)
        .query(queryProduct);

      if (attribute1 === "") {
        const updatePriceDisplay =
          "UPDATE Product SET priceDisplay = @price WHERE id = @idProduct";
        const updateResult = await database
          .request()
          .input("price", price[0])
          .input("idProduct", productResult.recordset[0].id)
          .query(updatePriceDisplay);

        const insertProductSku =
          "INSERT INTO Product_sku(quantity, price, idProduct) VALUES (@quantity, @price, @idProduct)";
        const resultProductSku = await database
          .request()
          .input("quantity", quantity[0])
          .input("price", price[0])
          .input("idProduct", productResult.recordset[0].id)
          .query(insertProductSku);
      } else if (attribute2 === "") {
        const insertProductAttribute1 =
          "INSERT INTO Product_attribute1 (name, description, image, id_product) OUTPUT inserted.id VALUES (@name, @description, @image, @idProduct)";
        const insertProductSku =
          "INSERT INTO Product_sku(quantity, price, idAttribute1, idProduct) VALUES (@quantity, @price, @idAttribute1, @idProduct)";
        for (var x = 0; x < atttributeValue1.length; x++) {
          const resultProductAttribute1 = await database
            .request()
            .input("name", attribute1)
            .input("description", atttributeValue1[x])
            .input("image", "")
            .input("idProduct", productResult.recordset[0].id)
            .query(insertProductAttribute1);

          const resultProductSku = await database
            .request()
            .input("quantity", quantity[x])
            .input("price", price[x])
            .input("idAttribute1", resultProductAttribute1.recordset[0].id)
            .input("idProduct", productResult.recordset[0].id)
            .query(insertProductSku);

          arrayIdAttribureValue1.push(resultProductAttribute1.recordset[0].id);
        }

        const updatePriceDisplay =
          "UPDATE Product SET priceDisplay = @price WHERE id = @idProduct";
        const priceDisplay =
          Math.min(...price).toString() + " - " + Math.max(...price).toString();
        const updateResult = await database
          .request()
          .input("price", priceDisplay)
          .input("idProduct", productResult.recordset[0].id)
          .query(updatePriceDisplay);
      } else {
        const insertProductAttribute1 =
          "INSERT INTO Product_attribute1 (name, description, image, id_product) OUTPUT inserted.id VALUES (@name, @description, @image, @idProduct)";
        const insertProductAttribute2 =
          "INSERT INTO Product_attribute2 (name, description, id_product) OUTPUT inserted.id VALUES (@name, @description, @idProduct)";
        const insertProductSku =
          "INSERT INTO Product_sku(quantity, price, idAttribute1, idAttribute2, idProduct) VALUES (@quantity, @price, @idAttribute1, @idAttribute2, @idProduct)";

        for (var i = 0; i < atttributeValue1.length; i++) {
          const resultProductAttribute1 = await database
            .request()
            .input("name", attribute1)
            .input("description", atttributeValue1[i])
            .input("image", "")
            .input("idProduct", productResult.recordset[0].id)
            .query(insertProductAttribute1);

          arrayIdAttribureValue1.push(resultProductAttribute1.recordset[0].id);
        }

        for (var j = 0; j < atttributeValue2.length; j++) {
          const resultProductAttribute2 = await database
            .request()
            .input("name", attribute2)
            .input("description", atttributeValue2[j])
            .input("idProduct", productResult.recordset[0].id)
            .query(insertProductAttribute2);

          arrayIdAttribureValue2.push(resultProductAttribute2.recordset[0].id);
        }

        var x = 0;
        for (var i = 0; i < arrayIdAttribureValue1.length; i++) {
          for (var j = 0; j < arrayIdAttribureValue2.length; j++) {
            const resultProductSku = await database
              .request()
              .input("quantity", quantity[x])
              .input("price", price[x])
              .input("idAttribute1", arrayIdAttribureValue1[i])
              .input("idAttribute2", arrayIdAttribureValue2[j])
              .input("idProduct", productResult.recordset[0].id)
              .query(insertProductSku);

            x++;
          }
        }

        const updatePriceDisplay =
          "UPDATE Product SET priceDisplay = @price WHERE id = @idProduct";
        const priceDisplay =
          Math.min(...price).toString() + " - " + Math.max(...price).toString();
        const updateResult = await database
          .request()
          .input("price", priceDisplay)
          .input("idProduct", productResult.recordset[0].id)
          .query(updatePriceDisplay);
      }

      response.status(200).json({
        idProduct: productResult.recordset[0].id,
        arrayAttributeValue1: arrayIdAttribureValue1,
        arrayAttributeValue2: arrayIdAttribureValue2,
      });
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

async function getProductDetail(idProduct) {
  try {
    const queryProduct = `
      SELECT 
      p.id AS productID,
      p.name AS productName,
      p.description AS productDescription,
      p.slogan AS productSlogan,
      p.notes AS productNotes,
      p.madeIn AS productMadeIn,
      ps.id AS productSKUID,
      ps.price AS price,
      ps.priceBefore AS priceBefore,
      m.id AS mediaID,
      m.linkString AS linkString,
      m.title AS title,
      m.description AS description,
      c.id AS productCategoryID,
      c.name AS productCategoryName,
      c.image AS linkStringCate
      FROM Product as p
      JOIN ProductSku as ps ON p.id = ps.idProduct
      LEFT JOIN Media as m ON p.id = m.id_product
      LEFT JOIN Category as c ON p.id_Category = c.id
      WHERE p.id = @idProduct
    `;

    const result = await database
      .request()
      .input("idProduct", idProduct)
      .query(queryProduct);

    const resultMap = {};
    result.recordset.forEach((item) => {
      const { productID, productSKUID, mediaID } = item;
      if (!resultMap[productID]) {
        resultMap[productID] = {
          productID: productID,
          productName: item.productName,
          productDescription: item.productDescription,
          productSlogan: item.productSlogan,
          productNotes: item.productNotes,
          productMadeIn: item.productMadeIn,
          medias: [],
          seller: {
            sellerID: "75B9BA7C-0258-4830-9F08-66B74720229B",
            businessName: "HLSHOP",
            contactFullName: "Bùi Hào Quang",
            userType: 0,
            linkString:
              "https://storage.googleapis.com/hlsop-393ef.appspot.com/Kurumi.jpg?GoogleAccessId=firebase-adminsdk-5uq3u%40hlsop-393ef.iam.gserviceaccount.com&Expires=16446992400&Signature=URnlqluKjIKXmYPn2kkeuHnFSLGlOh8UVOMDzVLki8Jr5Vm7dEsCpik%2BaX%2Bcec7AGwqNyNMfowi7Udn8zu9sOVrRP8zwIkGMRTQ6pEfu9H9aeBJJeDj7qEkNsNoV%2BxHyWU7mACqD6eG0qIrtoknwOeEzuesJQSUyTpDls2VVtPeaBPD4Am7tj%2FCSBOUDKL3dC5HFKh%2F3fkzmYEGJOj7kE1CnBIfEXHElUfE03xAP682UzlEEp4SQGTRVWjHWnq5GmbImUHrKtUvVaSUcmm%2FJEfo542pk%2FYvs0HW1VxSvkS27F2xkgvuMFjN3DM8v%2BtEYlXhrObCf6G7N8aDiNipe0Q%3D%3D",
          },
          productCategory: {
            productCategoryID: item.productCategoryID,
            productCategoryName: item.productCategoryName,
            linkString: item.linkStringCate,
          },
          productSKU: [],
        };
      }
      const mediaExist = resultMap[productID].medias.some(
        (media) => media.mediaID === mediaID
      );
      if (!mediaExist) {
        resultMap[productID].medias.push({
          mediaID: mediaID,
          linkString: item.linkString,
          title: item.title ? item.title : "",
          description: item.description ? item.description : "",
        });
      }

      // Kiểm tra xem productSKU có tồn tại trong productSKU hay không
      const skuExist = resultMap[productID].productSKU.some(
        (sku) => sku.productSKUID === productSKUID
      );
      if (!skuExist) {
        resultMap[productID].productSKU.push({
          productSKUID: productSKUID,
          linkString: item.linkString,
          price: item.price.toString(),
          priceBefore: item.priceBefore.toString(),
        });
      }
    });

    const resultArray = Object.values(resultMap);
    return resultArray[0];
  } catch (error) {
    throw error;
  }
}
router.get("/get-detail", async (request, response) => {
  try {
    const idProduct = request.query.ProductID;
    const result = await getProductDetail(idProduct);
    response.status(200).json(result);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

async function getListProduct(typeOfList, idCategory) {
  try {
    var queryProduct = "";
    switch (typeOfList) {
      case "best-seller":
        queryProduct = `
              SELECT
              p.id AS productID,
              p.name AS productName,
              p.description AS productDescription,
              p.slogan AS productSlogan,
              p.notes AS productNotes,
              p.madeIn AS productMadeIn,
              p.sellQuantity AS sellQuantity,
              p.createdDate AS createdDate,
              ps.id AS productSKUID,
              ps.price AS price,
              ps.priceBefore AS priceBefore,
              m.id AS mediaID,
              m.linkString AS linkString,
              m.title AS title,
              m.description AS description
              FROM Product as p
              JOIN ProductSku as ps ON p.id = ps.idProduct
              JOIN Media as m ON p.id = m.id_product
              ORDER BY p.sellQuantity DESC
            `;
        break;
      case "new":
        queryProduct = `
              SELECT
              p.id AS productID,
              p.name AS productName,
              p.description AS productDescription,
              p.slogan AS productSlogan,
              p.notes AS productNotes,
              p.madeIn AS productMadeIn,
              p.sellQuantity AS sellQuantity,
              p.createdDate AS createdDate,
              ps.id AS productSKUID,
              ps.price AS price,
              ps.priceBefore AS priceBefore,
              m.id AS mediaID,
              m.linkString AS linkString,
              m.title AS title,
              m.description AS description
              FROM Product as p
              JOIN ProductSku as ps ON p.id = ps.idProduct
              JOIN Media as m ON p.id = m.id_product
              ORDER BY p.createdDate DESC
            `;
        break;
      case "hot":
        queryProduct = `
              SELECT
              p.id AS productID,
              p.name AS productName,
              p.description AS productDescription,
              p.slogan AS productSlogan,
              p.notes AS productNotes,
              p.madeIn AS productMadeIn,
              p.sellQuantity AS sellQuantity,
              p.createdDate AS createdDate,
              ps.id AS productSKUID,
              ps.price AS price,
              ps.priceBefore AS priceBefore,
              m.id AS mediaID,
              m.linkString AS linkString,
              m.title AS title,
              m.description AS description
              FROM Product as p
              JOIN ProductSku as ps ON p.id = ps.idProduct
              JOIN Media as m ON p.id = m.id_product
              ORDER BY p.sellQuantity, p.createdDate DESC
            `;
        break;
      case "good-price-today":
        queryProduct = `
              SELECT
              p.id AS productID,
              p.name AS productName,
              p.description AS productDescription,
              p.slogan AS productSlogan,
              p.notes AS productNotes,
              p.madeIn AS productMadeIn,
              p.sellQuantity AS sellQuantity,
              p.createdDate AS createdDate,
              ps.id AS productSKUID,
              ps.price AS price,
              ps.priceBefore AS priceBefore,
              m.id AS mediaID,
              m.linkString AS linkString,
              m.title AS title,
              m.description AS description
              FROM Product as p
              JOIN ProductSku as ps ON p.id = ps.idProduct
              JOIN Media as m ON p.id = m.id_product
              ORDER BY ps.price ASC
            `;
        break;
      default:
        break;
    }
    const result = await database.request().query(queryProduct);

    const resultMap = {};
    result.recordset.forEach((item) => {
      const { productID, productSKUID, mediaID } = item;
      if (!resultMap[productID]) {
        resultMap[productID] = {
          productID: productID,
          productName: item.productName,
          productDescription: item.productDescription,
          productSlogan: item.productSlogan,
          productNotes: item.productNotes,
          productMadeIn: item.productMadeIn,
          sellQuantity: item.sellQuantity,
          createdDate: item.createdDate,
          medias: [
            {
              mediaID: mediaID,
              linkString: item.linkString,
              title: item.title ? item.title : "",
              description: item.description ? item.description : "",
            },
          ],
          productSKU: [
            {
              productSKUID: productSKUID,
              price: item.price,
              priceBefore: item.priceBefore,
            },
          ],
        };
      }
    });

    const resultArray = Object.values(resultMap);
    return resultArray;
  } catch (error) {
    throw error;
  }
}

router.get("/get-list-best-seller", async (request, response) => {
  try {
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;
    var search = request.query.search ? request.query.search.toLowerCase() : "";
    var sortBy = parseInt(request.query.sortBy);

    const resultArray = await getListProduct("best-seller");

    const filteredResult = resultArray.filter((item) => {
      const productNameMatch = item.productName
        ? item.productName.toLowerCase().includes(search)
        : false;
      const productDescriptionMatch = item.productDescription
        ? item.productDescription.toLowerCase().includes(search)
        : false;
      const productSloganMatch = item.productSlogan
        ? item.productSlogan.toLowerCase().includes(search)
        : false;
      const productNotesMatch = item.productNotes
        ? item.productNotes.toLowerCase().includes(search)
        : false;
      const productMadeInMatch = item.productMadeIn
        ? item.productMadeIn.toLowerCase().includes(search)
        : false;
      return (
        productNameMatch ||
        productDescriptionMatch ||
        productSloganMatch ||
        productNotesMatch ||
        productMadeInMatch
      );
    });
    //sortBy: 0: Giá tăng dần, 1: Giá giảm dần, 2: mới nhất, 3: cũ nhất, 4: phổ biến nhất, 5: bán chạy nhất
    switch (sortBy) {
      case 0:
        filteredResult.sort((a, b) => {
          return a.productSKU[0].price - b.productSKU[0].price;
        });
        break;
      case 1:
        filteredResult.sort((a, b) => {
          return b.productSKU[0].price - a.productSKU[0].price;
        });
        break;
      case 2:
        filteredResult.sort((a, b) => {
          return new Date(b.createdDate) - new Date(a.createdDate);
        });
        break;
      case 3:
        filteredResult.sort((a, b) => {
          return new Date(a.createdDate) - new Date(b.createdDate);
        });
        break;

      case 4:
        filteredResult.sort((a, b) => {
          return (
            b.sellQuantity / b.productSKU[0].price -
            a.sellQuantity / a.productSKU[0].price
          );
        });
        break;
      case 5:
        filteredResult.sort((a, b) => {
          return b.sellQuantity - a.sellQuantity;
        });
        break;
      default:
        break;
    }
    // Phân trang
    const paginatedResult = filteredResult.slice(offset, offset + limit);

    response
      .status(200)
      .json({ result: paginatedResult, total: filteredResult.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ errorCode: "Internal Server Error" });
  }
});

router.get("/get-list-new", async (request, response) => {
  try {
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;
    var search = request.query.search ? request.query.search.toLowerCase() : "";
    var sortBy = parseInt(request.query.sortBy);

    const resultArray = await getListProduct("new");

    const filteredResult = resultArray.filter((item) => {
      const productNameMatch = item.productName
        ? item.productName.toLowerCase().includes(search)
        : false;
      const productDescriptionMatch = item.productDescription
        ? item.productDescription.toLowerCase().includes(search)
        : false;
      const productSloganMatch = item.productSlogan
        ? item.productSlogan.toLowerCase().includes(search)
        : false;
      const productNotesMatch = item.productNotes
        ? item.productNotes.toLowerCase().includes(search)
        : false;
      const productMadeInMatch = item.productMadeIn
        ? item.productMadeIn.toLowerCase().includes(search)
        : false;
      return (
        productNameMatch ||
        productDescriptionMatch ||
        productSloganMatch ||
        productNotesMatch ||
        productMadeInMatch
      );
    });
    //sortBy: 0: Giá tăng dần, 1: Giá giảm dần, 2: mới nhất, 3: cũ nhất, 4: phổ biến nhất, 5: bán chạy nhất
    switch (sortBy) {
      case 0:
        filteredResult.sort((a, b) => {
          return a.productSKU[0].price - b.productSKU[0].price;
        });
        break;
      case 1:
        filteredResult.sort((a, b) => {
          return b.productSKU[0].price - a.productSKU[0].price;
        });
        break;
      case 2:
        filteredResult.sort((a, b) => {
          return new Date(b.createdDate) - new Date(a.createdDate);
        });
        break;
      case 3:
        filteredResult.sort((a, b) => {
          return new Date(a.createdDate) - new Date(b.createdDate);
        });
        break;

      case 4:
        filteredResult.sort((a, b) => {
          return (
            b.sellQuantity / b.productSKU[0].price -
            a.sellQuantity / a.productSKU[0].price
          );
        });
        break;
      case 5:
        filteredResult.sort((a, b) => {
          return b.sellQuantity - a.sellQuantity;
        });
        break;
      default:
        break;
    }
    // Phân trang
    const paginatedResult = filteredResult.slice(offset, offset + limit);

    response
      .status(200)
      .json({ result: paginatedResult, total: filteredResult.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ errorCode: "Internal Server Error" });
  }
});

router.get("/get-list-hot", get, async (request, response) => {
  try {
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;
    var search = request.query.search ? request.query.search.toLowerCase() : "";
    var sortBy = parseInt(request.query.sortBy);
    const resultArray = await getListProduct("hot");

    const filteredResult = resultArray.filter((item) => {
      const productNameMatch = item.productName
        ? item.productName.toLowerCase().includes(search)
        : false;
      const productDescriptionMatch = item.productDescription
        ? item.productDescription.toLowerCase().includes(search)
        : false;
      const productSloganMatch = item.productSlogan
        ? item.productSlogan.toLowerCase().includes(search)
        : false;
      const productNotesMatch = item.productNotes
        ? item.productNotes.toLowerCase().includes(search)
        : false;
      const productMadeInMatch = item.productMadeIn
        ? item.productMadeIn.toLowerCase().includes(search)
        : false;
      return (
        productNameMatch ||
        productDescriptionMatch ||
        productSloganMatch ||
        productNotesMatch ||
        productMadeInMatch
      );
    });

    //sortBy: 0: Giá tăng dần, 1: Giá giảm dần, 2: mới nhất, 3: cũ nhất, 4: phổ biến nhất, 5: bán chạy nhất
    switch (sortBy) {
      case 0:
        filteredResult.sort((a, b) => {
          return a.productSKU[0].price - b.productSKU[0].price;
        });
        break;
      case 1:
        filteredResult.sort((a, b) => {
          return b.productSKU[0].price - a.productSKU[0].price;
        });
        break;
      case 2:
        filteredResult.sort((a, b) => {
          return new Date(b.createdDate) - new Date(a.createdDate);
        });
        break;
      case 3:
        filteredResult.sort((a, b) => {
          return new Date(a.createdDate) - new Date(b.createdDate);
        });
        break;

      case 4:
        filteredResult.sort((a, b) => {
          return (
            b.sellQuantity / b.productSKU[0].price -
            a.sellQuantity / a.productSKU[0].price
          );
        });
        break;
      case 5:
        filteredResult.sort((a, b) => {
          return b.sellQuantity - a.sellQuantity;
        });
        break;
      default:
        break;
    }
    // Phân trang
    const paginatedResult = filteredResult.slice(offset, offset + limit);

    response
      .status(200)
      .json({ result: paginatedResult, total: filteredResult.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ errorCode: "Internal Server Error" });
  }
});

router.get("/get-list-good-price-today", get, async (request, response) => {
  try {
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;
    var search = request.query.search ? request.query.search.toLowerCase() : "";
    var sortBy = parseInt(request.query.sortBy);

    const resultArray = await getListProduct("good-price-today");

    const filteredResult = resultArray.filter((item) => {
      const productNameMatch = item.productName
        ? item.productName.toLowerCase().includes(search)
        : false;
      const productDescriptionMatch = item.productDescription
        ? item.productDescription.toLowerCase().includes(search)
        : false;
      const productSloganMatch = item.productSlogan
        ? item.productSlogan.toLowerCase().includes(search)
        : false;
      const productNotesMatch = item.productNotes
        ? item.productNotes.toLowerCase().includes(search)
        : false;
      const productMadeInMatch = item.productMadeIn
        ? item.productMadeIn.toLowerCase().includes(search)
        : false;
      return (
        productNameMatch ||
        productDescriptionMatch ||
        productSloganMatch ||
        productNotesMatch ||
        productMadeInMatch
      );
    });
    //sortBy: 0: Giá tăng dần, 1: Giá giảm dần, 2: mới nhất, 3: cũ nhất, 4: phổ biến nhất, 5: bán chạy nhất
    switch (sortBy) {
      case 0:
        filteredResult.sort((a, b) => {
          return a.productSKU[0].price - b.productSKU[0].price;
        });
        break;
      case 1:
        filteredResult.sort((a, b) => {
          return b.productSKU[0].price - a.productSKU[0].price;
        });
        break;
      case 2:
        filteredResult.sort((a, b) => {
          return new Date(b.createdDate) - new Date(a.createdDate);
        });
        break;
      case 3:
        filteredResult.sort((a, b) => {
          return new Date(a.createdDate) - new Date(b.createdDate);
        });
        break;

      case 4:
        filteredResult.sort((a, b) => {
          return (
            b.sellQuantity / b.productSKU[0].price -
            a.sellQuantity / a.productSKU[0].price
          );
        });
        break;
      case 5:
        filteredResult.sort((a, b) => {
          return b.sellQuantity - a.sellQuantity;
        });
        break;
      default:
        break;
    }
    // Phân trang
    const paginatedResult = filteredResult.slice(offset, offset + limit);

    response
      .status(200)
      .json({ result: paginatedResult, total: filteredResult.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ errorCode: "Internal Server Error" });
  }
});

async function getListProductSameCategory(idProduct, idCategory) {
  try {
    const queryProduct = `
      SELECT 
      p.id AS productID,
      p.name AS productName,
      p.description AS productDescription,
      p.slogan AS productSlogan,
      p.notes AS productNotes,
      p.madeIn AS productMadeIn,
      ps.id AS productSKUID,
      ps.price AS price,
      ps.priceBefore AS priceBefore,
      m.id AS mediaID,
      m.linkString AS linkString,
      m.title AS title,
      m.description AS description
      FROM Product as p
      JOIN ProductSku as ps ON p.id = ps.idProduct
      JOIN Media as m ON p.id = m.id_product
      WHERE p.id_Category = @idCategory
      ORDER BY p.sellQuantity DESC
    `;

    const result = await database
      .request()
      .input("idCategory", idCategory)
      .query(queryProduct);

    const resultMap = {};
    result.recordset.forEach((item) => {
      const { productID, productSKUID, mediaID } = item;
      if (!resultMap[productID]) {
        resultMap[productID] = {
          productID: productID,
          productName: item.productName,
          productDescription: item.productDescription,
          productSlogan: item.productSlogan,
          productNotes: item.productNotes,
          productMadeIn: item.productMadeIn,
          medias: [
            {
              mediaID: mediaID,
              linkString: item.linkString,
              title: item.title ? item.title : "",
              description: item.description ? item.description : "",
            },
          ],
          productSKU: [
            {
              productSKUID: productSKUID,
              price: item.price,
              priceBefore: item.priceBefore,
            },
          ],
        };
      }
    });

    const resultArray = Object.values(resultMap);
    return resultArray;
  } catch (error) {
    throw error;
  }
}
router.get("/get-list-same-category", async (request, response) => {
  try {
    var productID = request.query.productID;
    var productCategoryID = request.query.productCategoryID;
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;
    var search = request.query.search ? request.query.search.toLowerCase() : "";

    const resultArray = await getListProductSameCategory(
      productID,
      productCategoryID
    );

    const filteredResult = resultArray.filter((item) => {
      const productNameMatch = item.productName
        ? item.productName.toLowerCase().includes(search)
        : false;
      const productDescriptionMatch = item.productDescription
        ? item.productDescription.toLowerCase().includes(search)
        : false;
      const productSloganMatch = item.productSlogan
        ? item.productSlogan.toLowerCase().includes(search)
        : false;
      const productNotesMatch = item.productNotes
        ? item.productNotes.toLowerCase().includes(search)
        : false;
      const productMadeInMatch = item.productMadeIn
        ? item.productMadeIn.toLowerCase().includes(search)
        : false;
      return (
        productNameMatch ||
        productDescriptionMatch ||
        productSloganMatch ||
        productNotesMatch ||
        productMadeInMatch
      );
    });

    // Phân trang
    const paginatedResult = filteredResult.slice(offset, offset + limit);

    response
      .status(200)
      .json({ result: paginatedResult, total: filteredResult.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ errorCode: "Internal Server Error" });
  }
});

router.get("/get-product-attribute", async (request, response) => {
  try {
    const productID = request.query.productID;
    const responseData = await getProductAttributes(productID);
    response.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

async function getProductAttributes(productID) {
  const query = `
    SELECT
      pa.id AS attributeID,
      pa.name AS locAttributeName,
      pa.description AS locAttributeDescription,
      pav.id AS attributeValueID,
      pav.valueName AS locAttributeValueName,
      pav.valueName AS locAttributeValueDescription
    FROM ProductAttribute pa
    LEFT JOIN ProductAttributeValue pav ON pa.id = pav.productAttributeID
    WHERE pa.id_product = @productID
    ORDER BY pa.type, pav.id;
  `;

  const result = await database
    .request()
    .input("productID", productID)
    .query(query);

  const responseData = [];

  result.recordset.forEach((row) => {
    const existingAttribute = responseData.find(
      (attr) => attr.attributeID === row.attributeID
    );

    if (existingAttribute) {
      existingAttribute.attributeValue.push({
        attributeValueID: row.attributeValueID,
        locAttributeValueName: row.locAttributeValueName,
        locAttributeValueDescription: row.locAttributeValueDescription,
      });
    } else {
      responseData.push({
        attributeID: row.attributeID,
        locAttributeName: row.locAttributeName,
        locAttributeDescription: row.locAttributeDescription,
        attributeValue: [
          {
            attributeValueID: row.attributeValueID,
            locAttributeValueName: row.locAttributeValueName,
            locAttributeValueDescription: row.locAttributeValueDescription,
          },
        ],
      });
    }
  });

  return responseData;
}

router.get("/get-product-sku-by-product-id", async (request, response) => {
  try {
    const productID = request.query.productID;
    const skuss = await processSkus(productID);
    response.status(200).json({
      productID: productID,
      productSKU: skuss,
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

async function processSkus(productID) {
  try {
    const query = `
      SELECT 
      ps.id AS productSKUID,
      ps.quantity AS quantity,
      ps.price AS price,
      ps.priceBefore AS priceBefore,
      pav.id AS idAttributeValue1,
      pav.valueName AS locAttributeValueName1,
      pav2.id AS idAttributeValue2,
      pav2.valueName AS locAttributeValueName2,
      pa.name AS locAttributeName,
      pa.id AS attributeID,
      pa2.name AS locAttributeName2,
      pa2.id AS attributeID2,
      Media.id AS mediaID,
      Media.linkString AS linkString,
      Media.productAttributeValueID
      FROM ProductSku AS ps
      LEFT JOIN ProductAttributeValue AS pav ON ps.idAttributeValue1 = pav.id
      LEFT JOIN ProductAttributeValue AS pav2 ON ps.idAttributeValue2 = pav2.id
      LEFT JOIN ProductAttribute AS pa ON pav.productAttributeID = pa.id
      LEFT JOIN ProductAttribute AS pa2 ON pav2.productAttributeID = pa2.id
      JOIN Product ON ps.idProduct = Product.id
      LEFT JOIN Media ON Product.id = Media.id_product
      WHERE idProduct = @productID;
      `;
    const result = await database
      .request()
      .input("productID", productID)
      .query(query);
    const resultMap = {};
    const linkStringMap = {};
    result.recordset.forEach((item) => {
      const {
        productSKUID,
        mediaID,
        idAttributeValue1,
        idAttributeValue2,
        attributeID,
        attributeID2,
        ...rest
      } = item;
      if (!resultMap[productSKUID]) {
        resultMap[productSKUID] = {
          productSKUID: productSKUID,
          linkString: "",
          price: item.price,
          priceBefore: item.priceBefore,
          attribute: [],
        };
      }
      const linkStringExist =
        linkStringMap[mediaID] &&
        linkStringMap[mediaID].linkString === item.linkString;
      if (!linkStringExist) {
        if (mediaID) {
          linkStringMap[item.productAttributeValueID] = {
            mediaID: mediaID,
            linkString: item.linkString,
            productAttributeValueID: item.productAttributeValueID,
          };
        }
      }

      const attribute1Exit = resultMap[productSKUID].attribute.some(
        (attribute) => attribute.attributeValueID === idAttributeValue1
      );

      if (!attribute1Exit) {
        if (idAttributeValue1) {
          resultMap[productSKUID].attribute.push({
            localizedAttributeValueID: idAttributeValue1,
            locAttributeValueName: item.locAttributeValueName1,
            locAttributeValueDescription: item.locAttributeValueDescription1,
            attributeValueID: idAttributeValue1,
            locAttributeName: item.locAttributeName,
            attributeID: item.attributeID,
          });
        }
      }
      const attribute2Exit = resultMap[productSKUID].attribute.some(
        (attribute) =>
          attribute.attributeValueID === idAttributeValue2 &&
          attribute.attributeID === item.attributeID2
      );
      if (!attribute2Exit) {
        if (idAttributeValue2) {
          resultMap[productSKUID].attribute.push({
            localizedAttributeValueID: idAttributeValue2,
            locAttributeValueName: item.locAttributeValueName2,
            locAttributeValueDescription: item.locAttributeValueDescription2,
            attributeValueID: idAttributeValue2,
            locAttributeName: item.locAttributeName2,
            attributeID: item.attributeID2,
          });
        }
      }
    });
    for (const productSKUID in resultMap) {
      const attributes = resultMap[productSKUID].attribute;
      for (const attribute of attributes) {
        const { localizedAttributeValueID } = attribute; // Thêm dòng này để đảm bảo localizedAttributeValueID được định nghĩa.
        const linkStringMapItem = linkStringMap[localizedAttributeValueID];
        if (
          linkStringMapItem &&
          localizedAttributeValueID == linkStringMapItem.productAttributeValueID
        ) {
          resultMap[productSKUID].linkString = linkStringMapItem.linkString;
          break;
        }
      }
    }

    const resultArray = Object.values(resultMap);
    return resultArray;
  } catch (error) {
    console.log(error);
    throw "Error in processSkus";
  }
}

module.exports = router;
