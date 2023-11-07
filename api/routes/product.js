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
  let key = request.route.path + JSON.stringify(request.query) + Date.now();
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

// router.post(
//   "/create-media-product",
//   upload.array("file", 9),
//   checkAuth,
//   checkRole,
//   async (request, response) => {
//     try {
//       const idProduct = request.body.idProduct;
//       var urls = [];

//       if (!request.files) {
//         response.status(400).json({
//           Message: "Khong tim thay file",
//         });
//       } else {
//         console.log(27);
//         const files = request.files;

//         for (const file of files) {
//           try {
//             const blob = firebase.bucket.file(file.originalname);
//             console.log(32);
//             const blobWriter = blob.createWriteStream({
//               metadata: {
//                 contentType: file.mimetype,
//               },
//             });

//             await new Promise((resolve, reject) => {
//               blobWriter.on("error", (err) => {
//                 console.log(err);
//                 reject(err);
//               });

//               blobWriter.on("finish", async () => {
//                 try {
//                   const url = await blob.getSignedUrl({
//                     action: "read",
//                     expires: "03-09-2491",
//                   });
//                   const publicUrl = url[0];
//                   urls.push(publicUrl);

//                   const createDated = new Date();
//                   const queryMedia =
//                     "INSERT INTO Media(linkString, title, description, id_product, createdDate, isDefault) VALUES (@linkString, @title, @description, @idProduct, @createdDate, 0)";
//                   await database
//                     .request()
//                     .input("linkString", publicUrl)
//                     .input("title", "")
//                     .input("description", "")
//                     .input("idProduct", idProduct)
//                     .input("createdDate", createDated)
//                     .query(queryMedia);

//                   resolve();
//                 } catch (err) {
//                   reject(err);
//                 }
//               });

//               blobWriter.end(file.buffer);
//             });
//           } catch (err) {
//             console.log(err);
//             // Xử lý lỗi nếu cần thiết
//           }
//         }

//         console.log(101);
//         const queryDefaultMedia =
//           "UPDATE Media SET isDefault = 1 OUTPUT inserted.id WHERE id_product = @idProduct AND createdDate = (SELECT MIN(createdDate) FROM Media WHERE id_product = @idProduct)";
//         const resultDefaultMedia = await database
//           .request()
//           .input("idProduct", idProduct)
//           .query(queryDefaultMedia);

//         console.log(resultDefaultMedia.recordset[0].id);
//         response.status(200).json({
//           Message: "Upload successful!",
//           urls: urls,
//         });
//       }
//     } catch (error) {
//       console.log(error);
//       response.status(500).json({
//         error: "Internal Server Error",
//       });
//     }
//   }
// );

// router.post(
//   "/create-media-attribute",
//   upload.single("file"),
//   checkAuth,
//   checkRole,
//   async (request, response) => {
//     try {
//       const idAttribute = request.body.idAttribute;
//       console.log(idAttribute);
//       if (!request.file) {
//         response.status(400).json({
//           Message: "Khong tim thay file",
//         });
//       } else {
//         const blob = firebase.bucket.file(request.file.originalname);
//         const blobWriter = blob.createWriteStream({
//           metadata: {
//             contentType: request.file.mimetype,
//           },
//         });
//         blobWriter.on("error", (err) => {
//           response.status(500).json({
//             error: err.message,
//           });
//         });

//         blobWriter.on("finish", async () => {
//           try {
//             const signedUrls = await blob.getSignedUrl({
//               action: "read",
//               expires: "03-01-2500", // Ngày hết hạn của đường dẫn
//             });
//             const publicUrl = signedUrls[0];

//             const queryAttribute =
//               "UPDATE Product_attribute1 SET image = @image WHERE id = @idAttribute";
//             const resultAttribute = await database
//               .request()
//               .input("image", publicUrl)
//               .input("idAttribute", idAttribute)
//               .query(queryAttribute);

//             response.status(201).json({
//               Message: "Upload successful!",
//             });
//           } catch (err) {
//             response.status(500).json({
//               error: err.message,
//             });
//           }
//         });

