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
    SELECT Cart.*, ProductSku.id AS productSKUID, ProductSku.price AS price, ProductSku.idAttributeValue1 AS idAttributeValue1, ProductSku.idAttributeValue2 AS idAttributeValue2, Product.id AS productID, Product.name AS productName, Product.description AS productDescription
    FROM [User]
    JOIN Cart ON [User].id = Cart.id_user
    JOIN ProductSku ON Cart.idProductSku = ProductSku.id
    JOIN Product ON ProductSku.idProduct = Product.id
    WHERE [User].id_account = @idAccount
    ORDER BY Cart.createdDate DESC;
  `;

  const result = await database
    .request()
    .input("idAccount", idAccount)
    .query(query);

  const carts = [];
  for (const cart of result.recordset) {
    const productID = cart.productID;
    const productSKUID = cart.productSKUID;
    const medias = await getMedias(productID, cart.idAttributeValue1);
    const attributes = await getAttributes(
      productSKUID,
      cart.idAttributeValue1,
      cart.idAttributeValue2
    );

    const cartData = {
      cartID: cart.id,
      productID: productID,
      productName: cart.productName,
      productDescription: cart.productDescription,
      productSKUID: productSKUID,
      medias: medias,
      quantity: cart.quantity,
      price: cart.price.toString(),
      priceBefore: 0,
      attribute: attributes,
    };

    carts.push(cartData);
  }

  return carts;
}

async function getMedias(productID, idAttributeValue1) {
  if (idAttributeValue1 !== null) {
    const queryMedia =
      "SELECT * FROM Media WHERE productAttributeValueID = @id";
    var mediaResult = await database
      .request()
      .input("id", idAttributeValue1)
      .query(queryMedia);
    const images = [];
    images.push({
      mediaID: mediaResult.recordset[0].id,
      linkString: mediaResult.recordset[0].linkString,
      title: mediaResult.recordset[0].title,
      description: mediaResult.recordset[0].description,
      objectRefType: 0,
      mediaType: 0,
      objectRefID: "1",
    });
    return images;
  } else {
    const queryMedia = "SELECT * FROM Media WHERE id_product = @productID";
    const mediaResult = await database
      .request()
      .input("productID", productID)
      .query(queryMedia);
    const images = [];
    images.push({
      mediaID: mediaResult.recordset[0].id,
      linkString: mediaResult.recordset[0].linkString,
      title: mediaResult.recordset[0].title,
      description: mediaResult.recordset[0].description,
      objectRefType: 0,
      mediaType: 0,
      objectRefID: "1",
    });
    return images;
  }
}

async function getAttributes(
  productSKUID,
  idAttributeValue1,
  idAttributeValue2
) {
  const attributes = [];
  const attributeValueFields = [idAttributeValue1, idAttributeValue2].filter(
    (field) => field !== null
  );
  for (const field of attributeValueFields) {
    const queryAttributes = `
      SELECT
        pav.id AS localizedAttributeValueID,
        pav.valueName AS locAttributeValueName,
        pav.valueName AS locAttributeValueDescription,
        pav.id AS attributeValueID,
        pa.name AS locAttributeName,
        pa.id AS attributeID
      FROM ProductAttributeValue pav
      JOIN ProductAttribute pa ON pav.productAttributeID = pa.id
      WHERE pav.id = @idpav
    `;

    const attributeResult = await database
      .request()
      .input("idpav", field)
      .query(queryAttributes);
    attributes.push(attributeResult.recordset[0]);
  }
  return attributes;
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
