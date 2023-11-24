const express = require("express");
const multer = require("multer");

const router = express.Router();

const database = require("../../config");
const checkAuth = require("../../middleware/check_auth");
const checkRoleAdmin = require("../../middleware/check_role_admin");
const checkRole = require("../../middleware/check_role");
const firebase = require("../../firebase.js");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single("file");

const redisClient = require("../../middleware/redisClient");
const set = (key, value) => {
  redisClient.set(key, JSON.stringify(value), "EX", 3600);
};

const get = async (request, response, next) => {
  let key = request.route.path + JSON.stringify(request.query);
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
  "/create-category",
  upload,
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const name = request.body.name;
      var image = "";
      if (!request.file) {
        response.status(400).json({
          message: "Ban chua upload anh",
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
            image = image + publicUrl;
            const queryCategory =
              "INSERT INTO Category(name, image) VALUES(@name, @image)";
            const categoryResult = await database
              .request()
              .input("name", name)
              .input("image", image)
              .query(queryCategory);

            response.status(200).json({
              name: name,
              image: image,
            });
          } catch (error) {
            console.log(error);
            response.status(500).json({
              error: "Internal Server Error",
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

router.put(
  "/update-category",
  upload,
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const name = request.body.name;
      const idCategory = request.body.idCategory;
      var image = "";
      if (!request.file) {
        const queryCategory =
          "UPDATE Category SET name = @name WHERE id = @idCategory";
        const categoryResult = await database
          .request()
          .input("name", name)
          .input("idCategory", idCategory)
          .query(queryCategory);

        response.status(200).json({
          message: "Upload thanh cong",
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
            image = image + publicUrl;
            const queryCategory =
              "UPDATE Category SET name = @name, image = @image WHERE id = @idCategory";
            const categoryResult = await database
              .request()
              .input("name", name)
              .input("image", image)
              .input("idCategory", idCategory)
              .query(queryCategory);

            response.status(200).json({
              message: "Upload thanh cong",
            });
          } catch (error) {
            console.log(error);
            response.status(500).json({
              error: "Internal Server Error",
            });
          }
        });

        blobWriter.end(request.file.buffer);
      }
    } catch {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.delete(
  "/delete-category",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const idCategory = request.body.idCategory;

      const queryCategory = "DELETE FROM [Category] WHERE id = @idCategory";
      const categoryResult = await database
        .request()
        .input("idCategory", idCategory)
        .query(queryCategory);

      response.status(200).json({
        message: "Xoa category thanh cong",
      });
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.get("/get-list", get, async (request, response) => {
  try {
    const offset = request.query.offset || 1;
    const limit = request.query.limit || 10;

    const [categoryResult, ResultTotalCategory] = await Promise.all([
      database.request()
        .input("page", parseInt((offset - 1) * limit))
        .input("pageSize", parseInt(limit))
        .query("SELECT * FROM Category ORDER BY name OFFSET @page ROWS FETCH NEXT @pageSize ROWS ONLY"),

      database.request()
        .query("SELECT COUNT(*) AS TotalRecords FROM category;")
    ]);

    const results = categoryResult.recordset.map(category => ({
      productCategoryID: category.id,
      productCategoryName: category.name,
      linkString: category.image,
    }));

    const responseData = {
      result: results,
      total: ResultTotalCategory.recordset[0].TotalRecords,
    }
    let key = request.route.path + JSON.stringify(request.query);
    set(key, responseData);
    response.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

//Lấy những sản phẩm của 1 categoty cụ thể
router.get("/detail", get, async (request, response) => {
  try {
    const offset = request.query.offset || 1;
    const limit = request.query.limit || 10;
    const idCategory = request.query.productCategoryID;

    const [resultProduct, resultCategory, ResultTotalCategory] = await Promise.all([
      database.request()
        .input("offset", parseInt((offset - 1) * limit))
        .input("limit", parseInt(limit))
        .input("idCategory", idCategory)
        .query("SELECT * FROM Product WHERE id_Category = @idCategory ORDER BY name OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY"),

      database.request()
        .input("idCategory", idCategory)
        .query("SELECT * FROM Category WHERE id = @idCategory"),

      database.request().query("SELECT COUNT(*) AS TotalRecords FROM category;")
    ]);

    const products = await Promise.all(resultProduct.recordset.map(async (product) => {
      const [resultMedia, resultProductSku] = await Promise.all([
        database.request()
          .input("idProduct", product.id)
          .query("SELECT * FROM Media WHERE id_product = @idProduct"),

        database.request()
          .input("idProduct", product.id)
          .query("SELECT * from ProductSku WHERE idProduct =  @idProduct")
      ]);

      const medias = resultMedia.recordset.map(media => ({
        mediaID: media.id,
        linkString: media.linkString,
        title: media.title,
        description: media.description,
        objectRefType: 0,
        mediaType: 0,
        objectRefID: "1"
      }));

      const skus = resultProductSku.recordset.map(sku => ({
        productSKUID: sku.id,
        productVersionID: 1,
        price: sku.price,
        priceBefore: sku.priceBefore
      }));

      return {
        productID: product.id,
        productName: product.name,
        productDescription: product.description,
        medias: medias,
        productSKU: skus,
      };
    }));

    const responseData = {
      result: products,
      total: ResultTotalCategory.recordset[0].TotalRecords,
      productCategory: {
        productCategoryID: resultCategory.recordset[0].id,
        productCategoryName: resultCategory.recordset[0].name,
        linkString: resultCategory.recordset[0].image,
      },
    };
    let key = request.route.path + JSON.stringify(request.query);
    set(key, responseData);
    response.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});
module.exports = router;
