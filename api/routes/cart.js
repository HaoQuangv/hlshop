const express = require("express");
const router = express.Router();

const database = require("../../config");
const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");

router.post("/add-cart", checkAuth, checkRole, async (request, response) => {
  try {
    const idProductSku = request.body.productSKUID;
    const quantity = Number(request.body.quantity);

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

    // Kiểm tra xem id_user đã có trong giỏ hàng chưa
    const queryCheckCart =
      "SELECT id, quantity FROM Cart WHERE id_user = @idUser AND idProductSku = @idProductSku";

    const checkCartResult = await database
      .request()
      .input("idUser", userResult.recordset[0].id)
      .input("idProductSku", idProductSku)
      .query(queryCheckCart);

    if (checkCartResult.recordset.length !== 0) {
      // Nếu đã có, cập nhật số lượng
      const updatedQuantity = checkCartResult.recordset[0].quantity + quantity;
      const queryUpdateCart =
        "UPDATE Cart SET quantity = @updatedQuantity WHERE id = @idCart";

      await database
        .request()
        .input("updatedQuantity", updatedQuantity)
        .input("idCart", checkCartResult.recordset[0].id)
        .query(queryUpdateCart);
    } else {
      // Nếu chưa có, thêm mới
      const queryCart =
        "INSERT INTO Cart(id_user, quantity, idProductSku) VALUES (@idUser, @quantity, @idProductSku)";

      await database
        .request()
        .input("idUser", userResult.recordset[0].id)
        .input("quantity", quantity)
        .input("idProductSku", idProductSku)
        .query(queryCart);
    }

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

      // Kiểm tra dữ liệu đầu vào
      if (!idCart || quantity === undefined || quantity === null) {
        return response.status(400).json({
          error: "Invalid input data",
        });
      }

      // Kiểm tra xem id_user của người dùng có khớp với id_user trong Cart hay không
      const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
      const userResult = await database
        .request()
        .input("idAccount", request.userData.uuid)
        .query(queryUser);

      const queryCart = "SELECT id_user FROM Cart WHERE id = @idCart";
      const cartUserResult = await database
        .request()
        .input("idCart", idCart)
        .query(queryCart);
      //         SELECT 1
      // FROM Cart c
      // JOIN [User] u ON c.id_user = u.id
      // WHERE c.id = @idCart
      //   AND u.id_account = @idAccount;
      if (
        cartUserResult.recordset.length === 0 ||
        cartUserResult.recordset[0].id_user !== userResult.recordset[0].id
      ) {
        // Nếu không khớp id_user, trả về lỗi
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
          "UPDATE Cart SET quantity = @quantity WHERE id = @idCart";
        const cartResult = await database
          .request()
          .input("quantity", quantity)
          .input("idCart", idCart)
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
    SELECT Cart.*, ProductSku.id AS productSKUID, ProductSku.price AS price, ProductSku.idAttributeValue1 AS idAttributeValue1, ProductSku.idAttributeValue2 AS idAttributeValue2, Product.id AS productID, Product.name AS productName, Product.decription AS productDescription
    FROM [User]
    LEFT JOIN Cart ON [User].id = Cart.id_user
    LEFT JOIN ProductSku ON Cart.idProductSku = ProductSku.id
    LEFT JOIN Product ON ProductSku.idProduct = Product.id
    WHERE [User].id_account = @idAccount
  `;

  const result = await database
    .request()
    .input("idAccount", idAccount)
    .query(query);

  const carts = [];
  console.log(result.recordset.length);
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
    console.log(7, field);
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