//         blobWriter.end(request.file.buffer);
//       }
//     } catch (error) {
//       console.log(error);
//       response.status(500).json({
//         error: "Internal Server Error",
//       });
//     }
//   }
// );

// router.post(
//   "/create-product",
//   checkAuth,
//   checkRole,
//   async (request, response) => {
//     try {
//       const name = request.body.name;
//       const slogan = request.body.slogan;
//       const decription = request.body.decription;
//       const notes = request.body.notes;
//       const madeIn = request.body.madeIn;
//       const uses = request.body.uses;
//       const idCategory = request.body.idCategory;
//       const attribute1 = request.body.attribute1;
//       const attribute2 = request.body.attribute2;
//       const atttributeValue1 = request.body.atttributeValue1;
//       const atttributeValue2 = request.body.atttributeValue2;
//       const quantity = request.body.quantity;
//       const price = request.body.price;

//       var arrayIdAttribureValue1 = [];
//       var arrayIdAttribureValue2 = [];
//       const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
//       const userResult = await database
//         .request()
//         .input("idAccount", request.userData.uuid)
//         .query(queryUser);

//       const queryProduct =
//         "INSERT INTO Product(name, slogan, decription, notes, madeIn, uses, priceDisplay, sellQuantity, id_Category, id_User) OUTPUT inserted.id  VALUES (@name, @slogan, @decription, @notes, @madeIn, @uses, @priceDisplay, @sellQuantity, @idCategory, @idUser)";
//       const productResult = await database
//         .request()
//         .input("name", name)
//         .input("slogan", slogan)
//         .input("decription", decription)
//         .input("notes", notes)
//         .input("madeIn", madeIn)
//         .input("uses", uses)
//         .input("priceDisplay", "")
//         .input("sellQuantity", 0)
//         .input("idCategory", idCategory)
//         .input("idUser", userResult.recordset[0].id)
//         .query(queryProduct);

//       if (attribute1 === "") {
//         const updatePriceDisplay =
//           "UPDATE Product SET priceDisplay = @price WHERE id = @idProduct";
//         const updateResult = await database
//           .request()
//           .input("price", price[0])
//           .input("idProduct", productResult.recordset[0].id)
//           .query(updatePriceDisplay);

//         const insertProductSku =
//           "INSERT INTO Product_sku(quantity, price, idProduct) VALUES (@quantity, @price, @idProduct)";
//         const resultProductSku = await database
//           .request()
//           .input("quantity", quantity[0])
//           .input("price", price[0])
//           .input("idProduct", productResult.recordset[0].id)
//           .query(insertProductSku);
//       } else if (attribute2 === "") {
//         const insertProductAttribute1 =
//           "INSERT INTO Product_attribute1 (name, description, image, id_product) OUTPUT inserted.id VALUES (@name, @description, @image, @idProduct)";
//         const insertProductSku =
//           "INSERT INTO Product_sku(quantity, price, idAttribute1, idProduct) VALUES (@quantity, @price, @idAttribute1, @idProduct)";
//         for (var x = 0; x < atttributeValue1.length; x++) {
//           const resultProductAttribute1 = await database
//             .request()
//             .input("name", attribute1)
//             .input("description", atttributeValue1[x])
//             .input("image", "")
//             .input("idProduct", productResult.recordset[0].id)
//             .query(insertProductAttribute1);

//           const resultProductSku = await database
//             .request()
//             .input("quantity", quantity[x])
//             .input("price", price[x])
//             .input("idAttribute1", resultProductAttribute1.recordset[0].id)
//             .input("idProduct", productResult.recordset[0].id)
//             .query(insertProductSku);

//           arrayIdAttribureValue1.push(resultProductAttribute1.recordset[0].id);
//         }

//         const updatePriceDisplay =
//           "UPDATE Product SET priceDisplay = @price WHERE id = @idProduct";
//         const priceDisplay =
//           Math.min(...price).toString() + " - " + Math.max(...price).toString();
//         const updateResult = await database
//           .request()
//           .input("price", priceDisplay)
//           .input("idProduct", productResult.recordset[0].id)
//           .query(updatePriceDisplay);
//       } else {
//         const insertProductAttribute1 =
//           "INSERT INTO Product_attribute1 (name, description, image, id_product) OUTPUT inserted.id VALUES (@name, @description, @image, @idProduct)";
//         const insertProductAttribute2 =
//           "INSERT INTO Product_attribute2 (name, description, id_product) OUTPUT inserted.id VALUES (@name, @description, @idProduct)";
//         const insertProductSku =
//           "INSERT INTO Product_sku(quantity, price, idAttribute1, idAttribute2, idProduct) VALUES (@quantity, @price, @idAttribute1, @idAttribute2, @idProduct)";

