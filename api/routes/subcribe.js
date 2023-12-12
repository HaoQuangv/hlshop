const express = require("express");
const router = express.Router();

const database = require("../../config");
const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");

router.get(
  "/check-subscribe-by-productid",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const productID = request.query.productID;

      const query = `
        SELECT
          s.id_user AS idUser,
          s.idProduct AS idProduct
        FROM Subcribe AS s
        LEFT JOIN [User] AS u ON s.id_user = u.id
        WHERE u.id_account = @idAccount AND s.idProduct = @idProduct
      `;

      const result = await database
        .request()
        .input("idAccount", request.userData.uuid)
        .input("idProduct", productID)
        .query(query);

      const isSubscribed = result.recordset.length > 0;

      response.status(200).json({
        status: 200,
        isSubscribed,
        message: isSubscribed
          ? "User is subscribed to the product"
          : "User is not subscribed to the product",
      });
    } catch (error) {
      console.error("Error executing SQL query:", error);
      response.status(500).json({
        error: "Internal Server Error",
        details: error.message || "An unexpected error occurred",
      });
    }
  }
);

router.get(
  "/get-list-subcribe",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      var offset = parseInt(request.query.offset) || 0;
      var limit = parseInt(request.query.limit) || 10;
      const resultArray = await getListProductSubcribe(request.userData.uuid);
      // Phân trang
      const paginatedResult = resultArray.slice(offset, offset + limit);

      response
        .status(200)
        .json({ result: paginatedResult, total: resultArray.length });
    } catch (error) {
      response.status(500).json({
        error: error,
      });
    }
  }
);

router.post("/subcribe", checkAuth, checkRole, async (request, response) => {
  try {
    const productID = request.query.productID;
    const createdDate = new Date();

    // Kiểm tra dữ liệu đầu vào
    if (!productID || typeof productID !== "string") {
      return response.status(400).json({
        error: "Invalid input data",
        details: "ProductID must be a non-empty string",
      });
    }

    const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
    const userResult = await database
      .request()
      .input("idAccount", request.userData.uuid)
      .query(queryUser);

    if (!userResult.recordset || userResult.recordset.length === 0) {
      return response.status(404).json({
        error: "User not found",
      });
    }

    // Sử dụng TRY-CATCH để xử lý lỗi khi thực hiện câu truy vấn SQL
    try {
      const queryMergeCart = `
        MERGE INTO Subcribe AS target
        USING (VALUES (@idUser, @idProduct, @createdDate)) AS source (id_user, idProduct, createdDate)
        ON target.id_user = source.id_user AND target.idProduct = source.idProduct
        WHEN NOT MATCHED THEN
          INSERT (id_user, idProduct, createdDate)
          VALUES (source.id_user, source.idProduct, source.createdDate);
      `;

      await database
        .request()
        .input("idUser", userResult.recordset[0].id)
        .input("idProduct", productID)
        .input("createdDate", createdDate)
        .query(queryMergeCart);

      response.status(200).json({
        status: 200,
        message: "Subscription successful",
      });
    } catch (error) {
      // Log lỗi để dễ dàng theo dõi và giải quyết sự cố
      console.error("Error executing SQL query:", error);
      response.status(500).json({
        error: "Internal Server Error",
        details: error.message || "An unexpected error occurred",
      });
    }
  } catch (error) {
    response.status(500).json({
      error: "Internal Server Error",
      details: error.message || "An unexpected error occurred",
    });
  }
});

router.post("/unsubcribe", checkAuth, checkRole, async (request, response) => {
  try {
    const productID = request.query.productID;

    // Kiểm tra dữ liệu đầu vào
    if (!productID || typeof productID !== "string") {
      return response.status(400).json({
        error: "Invalid input data",
        details: "ProductID must be a non-empty string",
      });
    }

    const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
    const userResult = await database
      .request()
      .input("idAccount", request.userData.uuid)
      .query(queryUser);

    if (!userResult.recordset || userResult.recordset.length === 0) {
      return response.status(404).json({
        error: "User not found",
      });
    }

    // Sử dụng TRY-CATCH để xử lý lỗi khi thực hiện câu truy vấn SQL
    try {
      const queryUnsubscribe = `
        MERGE INTO Subcribe AS target
        USING (VALUES (@idUser, @idProduct)) AS source (id_user, idProduct)
        ON target.id_user = source.id_user AND target.idProduct = source.idProduct
        WHEN MATCHED THEN
        DELETE
        OUTPUT $action AS Action;
        `;

      const result = await database
        .request()
        .input("idUser", userResult.recordset[0].id)
        .input("idProduct", productID)
        .query(queryUnsubscribe);

      response.status(200).json({
        status: 200,
        message: "Unsubscription successful",
      });
    } catch (error) {
      // Log lỗi để dễ dàng theo dõi và giải quyết sự cố
      console.error("Error executing SQL query:", error);
      response.status(500).json({
        error: "Internal Server Error",
        details: error.message || "An unexpected error occurred",
      });
    }
  } catch (error) {
    response.status(500).json({
      error: "Internal Server Error",
      details: error.message || "An unexpected error occurred",
    });
  }
});

async function getListProductSubcribe(idAccount) {
  try {
    const queryProduct = `
      SELECT 
      p.id AS productID,
      p.name AS productName,
      p.description AS productDescription,
      p.slogan AS productSlogan,
      p.notes AS productNotes,
      ps.id AS productSKUID,
      ps.price AS price,
      ps.priceBefore AS priceBefore,
      m.id AS mediaID,
      m.linkString AS linkString,
      m.title AS title,
      m.description AS description
      FROM Product as p
      LEFT JOIN ProductSku as ps ON p.id = ps.idProduct
      LEFT JOIN Media as m ON p.id = m.id_product
      RIGHT JOIN Subcribe as s ON p.id = s.idProduct
      RIGHT JOIN [User] as u ON s.id_user = u.id
      WHERE u.id_account = @idAccount
      ORDER BY s.createdDate DESC 
    `;

    const result = await database
      .request()
      .input("idAccount", idAccount)
      .query(queryProduct);

    const resultMap = {};
    result.recordset.forEach((item) => {
      const { productID, productSKUID, mediaID } = item;
      if (!resultMap[productID]) {
        if (productID !== null)
          resultMap[productID] = {
            productID: productID,
            productName: item.productName,
            productDescription: item.productDescription,
            productSlogan: item.productSlogan,
            productNotes: item.productNotes,
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
    throw "ERROR";
  }
}

module.exports = router;
