const express = require("express");
const router = express.Router();
require("dotenv").config();
const database = require("../../config");

const checkAuth = require("../../middleware/check_auth");
const checkRoleAdmin = require("../../middleware/check_role_admin");

const firebase = require("../../firebase");

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
});

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
module.exports = router;