//         for (var i = 0; i < atttributeValue1.length; i++) {
//           const resultProductAttribute1 = await database
//             .request()
//             .input("name", attribute1)
//             .input("description", atttributeValue1[i])
//             .input("image", "")
//             .input("idProduct", productResult.recordset[0].id)
//             .query(insertProductAttribute1);

//           arrayIdAttribureValue1.push(resultProductAttribute1.recordset[0].id);
//         }

//         for (var j = 0; j < atttributeValue2.length; j++) {
//           const resultProductAttribute2 = await database
//             .request()
//             .input("name", attribute2)
//             .input("description", atttributeValue2[j])
//             .input("idProduct", productResult.recordset[0].id)
//             .query(insertProductAttribute2);

//           arrayIdAttribureValue2.push(resultProductAttribute2.recordset[0].id);
//         }

//         var x = 0;
//         for (var i = 0; i < arrayIdAttribureValue1.length; i++) {
//           for (var j = 0; j < arrayIdAttribureValue2.length; j++) {
//             const resultProductSku = await database
//               .request()
//               .input("quantity", quantity[x])
//               .input("price", price[x])
//               .input("idAttribute1", arrayIdAttribureValue1[i])
//               .input("idAttribute2", arrayIdAttribureValue2[j])
//               .input("idProduct", productResult.recordset[0].id)
//               .query(insertProductSku);

//             x++;
//           }
//         }

//         const updatePriceDisplay =
//           "UPDATE Product SET priceDisplay = @price WHERE id = @idProduct";
//         const priceDisplay =
//           Math.min(...price).toString() + " - " + Math.max(...price).toString();
//         const updateResult = await database
//           .request()
//           .input("price", priceDisplay)
//           .input("idProduct", productResult.recordset[0].id)
//           .query(updatePriceDisplay);
//       }

//       response.status(200).json({
//         idProduct: productResult.recordset[0].id,
//         arrayAttributeValue1: arrayIdAttribureValue1,
//         arrayAttributeValue2: arrayIdAttribureValue2,
//       });
//     } catch (error) {
//       console.log(error);
//       response.status(500).json({
//         error: "Internal Server Error",
//       });
//     }
//   }
// );

