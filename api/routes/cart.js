const express = require("express");
const router = express.Router();

const database = require("../../config");
const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");

router.post("/add-cart", checkAuth, checkRole, async (request, response) => {
  try {
    const idProductSku = request.body.productSKUID;
    const quantity = Number(request.body.quantity);
    const createdDate = new Date();
    // Kiểm tra dữ liệu đầu vào
    if (!idProductSku || !quantity || quantity <= 0) {
      return response.status(400).json({
        error: "Invalid input data",
      });
    }

    const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
    const userResult = await database
      .request()
      .input("idAccount", request.userData.uuid)
      .query(queryUser);

    // Sử dụng MERGE để thêm mới hoặc cập nhật giỏ hàng
    const queryMergeCart = `
      MERGE INTO Cart AS target
      USING (VALUES (@idUser, @idProductSku, @quantity, @createdDate)) AS source (id_user, idProductSku, quantity, createdDate)
      ON target.id_user = source.id_user AND target.idProductSku = source.idProductSku
      WHEN MATCHED THEN
        UPDATE SET target.quantity = target.quantity + source.quantity, target.createdDate = source.createdDate
      WHEN NOT MATCHED THEN
        INSERT (id_user, idProductSku, quantity, createdDate)
        VALUES (source.id_user, source.idProductSku, source.quantity, source.createdDate);
    `;

    await database
      .request()
      .input("idUser", userResult.recordset[0].id)
      .input("idProductSku", idProductSku)
      .input("quantity", quantity)
      .input("createdDate", createdDate)
      .query(queryMergeCart);

    response.status(200).json({
      status: 200,
      message: "Add Cart successful",
    });
  } catch (error) {
    // Xử lý lỗi cụ thể
    if (error.code === "EREQUEST") {
      return response.status(500).json({
        error: "Not Exist Product",
      });
    }

    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.post(
  "/update-quantity-cart",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const idCart = request.body.cartID;
      const quantity = Number(request.body.quantity);
      const createdDate = new Date();

      // Kiểm tra dữ liệu đầu vào
      if (
        !idCart ||
        typeof quantity !== "number" ||
        !Number.isInteger(quantity)
      ) {
        return response.status(400).json({
          error: "Invalid input data",
        });
      }

      // Kiểm tra quyền truy cập
      const queryAccessCheck = `
      SELECT 1
      FROM [User] AS u
      INNER JOIN Cart AS c ON u.id = c.id_user
      WHERE u.id_account = @idAccount AND c.id = @idCart;
    `;
      const accessCheckResult = await database
        .request()
        .input("idAccount", request.userData.uuid)
        .input("idCart", idCart)
        .query(queryAccessCheck);

      if (accessCheckResult.recordset.length === 0) {
        return response.status(403).json({
          error: "Permission denied",
        });
      }

      // Tiếp tục xử lý nếu kiểm tra thành công

      if (quantity <= 0) {
        // Nếu quantity <= 0 thì xóa sản phẩm khỏi giỏ hàng
        const deleteQuery = "DELETE FROM Cart WHERE id = @idCart";
        await database.request().input("idCart", idCart).query(deleteQuery);

        response.status(200).json({
          status: 200,
          message: "Delete success",
        });
      } else {
        // Cập nhật quantity bằng cách cộng thêm vào giá trị hiện tại
        const updateQuery =
          "UPDATE Cart SET quantity = @quantity, createdDate = @createdDate WHERE id = @idCart";
        await database
          .request()
          .input("quantity", quantity)
          .input("idCart", idCart)
          .input("createdDate", createdDate)
          .query(updateQuery);

        response.status(200).json({
          status: 200,
          message: "Update quantity cart success",
          cart: {
            cartID: idCart,
            quantity: quantity,
          },
        });
      }
    } catch (error) {
      // Xử lý lỗi cụ thể
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          error: "Not Exist Product",
        });
      }

      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.get(
  "/get-list-cart",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const carts = await getCartList(request.userData.uuid);
      response.status(200).json(carts);
    } catch (error) {
      handleErrorResponse(error, response);
    }
  }
);
async function getCartList(idAccount) {
  const query = `
    SELECT
      c.id AS cartID,
      c.quantity AS quantity,
      Product.id AS productID,
      Product.name AS productName,
      Product.description AS productDescription,
      ProductSku.id AS productSKUID,
      ProductSku.price AS price,
      ProductSku.priceBefore AS priceBefore,
      pav.id AS idAttributeValue1,
      pav.valueName AS locAttributeValueName1,
      pav.valueName AS locAttributeValueDescription1,
      pav2.id AS idAttributeValue2,
      pav2.valueName AS locAttributeValueName2,
      pav2.valueName AS locAttributeValueDescription2,
      pa.name AS locAttributeName,
      pa.id AS attributeID,
      pa2.name AS locAttributeName2,
      pa2.id AS attributeID2,
      Media.id AS mediaID,
      Media.linkString AS linkString,
      Media.title AS title,
      Media.description AS description,
      Media.productAttributeValueID
    FROM [User]
    JOIN Cart AS c ON [User].id = c.id_user
    JOIN ProductSku ON c.idProductSku = ProductSku.id
    LEFT JOIN ProductAttributeValue AS pav ON ProductSku.idAttributeValue1 = pav.id
    LEFT JOIN ProductAttributeValue AS pav2 ON ProductSku.idAttributeValue2 = pav2.id
    LEFT JOIN ProductAttribute AS pa ON pav.productAttributeID = pa.id
    LEFT JOIN ProductAttribute AS pa2 ON pav2.productAttributeID = pa2.id
    JOIN Product ON ProductSku.idProduct = Product.id
    LEFT JOIN Media ON Product.id = Media.id_product
    WHERE [User].id_account = @idAccount
    ORDER BY c.createdDate DESC;
  `;

  const result = await database
    .request()
    .input("idAccount", idAccount)
    .query(query);

  const resultMap = {};
  result.recordset.forEach((item) => {
    const {
      cartID,
      productID,
      productSKUID,
      mediaID,
      idAttributeValue1,
      idAttributeValue2,
      ...rest
    } = item;
    if (!resultMap[cartID]) {
      resultMap[cartID] = {
        cartID: cartID,
        productID: productID,
        productName: item.productName,
        productDescription: item.productDescription,
        productSKUID: productSKUID,
        medias: [],
        quantity: item.quantity,
        price: item.price,
        priceBefore: item.priceBefore,
        attribute: [],
      };
    }
    // xu ly anh
    if (idAttributeValue1 === item.productAttributeValueID) {
      resultMap[cartID].medias.unshift({
        mediaID: mediaID,
        linkString: item.linkString,
        title: item.title ? item.title : "",
        description: item.description ? item.description : "",
      });
    } else if (resultMap[cartID].medias.length === 0) {
      resultMap[cartID].medias.push({
        mediaID: mediaID,
        linkString: item.linkString,
        title: item.title ? item.title : "",
        description: item.description ? item.description : "",
      });
    }
    if (resultMap[cartID].medias.length > 1) {
      resultMap[cartID].medias.pop();
    }
    const attribute1Exit = resultMap[cartID].attribute.some(
      (attribute) => attribute.attributeValueID === idAttributeValue1
    );

    if (!attribute1Exit) {
      if (idAttributeValue1) {
        resultMap[cartID].attribute.push({
          localizedAttributeValueID: idAttributeValue1,
          locAttributeValueName: item.locAttributeValueName1,
          locAttributeValueDescription: item.locAttributeValueDescription1,
          attributeValueID: idAttributeValue1,
          locAttributeName: item.locAttributeName,
          attributeID: item.attributeID,
        });
      }
    }
    const attribute2Exit = resultMap[cartID].attribute.some(
      (attribute) =>
        attribute.attributeValueID === idAttributeValue2 &&
        attribute.attributeID === item.attributeID2
    );
    if (!attribute2Exit) {
      if (idAttributeValue2) {
        resultMap[cartID].attribute.push({
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

  return Object.values(resultMap);
}

function handleErrorResponse(error, response) {
  if (error.code === "EREQUEST") {
    response.status(500).json({
      error: "Not Exist Product",
    });
  } else {
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
}
module.exports = router;
