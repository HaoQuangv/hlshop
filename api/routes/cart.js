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
      const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
      const userResult = await database
        .request()
        .input("idAccount", request.userData.uuid)
        .query(queryUser);

      const queryCart = "SELECT * FROM Cart WHERE id_user = @idUser";
      const cartResult = await database
        .request()
        .input("idUser", userResult.recordset[0].id)
        .query(queryCart);

      var carts = [];
      for (var i = 0; i < cartResult.recordset.length; i++) {
        var attributes = [];
        var media = [];
        const queryProductSku =
          "SELECT * FROM ProductSku WHERE id = @idProductSku";
        var productSkuResult = await database
          .request()
          .input("idProductSku", cartResult.recordset[i].idProductSku)
          .query(queryProductSku);

        const queryProduct = "SELECT * FROM Product WHERE id = @idProduct";
        var productResult = await database
          .request()
          .input("idProduct", productSkuResult.recordset[0].idProduct)
          .query(queryProduct);
        if (productSkuResult.recordset[0].idAttributeValue1 === null) {
          const queryMedia = "SELECT * FROM Media WHERE id_product = @id";
          var mediaResult = await database
            .request()
            .input("id", productResult.recordset[0].id)
            .query(queryMedia);
          var image = {
            mediaID: "13",
            linkString: mediaResult.recordset[0].linkString,
            title: "test",
            description: "test",
            objectRefType: 0,
            mediaType: 0,
            objectRefID: "1",
          };
          media.push(image);
        } else {
          if (productSkuResult.recordset[0].idAttributeValue1 !== null) {
            const queryAttributeValue =
              "SELECT productAttributeID, valueName, id, linkString FROM ProductAttributeValue WHERE id = @idAttribute";
            var attributeValueResult = await database
              .request()
              .input(
                "idAttribute",
                productSkuResult.recordset[0].idAttributeValue1
              )
              .query(queryAttributeValue);
            var image = {
              mediaID: "13",
              linkString: attributeValueResult.recordset[0].linkString,
              title: "test",
              description: "test",
              objectRefType: 0,
              mediaType: 0,
              objectRefID: "1",
            };
            media.push(image);

            const queryAttribute =
              "SELECT * FROM ProductAttribute WHERE id = @id";
            var attributeResult = await database
              .request()
              .input("id", attributeValueResult.recordset[0].productAttributeID)
              .query(queryAttribute);
            attributes.push({
              localizedAttributeValueID: attributeValueResult.recordset[0].id,
              locAttributeValueName:
                attributeValueResult.recordset[0].valueName,
              locAttributeValueDescription:
                attributeValueResult.recordset[0].valueName,
              attributeValueID: attributeValueResult.recordset[0].id,
              locAttributeName: attributeResult.recordset[0].name,
              attributeID: attributeResult.recordset[0].id,
            });
          }

          if (productSkuResult.recordset[0].idAttributeValue2 !== null) {
            const queryAttributeValue =
              "SELECT productAttributeID, valueName, id FROM ProductAttributeValue WHERE id = @idAttribute";
            var attributeValueResult = await database
              .request()
              .input(
                "idAttribute",
                productSkuResult.recordset[0].idAttributeValue2
              )
              .query(queryAttributeValue);
            const queryAttribute =
              "SELECT * FROM ProductAttribute WHERE id = @id";
            var attributeResult = await database
              .request()
              .input("id", attributeValueResult.recordset[0].productAttributeID)
              .query(queryAttribute);
            attributes.push({
              localizedAttributeValueID: attributeValueResult.recordset[0].id,
              locAttributeValueName:
                attributeValueResult.recordset[0].valueName,
              locAttributeValueDescription:
                attributeValueResult.recordset[0].valueName,
              attributeValueID: attributeValueResult.recordset[0].id,
              locAttributeName: attributeResult.recordset[0].name,
              attributeID: attributeResult.recordset[0].id,
            });
          }
        }

        var cart = {
          cartID: cartResult.recordset[i].id,
          productID: productSkuResult.recordset[0].idProduct,
          productName: productResult.recordset[0].name,
          productDescription: productResult.recordset[0].decription,
          productSKUID: cartResult.recordset[i].idProductSku,
          medias: media,
          quantity: cartResult.recordset[i].quantity,
          price: productSkuResult.recordset[0].price + "",
          priceBefore: 0,
          attribute: attributes,
        };
        carts.push(cart);
      }
      response.status(200).json(carts);
    } catch (error) {
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
module.exports = router;