router.get("/get-detail", get, async (request, response) => {
  try {
    const idProduct = request.query.ProductID;
    console.log("get-detail");
    var medias = [];
    var skus = [];
    const queryProduct = "SELECT * FROM Product WHERE id = @idProduct";
    const resultProduct = await database
      .request()
      .input("idProduct", idProduct)
      .query(queryProduct);

    const queryMedia = "SELECT * FROM Media WHERE id_product = @idProduct";
    const resultMedia = await database
      .request()
      .input("idProduct", idProduct)
      .query(queryMedia);

    console.log(resultProduct.recordset[0].id_Category);

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

    const queryProductSku =
      "SELECT* from Product_sku WHERE idProduct =  @idProduct";
    const resultProductSku = await database
      .request()
      .input("idProduct", idProduct)
      .query(queryProductSku);

    for (var x = 0; x < resultMedia.recordset.length; x++) {
      var media = {};
      media["mediaID"] = resultMedia.recordset[x].id;
      media["linkString"] = resultMedia.recordset[x].linkString;
      media["title"] = resultMedia.recordset[x].title;
      media["description"] = resultMedia.recordset[x].description;
      media["objectRefType"] = 0; //Set mặc định, chưa biết nó là gì
      media["mediaType"] = 0; //Set mặc định, chưa biết nó là gì
      media["objectRefID"] = "1"; //Set mặc định, chưa biết nó là gì

      medias.push(media);
    }

    for (var x = 0; x < resultProductSku.recordset.length; x++) {
      var image = "";
      if (resultProductSku.recordset[x].idAttribute1 === null) {
        var queryImage =
          "SELECT linkString FROM Media WHERE id_product = @idProduct AND isDefault = 1";
        var imageResult = await database
          .request()
          .input("idProduct", resultProductSku.recordset[x].idProduct)
          .query(queryImage);

        image = imageResult.recordset[0].linkString;
      } else {
        var queryAttribute1 =
          "SELECT * FROM Product_attribute1 WHERE id = @idAttribute1";
        var resultAttribute1 = await database
          .request()
          .input("idAttribute1", resultProductSku.recordset[x].idAttribute1)
          .query(queryAttribute1);

        image = resultAttribute1.recordset[0].image;
      }
      var sku = {};
      sku["productSKUID"] = resultProductSku.recordset[x].id;
      sku["linkString"] = image;
      sku["price"] = resultProductSku.recordset[x].price;
      sku["priceBefore"] = resultProductSku.recordset[x].priceBefore;
      sku["productVersionID"] = "1";

      skus.push(sku);
    }

    var contactFullName =
      resultUser.recordset[0].first_name +
      " " +
      resultUser.recordset[0].last_name;

    const responseData = {
      productID: resultProduct.recordset[0].id,
      sellerID: resultProduct.recordset[0].id_User,
      productName: resultProduct.recordset[0].name,
      productDescription: resultProduct.recordset[0].decription,
      productNotes: resultProduct.recordset[0].notes,
      productSlogan: resultProduct.recordset[0].slogan,
      productMadeIn: resultProduct.recordset[0].madeIn,
      productUses: resultProduct.recordset[0].uses,
      medias: medias,
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
        linkString: resultUser.recordset[0].image,
      },
      productSKU: skus,
    };
    var key = request.route.path;
    set(key, responseData);

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
    const idProduct = request.body.idProduct;
    const attributes = request.body.attributes;

    const queryAttribute1 =
      "SELECT id FROM Product_attribute1 WHERE id_product = @idProduct AND description = @description";
    const resultAttribute1 = await database
      .request()
      .input("idProduct", idProduct)
      .input("description", attributes[0])
      .query(queryAttribute1);
    const queryAttribute2 =
      "SELECT id FROM Product_attribute2 WHERE id_product = @idProduct AND description = @description";
    const resultAttribute2 = await database
      .request()
      .input("idProduct", idProduct)
      .input("description", attributes[1])
      .query(queryAttribute2);

    const querySkuDetail =
      "SELECT * FROM Product_sku WHERE idProduct = @idProduct AND idAttribute1 = @idAttribute1 AND idAttribute2 = @idAttribute2";
    const resultSkuDetail = await database
      .request()
      .input("idProduct", idProduct)
      .input("idAttribute1", resultAttribute1.recordset[0].id)
      .input("idAttribute2", resultAttribute2.recordset[0].id)
      .query(querySkuDetail);

    response.status(200).json({
      price: resultSkuDetail.recordset[0].price,
      quantity: resultSkuDetail.recordset[0].quantity,
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-list-best-seller", get, async (request, response) => {
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
      var medias = [];
      var skus = [];

      var queryMedia = "SELECT * FROM Media WHERE id_product = @idProduct";
      var resultMedia = await database
        .request()
        .input("idProduct", resultProduct.recordset[0].id)
        .query(queryMedia);

      var queryProductSku =
        "SELECT* from Product_sku WHERE idProduct =  @idProduct";
      var resultProductSku = await database
        .request()
        .input("idProduct", resultProduct.recordset[0].id)
        .query(queryProductSku);

      for (var x = 0; x < resultMedia.recordset.length; x++) {
        var media = {};
        media["mediaID"] = resultMedia.recordset[x].id;
        media["linkString"] = resultMedia.recordset[x].linkString;
        media["title"] = resultMedia.recordset[x].title;
        media["description"] = resultMedia.recordset[x].description;
        media["objectRefType"] = 0;
        media["mediaType"] = 0;
        media["objectRefID"] = "1";

        medias.push(media);
      }

      for (var y = 0; y < resultProductSku.recordset.length; y++) {
        var sku = {};
        sku["productSKUID"] = resultProductSku.recordset[y].id;
        sku["priceBefore"] = resultProductSku.recordset[y].priceBefore;
        sku["price"] = resultProductSku.recordset[y].price;
        // sku['idAttribute1'] = resultProductSku.recordset[y].idAttribute1;
        // sku['idAttribute2'] = resultProductSku.recordset[y].idAttribute2;

        skus.push(sku);
      }

      var product = {
        productID: resultProduct.recordset[i].id,
        productName: resultProduct.recordset[i].name,
        productDescription: resultProduct.recordset[i].decription,
        medias: medias,
        productSKU: skus,
      };

      products.push(product);
    }

    var responseData = {
      result: products,
      total: 10, // Set mặc định vì chưa biết total này là gì
    };
    var key = request.route.path;
    set(key, responseData);

    response.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-list-new", get, async (request, response) => {
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
      var medias = [];
      var skus = [];

      var queryMedia = "SELECT * FROM Media WHERE id_product = @idProduct";
      var resultMedia = await database
        .request()
        .input("idProduct", resultProduct.recordset[0].id)
        .query(queryMedia);

      var queryProductSku =
        "SELECT* from Product_sku WHERE idProduct =  @idProduct";
      var resultProductSku = await database
        .request()
        .input("idProduct", resultProduct.recordset[0].id)
        .query(queryProductSku);

      for (var x = 0; x < resultMedia.recordset.length; x++) {
        var media = {};
        media["mediaID"] = resultMedia.recordset[x].id;
        media["linkString"] = resultMedia.recordset[x].linkString;
        media["title"] = resultMedia.recordset[x].title;
        media["description"] = resultMedia.recordset[x].description;
        media["objectRefType"] = 0;
        media["mediaType"] = 0;
        media["objectRefID"] = "1";

        medias.push(media);
      }

      for (var y = 0; y < resultProductSku.recordset.length; y++) {
        var sku = {};
        sku["productSKUID"] = resultProductSku.recordset[y].id;
        sku["priceBefore"] = resultProductSku.recordset[y].priceBefore;
        sku["price"] = resultProductSku.recordset[y].price;
        // sku['idAttribute1'] = resultProductSku.recordset[y].idAttribute1;
        // sku['idAttribute2'] = resultProductSku.recordset[y].idAttribute2;

        skus.push(sku);
      }

      var product = {
        productID: resultProduct.recordset[i].id,
        productName: resultProduct.recordset[i].name,
        productDescription: resultProduct.recordset[i].decription,
        medias: medias,
        productSKU: skus,
      };

      products.push(product);
    }

    var responseData = {
      result: products,
      total: 10, // Set mặc định vì chưa biết total này là gì
    };
    var key = request.route.path;
    set(key, responseData);

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
      var medias = [];
      var skus = [];

      var queryMedia = "SELECT * FROM Media WHERE id_product = @idProduct";
      var resultMedia = await database
        .request()
        .input("idProduct", resultProduct.recordset[0].id)
        .query(queryMedia);

      var queryProductSku =
        "SELECT* from Product_sku WHERE idProduct =  @idProduct";
      var resultProductSku = await database
        .request()
        .input("idProduct", resultProduct.recordset[0].id)
        .query(queryProductSku);

      for (var x = 0; x < resultMedia.recordset.length; x++) {
        var media = {};
        media["mediaID"] = resultMedia.recordset[x].id;
        media["linkString"] = resultMedia.recordset[x].linkString;
        media["title"] = resultMedia.recordset[x].title;
        media["description"] = resultMedia.recordset[x].description;
        media["objectRefType"] = 0;
        media["mediaType"] = 0;
        media["objectRefID"] = "1";

        medias.push(media);
      }

      for (var y = 0; y < resultProductSku.recordset.length; y++) {
        var sku = {};
        sku["productSKUID"] = resultProductSku.recordset[y].id;
        sku["priceBefore"] = resultProductSku.recordset[y].priceBefore;
        sku["price"] = resultProductSku.recordset[y].price;
        // sku['idAttribute1'] = resultProductSku.recordset[y].idAttribute1;
        // sku['idAttribute2'] = resultProductSku.recordset[y].idAttribute2;

        skus.push(sku);
      }

      var product = {
        productID: resultProduct.recordset[i].id,
        productName: resultProduct.recordset[i].name,
        productDescription: resultProduct.recordset[i].decription,
        medias: medias,
        productSKU: skus,
      };

      products.push(product);
    }

    var responseData = {
      result: products,
      total: 10, // Set mặc định vì chưa biết total này là gì
    };
    var key = request.route.path;
    set(key, responseData);

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
      var medias = [];
      var skus = [];

      var queryMedia = "SELECT * FROM Media WHERE id_product = @idProduct";
      var resultMedia = await database
        .request()
        .input("idProduct", resultProduct.recordset[0].id)
        .query(queryMedia);

      var queryProductSku =
        "SELECT* from Product_sku WHERE idProduct =  @idProduct";
      var resultProductSku = await database
        .request()
        .input("idProduct", resultProduct.recordset[0].id)
        .query(queryProductSku);

      for (var x = 0; x < resultMedia.recordset.length; x++) {
        var media = {};
        media["mediaID"] = resultMedia.recordset[x].id;
        media["linkString"] = resultMedia.recordset[x].linkString;
        media["title"] = resultMedia.recordset[x].title;
        media["description"] = resultMedia.recordset[x].description;
        media["objectRefType"] = 0;
        media["mediaType"] = 0;
        media["objectRefID"] = "1";

        medias.push(media);
      }

      for (var y = 0; y < resultProductSku.recordset.length; y++) {
        var sku = {};
        sku["productSKUID"] = resultProductSku.recordset[y].id;
        sku["priceBefore"] = resultProductSku.recordset[y].priceBefore;
        sku["price"] = resultProductSku.recordset[y].price;
        // sku['idAttribute1'] = resultProductSku.recordset[y].idAttribute1;
        // sku['idAttribute2'] = resultProductSku.recordset[y].idAttribute2;

        skus.push(sku);
      }

      var product = {
        productID: resultProduct.recordset[i].id,
        productName: resultProduct.recordset[i].name,
        productDescription: resultProduct.recordset[i].decription,
        medias: medias,
        productSKU: skus,
      };

      products.push(product);
    }

    var responseData = {
      result: products,
      total: 10, // Set mặc định vì chưa biết total này là gì
    };
    var key = request.route.path;
    set(key, responseData);

    response.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-list-same-category", get, async (request, response) => {
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
      var medias = [];
      var skus = [];

      var queryMedia = "SELECT * FROM Media WHERE id_product = @idProduct";
      var resultMedia = await database
        .request()
        .input("idProduct", resultProduct.recordset[0].id)
        .query(queryMedia);

      var queryProductSku =
        "SELECT* from Product_sku WHERE idProduct =  @idProduct";
      var resultProductSku = await database
        .request()
        .input("idProduct", resultProduct.recordset[0].id)
        .query(queryProductSku);

      for (var x = 0; x < resultMedia.recordset.length; x++) {
        var media = {};
        media["mediaID"] = resultMedia.recordset[x].id;
        media["linkString"] = resultMedia.recordset[x].linkString;
        media["title"] = resultMedia.recordset[x].title;
        media["description"] = resultMedia.recordset[x].description;
        media["objectRefType"] = 0;
        media["mediaType"] = 0;
        media["objectRefID"] = "1";

        medias.push(media);
      }

      for (var y = 0; y < resultProductSku.recordset.length; y++) {
        var sku = {};
        sku["productSKUID"] = resultProductSku.recordset[y].id;
        sku["priceBefore"] = resultProductSku.recordset[y].priceBefore;
        sku["price"] = resultProductSku.recordset[y].price;
        // sku['idAttribute1'] = resultProductSku.recordset[y].idAttribute1;
        // sku['idAttribute2'] = resultProductSku.recordset[y].idAttribute2;

        skus.push(sku);
      }

      var product = {
        productID: resultProduct.recordset[i].id,
        productName: resultProduct.recordset[i].name,
        productDescription: resultProduct.recordset[i].decription,
        medias: medias,
        productSKU: skus,
      };

      products.push(product);
    }

    var responseData = {
      result: products,
      total: 10, // Set mặc định vì chưa biết total này là gì
    };
    var key = request.route.path;
    set(key, responseData);

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
    console.log(955);
    const productID = request.query.productID;
    console.log(productID);
    let responseData = [];
    let arrayAttributeValue1 = [];
    let arrayAttributeValue2 = [];
    let attribute1Name;
    let attribute2Name;
    const queryAttribute1 =
      "SELECT DISTINCT idAttribute1 FROM Product_sku WHERE idProduct = @productID";
    const resultAttribute1 = await database
      .request()
      .input("productID", productID)
      .query(queryAttribute1);

    const queryAttribute2 =
      "SELECT DISTINCT idAttribute2 FROM Product_sku WHERE idProduct = @productID";
    const resultAttribute2 = await database
      .request()
      .input("productID", productID)
      .query(queryAttribute2);

    const queryAttributeValue1 =
      "SELECT id AS attributeValueID, name AS locAttributeValueName, description FROM Product_attribute1 WHERE id = @id";
    const queryAttributeValue2 =
      "SELECT id AS attributeValueID, name AS locAttributeValueName, description FROM Product_attribute2 WHERE id = @id";

    for (var i = 0; i < resultAttribute1.recordset.length; i++) {
      const resultAttributeValue1 = await database
        .request()
        .input("id", resultAttribute1.recordset[i].idAttribute1)
        .query(queryAttributeValue1);

      attribute1Name = resultAttributeValue1.recordset[0].locAttributeValueName;
      arrayAttributeValue1.push({
        attributeValueID: resultAttributeValue1.recordset[0].attributeValueID,
        locAttributeValueName: resultAttributeValue1.recordset[0].description,
        locAttributeValueDescription:
          resultAttributeValue1.recordset[0].description,
      });
    }
    responseData.push({
      locAttributeName: attribute1Name,
      locAttributeDescription: attribute1Name,
      attributeValue: arrayAttributeValue1,
    });

    for (var i = 0; i < resultAttribute2.recordset.length; i++) {
      const resultAttributeValue2 = await database
        .request()
        .input("id", resultAttribute2.recordset[i].idAttribute2)
        .query(queryAttributeValue2);

      attribute2Name = resultAttributeValue2.recordset[0].locAttributeValueName;
      arrayAttributeValue2.push({
        attributeValueID: resultAttributeValue2.recordset[0].attributeValueID,
        locAttributeValueName: resultAttributeValue2.recordset[0].description,
        locAttributeValueDescription:
          resultAttributeValue2.recordset[0].description,
      });
    }
    responseData.push({
      locAttributeName: attribute2Name,
      locAttributeDescription: attribute2Name,
      attributeValue: arrayAttributeValue2,
    });

    console.log(1004);
    response.status(201).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-product-sku-by-product-id", get, async (request, response) => {
  try {
    const productID = request.query.productID;
    var skus = [];
    const queryProductSku =
      "SELECT * from Product_sku WHERE idProduct =  @idProduct";
    const resultProductSku = await database
      .request()
      .input("idProduct", productID)
      .query(queryProductSku);

    for (var x = 0; x < resultProductSku.recordset.length; x++) {
      var image = "";
      var attribute = [];
      if (resultProductSku.recordset[x].idAttribute1 === null) {
        var queryImage =
          "SELECT linkString FROM Media WHERE id_product = @idProduct AND isDefault = 1";
        var imageResult = await database
          .request()
          .input("idProduct", resultProductSku.recordset[x].idProduct)
          .query(queryImage);

        image = imageResult.recordset[0].linkString;
      } else {
        var queryAttribute1 =
          "SELECT * FROM Product_attribute1 WHERE id = @idAttribute1";
        var resultAttribute1 = await database
          .request()
          .input("idAttribute1", resultProductSku.recordset[x].idAttribute1)
          .query(queryAttribute1);

        attribute.push({
          productSKUID: resultProductSku.recordset[x].id,
          locAttributeName: resultAttribute1.recordset[0].name,
          locAttributeDescription: resultAttribute1.recordset[0].name,
          attributeValueID: resultAttribute1.recordset[0].id,
          locAttributeValueName: resultAttribute1.recordset[0].decription,
          locAttributeValueDescription:
            resultAttribute1.recordset[0].decription,
        });

        var queryAttribute2 =
          "SELECT * FROM Product_attribute2 WHERE id = @idAttribute2";
        var resultAttribute2 = await database
          .request()
          .input("idAttribute2", resultProductSku.recordset[x].idAttribute2)
          .query(queryAttribute2);
        if (resultAttribute2.recordset.length !== 0) {
          attribute.push({
            productSKUID: resultProductSku.recordset[x].id,
            locAttributeName: resultAttribute2.recordset[0].name,
            locAttributeDescription: resultAttribute2.recordset[0].name,
            attributeValueID: resultAttribute2.recordset[0].id,
            locAttributeValueName: resultAttribute2.recordset[0].decription,
            locAttributeValueDescription:
              resultAttribute2.recordset[0].decription,
          });
        }
        image = resultAttribute1.recordset[0].image;
        var sku = {};
        sku["productSKUID"] = resultProductSku.recordset[x].id;
        sku["linkString"] = image;
        sku["price"] = resultProductSku.recordset[x].price;
        sku["priceBefore"] = resultProductSku.recordset[x].priceBefore;
        sku["productVersionID"] = "1";
        sku["attribute"] = attribute;
        skus.push(sku);
      }
    }
    response.status(201).json(skus);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});
