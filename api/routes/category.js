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

async function getListProductByCategory(idCategory) {
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

//Lấy những sản phẩm của 1 categoty cụ thể
router.get("/detail", async (request, response) => {
  try {
    var idCategory = request.query.productCategoryID;
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;
    var search = request.query.search ? request.query.search.toLowerCase() : "";

    const resultArray = await getListProductByCategory(idCategory);

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
module.exports = router;
