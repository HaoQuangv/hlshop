const express = require("express");
const multer = require("multer");

const router = express.Router();
const database = require("../../config");

const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_admin");
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
  checkRole,
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
  checkRole,
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
  checkRole,
  async (request, response) => {
    try {
      const name = request.body.name;
      const slogan = request.body.slogan;
      const decription = request.body.decription;
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
        "INSERT INTO Product(name, slogan, decription, notes, madeIn, uses, priceDisplay, sellQuantity, id_Category, id_User) OUTPUT inserted.id  VALUES (@name, @slogan, @decription, @notes, @madeIn, @uses, @priceDisplay, @sellQuantity, @idCategory, @idUser)";
      const productResult = await database
        .request()
        .input("name", name)
        .input("slogan", slogan)
        .input("decription", decription)
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
/*Bat dau chinh sua*/
const medias = async (idProduct) => {
  const queryMedia =
    "SELECT id AS mediaID, linkString AS linkString, title AS title, description AS description FROM Media WHERE id_product = @idProduct";
  const resultMedia = await database
    .request()
    .input("idProduct", idProduct)
    .query(queryMedia);

  return resultMedia.recordset;
};

const skus = async (idProduct) => {
  const queryProductSku =
    "SELECT id AS productSKUID, price AS price, priceBefore AS priceBefore, idAttributeValue1, idAttributeValue2 from ProductSku WHERE idProduct =  @idProduct";
  const resultProductSku = await database
    .request()
    .input("idProduct", idProduct)
    .query(queryProductSku);

  return resultProductSku.recordset;
};

router.get("/get-detail", async (request, response) => {
  try {
    const idProduct = request.query.ProductID;

    const media = await medias(idProduct);
    const sku = await skus(idProduct);
    // console.log(media);
    //console.log(sku);
    var skuss = [];
    const queryProduct = "SELECT * FROM Product WHERE id = @idProduct";
    const resultProduct = await database
      .request()
      .input("idProduct", idProduct)
      .query(queryProduct);

    //console.log(resultProduct.recordset[0].id_Category);

    const queryCategory = "SELECT * FROM Category WHERE id = @idCategory";
    const resultCategory = await database
      .request()
      .input("idCategory", resultProduct.recordset[0].id_Category)
      .query(queryCategory);

    const queryUser = "SELECT * FROM [User] WHERE id = @idUser";
    const resultUser = await database
      .request()
      .input("idUser", resultProduct.recordset[0].id_User)
      .query(queryUser);

    for (var x = 0; x < sku.length; x++) {
      var image = "";
      if (sku[x].idAttributeValue1 === null) {
        var queryImage =
          "SELECT linkString FROM Media WHERE id_product = @idProduct AND isDefault = 1";
        var imageResult = await database
          .request()
          .input("idProduct", idProduct)
          .query(queryImage);

        image = imageResult.recordset[0].linkString;
      } else {
        const queryMedia =
          "SELECT linkString FROM Media WHERE productAttributeValueID = @productAttributeValueID";
        const resultMedia = await database
          .request()
          .input("productAttributeValueID", sku[x].idAttributeValue1)
          .query(queryMedia);
        image = resultMedia.recordset[0].linkString;
      }
      var sku1 = {};
      sku1["productSKUID"] = sku[x].productSKUID;
      sku1["linkString"] = image;
      sku1["price"] = sku[x].price;
      sku1["priceBefore"] = sku[x].priceBefore;
      // sku['productVersionID'] = "1";
      skuss.push(sku1);
    }

    var contactFullName = resultUser.recordset[0].contactFullName;

    const responseData = {
      productID: resultProduct.recordset[0].id,
      sellerID: resultProduct.recordset[0].id_User,
      productName: resultProduct.recordset[0].name,
      productDescription: resultProduct.recordset[0].decription,
      productNotes: resultProduct.recordset[0].notes,
      productSlogan: resultProduct.recordset[0].slogan,
      productMadeIn: resultProduct.recordset[0].madeIn,
      productUses: resultProduct.recordset[0].uses,
      medias: media,
      productCategory: {
        productCategoryID: resultCategory.recordset[0].id,
        productCategoryName: resultCategory.recordset[0].name,
        linkString: resultCategory.recordset[0].image,
      },
      seller: {
        sellerID: resultUser.recordset[0].id,
        businessName: "HLSHOP",
        contactFullName: contactFullName,
        userType: 0,
        linkString: resultUser.recordset[0].userAvatar,
      },
      productSKU: skuss,
    };
    // var key = request.route.path;
    // set(key, responseData);

    response.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-product-sku-detail", async (request, response) => {
  try {
    const idProduct = request.body.productID;
    const attributes = request.body.attributes;

    var atttributeValueID1 = "";
    var atttributeValueID2 = "";
    const query = "SELECT type FROM ProductAttribute WHERE id = @id";
    for (var i = 0; i < attributes.length; i++) {
      var result = await database
        .request()
        .input("id", attributes[i].attributeID)
        .query(query);

      if (result.recordset[0].type === 1) {
        atttributeValueID1 = attributes[i].attributeValueID;
      } else {
        atttributeValueID2 = attributes[i].attributeValueID;
      }
    }
    if (attributes.length === 0) {
      var sku = await skus(idProduct);
      let newSku = sku.map((item) => {
        return {
          productSKUID: item.productSKUID,
          price: item.price,
          priceBefore: item.priceBefore,
        };
      });

      response.status(200).json(newSku);
    } else if (attributes.length === 1) {
      const queryProductSku =
        "SELECT id AS productSKUID, price AS price, priceBefore AS priceBefore from ProductSku WHERE idProduct =  @idProduct AND idAttributeValue1 = @idAttributeValue1";
      const resultProductSku = await database
        .request()
        .input("idProduct", idProduct)
        .input("idAttributeValue1", atttributeValueID1)
        .query(queryProductSku);

      if (resultProductSku.recordset.length === 1) {
        response.status(200).json(resultProductSku.recordset[0]);
      } else {
        response.status(200).json({
          price: 0,
          priceBefore: 0,
          productSKUID: "",
        });
      }
    } else {
      const queryProductSku =
        "SELECT id AS productSKUID, price AS price, priceBefore AS priceBefore from ProductSku WHERE idProduct = @idProduct AND idAttributeValue1 = @idAttributeValue1 AND idAttributeValue2 = @idAttributeValue2";
      const resultProductSku = await database
        .request()
        .input("idProduct", idProduct)
        .input("idAttributeValue1", atttributeValueID1)
        .input("idAttributeValue2", atttributeValueID2)
        .query(queryProductSku);

      response.status(200).json(resultProductSku.recordset[0]);
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-list-best-seller", async (request, response) => {
  try {
    var offset = request.query.offset;
    var limit = request.query.limit;

    if (offset == null || offset < 1) {
      offset = 1;
    }

    if (limit == null) {
      limit = 10;
    }

    offset = (offset - 1) * limit;
    const queryProduct =
      "SELECT * FROM (SELECT TOP 10 * FROM Product ORDER BY sellQuantity DESC) AS subproduct ORDER BY name OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY";
    const resultProduct = await database
      .request()
      .input("offset", parseInt(offset))
      .input("limit", parseInt(limit))
      .query(queryProduct);

    var products = [];

    for (var i = 0; i < resultProduct.recordset.length; i++) {
      var media = await medias(resultProduct.recordset[i].id);
      var sku = await skus(resultProduct.recordset[i].id);
      if (Array.isArray(sku)) {
        var newSku = sku.map((item) => {
          return {
            productSKUID: item.productSKUID,
            price: item.price,
            priceBefore: item.priceBefore,
          };
        });
      }

      var product = {
        productID: resultProduct.recordset[i].id,
        productName: resultProduct.recordset[i].name,
        productDescription: resultProduct.recordset[i].decription,
        medias: media,
        productSKU: newSku,
      };
      products.push(product);
    }

    var responseData = {
      result: products,
      total: 10, // Set mặc định vì chưa biết total này là gì
    };
    // var key = request.route.path;
    // set(key, responseData);

    response.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-list-new", async (request, response) => {
  try {
    var offset = request.query.offset;
    var limit = request.query.limit;

    if (offset == null || offset < 1) {
      offset = 1;
    }

    if (limit == null) {
      limit = 10;
    }

    offset = (offset - 1) * limit;

    const queryProduct =
      "SELECT * FROM (SELECT TOP 10 * FROM Product ORDER BY createdDate DESC) AS subproduct ORDER BY name OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY";
    const resultProduct = await database
      .request()
      .input("offset", parseInt(offset))
      .input("limit", parseInt(limit))
      .query(queryProduct);
    var products = [];

    for (var i = 0; i < resultProduct.recordset.length; i++) {
      var media = await medias(resultProduct.recordset[i].id);
      var sku = await skus(resultProduct.recordset[i].id);
      if (Array.isArray(sku)) {
        var newSku = sku.map((item) => {
          return {
            productSKUID: item.productSKUID,
            price: item.price,
            priceBefore: item.priceBefore,
          };
        });
      }

      var product = {
        productID: resultProduct.recordset[i].id,
        productName: resultProduct.recordset[i].name,
        productDescription: resultProduct.recordset[i].decription,
        medias: media,
        productSKU: newSku,
      };

      products.push(product);
    }

    var responseData = {
      result: products,
      total: 10, // Set mặc định vì chưa biết total này là gì
    };
    // var key = request.route.path;
    // set(key, responseData);
    response.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-list-hot", get, async (request, response) => {
  try {
    var offset = request.query.offset;
    var limit = request.query.limit;

    if (offset == null || offset < 1) {
      offset = 1;
    }

    if (limit == null) {
      limit = 10;
    }

    offset = (offset - 1) * limit;

    const queryProduct =
      "SELECT * FROM (SELECT TOP 10 * FROM Product ORDER BY createdDate DESC) AS subproduct ORDER BY name OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY";
    const resultProduct = await database
      .request()
      .input("offset", parseInt(offset))
      .input("limit", parseInt(limit))
      .query(queryProduct);
    var products = [];

    for (var i = 0; i < resultProduct.recordset.length; i++) {
      var media = await medias(resultProduct.recordset[i].id);
      var sku = await skus(resultProduct.recordset[i].id);
      if (Array.isArray(sku)) {
        var newSku = sku.map((item) => {
          return {
            productSKUID: item.productSKUID,
            price: item.price,
            priceBefore: item.priceBefore,
          };
        });
      }

      var product = {
        productID: resultProduct.recordset[i].id,
        productName: resultProduct.recordset[i].name,
        productDescription: resultProduct.recordset[i].decription,
        medias: media,
        productSKU: newSku,
      };

      products.push(product);
    }

    var responseData = {
      result: products,
      total: 10, // Set mặc định vì chưa biết total này là gì
    };
    // var key = request.route.path;
    // set(key, responseData);
    response.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-list-good-price-today", get, async (request, response) => {
  try {
    var offset = request.query.offset;
    var limit = request.query.limit;

    if (offset == null || offset < 1) {
      offset = 1;
    }

    if (limit == null) {
      limit = 10;
    }

    offset = (offset - 1) * limit;

    const queryProduct =
      "SELECT * FROM (SELECT TOP 10 * FROM Product ORDER BY createdDate DESC) AS subproduct ORDER BY name OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY";
    const resultProduct = await database
      .request()
      .input("offset", parseInt(offset))
      .input("limit", parseInt(limit))
      .query(queryProduct);
    var products = [];

    for (var i = 0; i < resultProduct.recordset.length; i++) {
      var media = await medias(resultProduct.recordset[i].id);
      var sku = await skus(resultProduct.recordset[i].id);
      if (Array.isArray(sku)) {
        var newSku = sku.map((item) => {
          return {
            productSKUID: item.productSKUID,
            price: item.price,
            priceBefore: item.priceBefore,
          };
        });
      }

      var product = {
        productID: resultProduct.recordset[i].id,
        productName: resultProduct.recordset[i].name,
        productDescription: resultProduct.recordset[i].decription,
        medias: media,
        productSKU: newSku,
      };

      products.push(product);
    }

    var responseData = {
      result: products,
      total: 10, // Set mặc định vì chưa biết total này là gì
    };
    // var key = request.route.path;
    // set(key, responseData);
    response.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-list-same-category", async (request, response) => {
  try {
    var offset = request.query.offset;
    var limit = request.query.limit;
    var productID = request.query.productID;
    var productCategoryID = request.query.productCategoryID;

    var offset = request.query.offset;
    var limit = request.query.limit;

    if (offset == null || offset < 1) {
      offset = 1;
    }

    if (limit == null) {
      limit = 10;
    }

    offset = (offset - 1) * limit;

    const queryProduct =
      "SELECT * FROM Product WHERE id != @productID AND id_Category = @categoryID ORDER BY name OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY";
    const resultProduct = await database
      .request()
      .input("offset", parseInt(offset))
      .input("limit", parseInt(limit))
      .input("productID", productID)
      .input("categoryID", productCategoryID)
      .query(queryProduct);
    var products = [];

    for (var i = 0; i < resultProduct.recordset.length; i++) {
      var media = await medias(resultProduct.recordset[i].id);
      var sku = await skus(resultProduct.recordset[i].id);
      if (Array.isArray(sku)) {
        var newSku = sku.map((item) => {
          return {
            productSKUID: item.productSKUID,
            price: item.price,
            priceBefore: item.priceBefore,
          };
        });
      }

      var product = {
        productID: resultProduct.recordset[i].id,
        productName: resultProduct.recordset[i].name,
        productDescription: resultProduct.recordset[i].decription,
        medias: media,
        productSKU: newSku,
      };

      products.push(product);
    }

    var responseData = {
      result: products,
      total: 10, // Set mặc định vì chưa biết total này là gì
    };
    // var key = request.route.path;
    // set(key, responseData);

    response.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-product-attribute", async (request, response) => {
  try {
    const productID = request.query.productID;
    let responseData = [];
    let arrayAttributeValue1 = [];
    let arrayAttributeValue2 = [];

    const queryAttributeValue1ID =
      "SELECT DISTINCT idAttributeValue1 FROM ProductSku WHERE idProduct = @productID";
    const resultAttributeValue1ID = await database
      .request()
      .input("productID", productID)
      .query(queryAttributeValue1ID);

    const queryAttributeValue2ID =
      "SELECT DISTINCT idAttributeValue2 FROM ProductSku WHERE idProduct = @productID";
    const resultAttributeValue2ID = await database
      .request()
      .input("productID", productID)
      .query(queryAttributeValue2ID);

    if (resultAttributeValue1ID.recordset[0].idAttributeValue1 === null) {
      response.status(200).json(responseData);
    } else if (
      resultAttributeValue1ID.recordset[0].idAttributeValue1 !== null &&
      resultAttributeValue2ID.recordset[0].idAttributeValue2 === null
    ) {
      const queryAttribute1ID =
        "SELECT productAttributeID FROM ProductAttributeValue WHERE id =@id";
      const resultAttribute1ID = await database
        .request()
        .input("id", resultAttributeValue1ID.recordset[0].idAttributeValue1)
        .query(queryAttribute1ID);

      const queryAttribute1 =
        "SELECT id AS attributeID, name AS locAttributeName, description FROM ProductAttribute WHERE id = @id";
      const resultAttribute1 = await database
        .request()
        .input("id", resultAttribute1ID.recordset[0].productAttributeID)
        .query(queryAttribute1);
      const queryAttributeValue =
        "SELECT id AS attributeValueID, valueName AS locAttributeValueName FROM ProductAttributeValue WHERE id = @id";

      for (var i = 0; i < resultAttributeValue1ID.recordset.length; i++) {
        var resultAttributeValue1 = await database
          .request()
          .input("id", resultAttributeValue1ID.recordset[i].idAttributeValue1)
          .query(queryAttributeValue);
        arrayAttributeValue1.push({
          attributeValueID: resultAttributeValue1.recordset[0].attributeValueID,
          locAttributeValueName:
            resultAttributeValue1.recordset[0].locAttributeValueName,
          locAttributeValueDescription:
            resultAttributeValue1.recordset[0].locAttributeValueName,
        });
      }

      responseData.push({
        attributeID: resultAttribute1.recordset[0].attributeID,
        locAttributeName: resultAttribute1.recordset[0].locAttributeName,
        locAttributeDescription: resultAttribute1.recordset[0].locAttributeName,
        attributeValue: arrayAttributeValue1,
      });

      response.status(201).json(responseData);
    } else {
      const queryAttribute1ID =
        "SELECT productAttributeID FROM ProductAttributeValue WHERE id =@id";
      const resultAttribute1ID = await database
        .request()
        .input("id", resultAttributeValue1ID.recordset[0].idAttributeValue1)
        .query(queryAttribute1ID);

      const queryAttribute2ID =
        "SELECT productAttributeID FROM ProductAttributeValue WHERE id =@id";
      const resultAttribute2ID = await database
        .request()
        .input("id", resultAttributeValue2ID.recordset[0].idAttributeValue2)
        .query(queryAttribute2ID);

      const queryAttribute1 =
        "SELECT id AS attributeID, name AS locAttributeName, description FROM ProductAttribute WHERE id = @id";
      const resultAttribute1 = await database
        .request()
        .input("id", resultAttribute1ID.recordset[0].productAttributeID)
        .query(queryAttribute1);

      const queryAttribute2 =
        "SELECT id AS attributeID, name AS locAttributeName, description FROM ProductAttribute WHERE id = @id";
      const resultAttribute2 = await database
        .request()
        .input("id", resultAttribute2ID.recordset[0].productAttributeID)
        .query(queryAttribute2);

      const queryAttributeValue =
        "SELECT id AS attributeValueID, valueName AS locAttributeValueName FROM ProductAttributeValue WHERE id = @id";

      for (var i = 0; i < resultAttributeValue1ID.recordset.length; i++) {
        var resultAttributeValue1 = await database
          .request()
          .input("id", resultAttributeValue1ID.recordset[i].idAttributeValue1)
          .query(queryAttributeValue);
        arrayAttributeValue1.push({
          attributeValueID: resultAttributeValue1.recordset[0].attributeValueID,
          locAttributeValueName:
            resultAttributeValue1.recordset[0].locAttributeValueName,
          locAttributeValueDescription:
            resultAttributeValue1.recordset[0].locAttributeValueName,
        });
      }

      responseData.push({
        attributeID: resultAttribute1.recordset[0].attributeID,
        locAttributeName: resultAttribute1.recordset[0].locAttributeName,
        locAttributeDescription: resultAttribute1.recordset[0].locAttributeName,
        attributeValue: arrayAttributeValue1,
      });

      for (var i = 0; i < resultAttributeValue2ID.recordset.length; i++) {
        var resultAttributeValue2 = await database
          .request()
          .input("id", resultAttributeValue2ID.recordset[i].idAttributeValue2)
          .query(queryAttributeValue);

        arrayAttributeValue2.push({
          attributeValueID: resultAttributeValue2.recordset[0].attributeValueID,
          locAttributeValueName:
            resultAttributeValue2.recordset[0].locAttributeValueName,
          locAttributeValueDescription:
            resultAttributeValue2.recordset[0].locAttributeValueName,
        });
      }
      responseData.push({
        attributeID: resultAttribute2.recordset[0].attributeID,
        locAttributeName: resultAttribute2.recordset[0].locAttributeName,
        locAttributeDescription:
          resultAttribute2.recordset[0].locAttributeDescription,
        attributeValue: arrayAttributeValue2,
      });

      response.status(200).json(responseData);
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

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
  const skuss = [];
  const sku = await skus(productID);

  for (const s of sku) {
    const image = await getImage(productID, s);
    const attributes = await getAttributes(productID, s);

    const newSku = {
      productSKUID: s.productSKUID,
      linkString: image,
      price: s.price,
      priceBefore: s.priceBefore,
      attribute: attributes,
    };

    skuss.push(newSku);
  }

  return skuss;
}

async function getImage(productID, sku) {
  if (sku.idAttributeValue1 === null) {
    const queryImage =
      "SELECT linkString FROM Media WHERE id_product = @idProduct AND isDefault = 1";
    const imageResult = await database
      .request()
      .input("idProduct", productID)
      .query(queryImage);
    return imageResult.recordset[0].linkString;
  } else {
    const queryImage =
      "SELECT linkString FROM Media WHERE productAttributeValueID = @productAttributeValueID";
    const imageResult = await database
      .request()
      .input("productAttributeValueID", sku.idAttributeValue1)
      .query(queryImage);
    return imageResult.recordset[0].linkString;
  }
}

async function getAttributes(productID, sku) {
  const attributes = [];

  if (sku.idAttributeValue1 !== null) {
    const attribute1 = await processAttribute(
      productID,
      sku.idAttributeValue1,
      sku
    );
    attributes.push(attribute1);

    if (sku.idAttributeValue2 !== null) {
      const attribute2 = await processAttribute(
        productID,
        sku.idAttributeValue2,
        sku
      );
      attributes.push(attribute2);
    }
  }

  return attributes;
}

async function processAttribute(productID, attributeValueID, sku) {
  const queryAttributeValue =
    "SELECT * FROM ProductAttributeValue WHERE id = @id";
  const resultAttributeValue = await database
    .request()
    .input("id", attributeValueID)
    .query(queryAttributeValue);

  const queryattributes = "SELECT * FROM ProductAttribute WHERE id = @id ";
  const attributesResult = await database
    .request()
    .input("id", resultAttributeValue.recordset[0].productAttributeID)
    .query(queryattributes);

  var attribute = {
    productSKUConditionID: sku.productSKUID,
    productSKUID: sku.productSKUID,
    attributeID: attributesResult.recordset[0].id,
    locAttributeName: attributesResult.recordset[0].name,
    locAttributeDescription: attributesResult.recordset[0].decription,
    attributeValueID: resultAttributeValue.recordset[0].id,
    locAttributeValueName: resultAttributeValue.recordset[0].valueName,
    locAttributeValueDescription: resultAttributeValue.recordset[0].valueName,
  };
  return attribute;
}

module.exports = router;
