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

router.get("/get-list", async (request, response) => {
  try {
    var offset = request.query.offset;
    var limit = request.query.limit;

    console.log(typeof page);
    console.log(typeof pageSize);
    if (offset == null || offset < 1) {
      offset = 1;
    }

    if (limit == null) {
      limit = 10;
    }

    offset = (offset - 1) * limit;

    const queryCategory =
      "SELECT * FROM Category ORDER BY name OFFSET @page ROWS FETCH NEXT @pageSize ROWS ONLY";
    const categoryResult = await database
      .request()
      .input("page", parseInt(offset))
      .input("pageSize", parseInt(limit))
      .query(queryCategory);

    const queryTotalCategory = "SELECT COUNT(*) AS TotalRecords FROM category;";
    const ResultTotalCategory = await database
      .request()
      .query(queryTotalCategory);

    var results = [];
    for (var i = 0; i < categoryResult.recordset.length; i++) {
      var result = {
        productCategoryID: categoryResult.recordset[i].id,
        productCategoryName: categoryResult.recordset[i].name,
        linkString: categoryResult.recordset[i].image,
      };

      results.push(result);
    }
    response.status(200).json({
      result: results,
      total: ResultTotalCategory.recordset[0].TotalRecords,
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

//Lấy những sản phẩm của 1 categoty cụ thể
router.get("/detail", async (request, response) => {
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
    var idCategory = request.query.productCategoryID;

    const queryProduct =
      "SELECT * FROM Product WHERE id_Category = @idCategory ORDER BY name OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY";
    const resultProduct = await database
      .request()
      .input("offset", parseInt(offset))
      .input("limit", parseInt(limit))
      .input("idCategory", idCategory)
      .query(queryProduct);

    const queryCategory = "SELECT * FROM Category WHERE id = @idCategory";
    const resultCategory = await database
      .request()
      .input("idCategory", idCategory)
      .query(queryCategory);

    const queryTotalCategory = "SELECT COUNT(*) AS TotalRecords FROM category;";
    const ResultTotalCategory = await database
      .request()
      .query(queryTotalCategory);
    var products = [];

    for (var i = 0; i < resultProduct.recordset.length; i++) {
      var medias = [];
      var skus = [];

      var queryMedia = "SELECT * FROM Media WHERE id_product = @idProduct";
      var resultMedia = await database
        .request()
        .input("idProduct", resultProduct.recordset[i].id)
        .query(queryMedia);

      var queryProductSku =
        "SELECT* from Product_sku WHERE idProduct =  @idProduct";
      var resultProductSku = await database
        .request()
        .input("idProduct", resultProduct.recordset[i].id)
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
        sku["productVersionID"] = "1"; //Set mặc định vì chưa biết nó là gì
        sku["price"] = resultProductSku.recordset[y].price;
        sku["priceBefore"] = resultProductSku.recordset[y].priceBefore;

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

    response.status(200).json({
      result: products,
      total: resultProduct.recordset.length,
      //   productCategory: {
      //     productCategoryID: resultCategory.recordset[0].id,
      //     productCategoryName: resultCategory.recordset[0].name,
      //     linkString: resultCategory.recordset[0].image,
      //   },
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});
module.exports = router;