// router.get("/get-list-by-category", async (request, response) => {
//     try {
//         var offset = request.query.offset;
//         var limit = request.query.limit;

//         if (offset == null || offset < 1) {
//             offset = 1;
//         }

//         if (limit == null) {
//             limit = 10;
//         }

//         offset = (offset - 1) * limit;
//         var idCategory = request.query.idCategory;

//         const queryProduct = "SELECT * FROM Product WHERE id_Category = @idCategory ORDER BY name OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY"
//         const resultProduct = await database.request()
//             .input('offset', parseInt(offset))
//             .input('limit', parseInt(limit))
//             .input('idCategory', idCategory)
//             .query(queryProduct)

//         var products = []

//         for (var i = 0; i < resultProduct.recordset.length; i++) {
//             var medias = [];
//             var skus = [];

//             var queryMedia = "SELECT * FROM Media WHERE id_product = @idProduct";
//             var resultMedia = await database.request()
//                 .input('idProduct', resultProduct.recordset[0].id)
//                 .query(queryMedia);

//             var queryProductSku = "SELECT* from Product_sku WHERE idProduct =  @idProduct"
//             var resultProductSku = await database.request()
//                 .input('idProduct', resultProduct.recordset[0].id)
//                 .query(queryProductSku)

//             for (var x = 0; x < resultMedia.recordset.length; x++) {
//                 var media = {};
//                 media['mediaID'] = resultMedia.recordset[x].id;
//                 media['linkString'] = resultMedia.recordset[x].linkString;
//                 media['title'] = resultMedia.recordset[x].title;
//                 media['description'] = resultMedia.recordset[x].description;

//                 medias.push(media);
//             }

//             for (var y = 0; y < resultProductSku.recordset.length; y++) {
//                 var sku = {};
//                 sku['skuID'] = resultProductSku.recordset[y].id;
//                 sku['quantity'] = resultProductSku.recordset[y].quantity;
//                 sku['price'] = resultProductSku.recordset[y].price;
//                 sku['idAttribute1'] = resultProductSku.recordset[y].idAttribute1;
//                 sku['idAttribute2'] = resultProductSku.recordset[y].idAttribute2;

//                 skus.push(sku);
//             }

//             var product = {
//                 "productID": resultProduct.recordset[i].id,
//                 "productName": resultProduct.recordset[i].name,
//                 "productDescription": resultProduct.recordset[i].decription,
//                 "medias": medias,
//                 "productSKU": skus
//             }

//             products.push(product);
//         }

//         response.status(200).json({
//             "result": products
//         })
//     } catch (error) {
//         console.log(error);
//         response.status(500).json({
//             "error": 'Internal Server Error'
//         })
//     }
// })

module.exports = router;
