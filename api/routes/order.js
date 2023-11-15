const express = require("express");
const router = express.Router();

const sql = require("mssql");
const database = require("../../config");

const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");

router.post("/create", checkAuth, checkRole, async (request, response) => {
  let transaction = new sql.Transaction(database);
  try {
    const { receiverAddressID, paymentMethod, carts } = request.body;
    const DateNow = new Date();
    cartList = removeDuplicates(carts);
    if (paymentMethod !== 0 && paymentMethod !== 1) {
      throw "Invalid paymentMethod";
    }
    await transaction
      .begin()
      .then(async () => {
        // tao bang order gom createDate, paymentMethod, userID,
        const { orderID, idUser } = await createOrder(
          request.userData.uuid,
          paymentMethod,
          transaction,
          DateNow
        );

        const orderCode = generateOrderCode(orderID, DateNow);

        await mapAddressOrder(receiverAddressID, orderID, transaction, idUser);

        let totalPrice = 0;
        for (const cart of cartList) {
          const { price, quantity } = await mapCarttoOrderItem(
            cart.cartID,
            orderID,
            idUser,
            transaction
          );
          totalPrice += price * quantity;
          //xoa cart
          await deleteCartItem(cart.cartID, transaction);
        }

        //cap nhat orderCode, orderStatus = 0
        await insertOderCodeAndOrderTotal(
          orderID,
          orderCode,
          totalPrice,
          transaction
        );
        //tao bang OrderTracking gom orderId, orderStatus, createDate
        await createOrderTracking(orderID, transaction, DateNow);

        await transaction.commit();
        response.status(200).json({
          status: 200,
          message: "Create Order Success",
          result: {
            orderIDs: orderID,
          },
        });
      })
      .catch(async (err) => {
        await transaction.rollback();

        throw err;
      });
  } catch (error) {
    if (error.code === "EREQUEST") {
      return response.status(500).json({
        error: "Database error",
      });
    }
    if (error.code === "EABORT") {
      return response.status(500).json({
        error: "Invalid input data",
      });
    }
    response.status(500).json({
      error: error,
    });
  }
});

async function deleteCartItem(cartID, userID, transaction) {
  try {
    const query = `
        DELETE FROM Cart
        WHERE id = @cartID AND id_user = @userID;
        `;
    await transaction
      .request()
      .input("cartID", cartID)
      .input("userID", userID)
      .query(query);
  } catch (error) {
    console.error("error deleteCartItem");
    throw "Error in deleteCartItem";
  }
}

async function createOrderTracking(orderID, transaction, DateNow) {
  try {
    const query = `
        INSERT INTO OrderTracking (orderId, orderStatus, actionDate)
        VALUES (@orderId, @orderStatus, @createdDate);
        `;
    await transaction
      .request()
      .input("orderId", orderID)
      .input("orderStatus", 0)
      .input("createdDate", DateNow)
      .query(query);
  } catch (error) {
    console.error("error createOrderTracking");
    throw "Error in createOrderTracking";
  }
}

async function insertOderCodeAndOrderTotal(
  orderID,
  orderCode,
  orderTotal,
  transaction
) {
  try {
    const query = `
            UPDATE [Order]
            SET orderCode = @orderCode, order_total = @orderTotal
            WHERE id = @orderID;
            `;
    await transaction
      .request()
      .input("orderID", orderID)
      .input("orderCode", orderCode)
      .input("orderTotal", orderTotal)
      .query(query);
  } catch (error) {
    console.error("error insertOderCodeAndOrderTotal", error);
    throw "Error in insertOderCodeAndOrderTotal";
  }
}

async function mapCarttoOrderItem(cartID, orderID, userID, transaction) {
  try {
    const query = `
        INSERT INTO Order_item (product_id, orderId, product_name, productSku_id, quantity, price, price_before)
        OUTPUT INSERTED.price, INSERTED.quantity
        SELECT 
        p.id AS product_id,
        @orderId AS orderId,
        p.name,
        ps.id AS productSku_id,
        c.quantity,
        ps.price,
        ps.priceBefore
        FROM Cart c
        JOIN ProductSku ps ON c.idProductSku = ps.id
        JOIN Product p ON ps.idProduct = p.id
        WHERE c.id = @cartID AND c.id_user = @userID;
        `;

    const result = await transaction
      .request()
      .input("orderId", orderID)
      .input("idUser", idUser)
      .input("cartID", cartID)
      .query(query);

    if (result.recordset.length > 0) {
      const price = result.recordset[0].price;
      const quantity = result.recordset[0].quantity;
      return { price, quantity };
    } else {
      throw "Invalid cartID1";
    }
  } catch (error) {
    throw "Invalid cartID";
  }
}

async function mapAddressOrder(
  receiverAddressID,
  orderID,
  transaction,
  idUser
) {
  try {
    const query = `
      INSERT INTO AddressOrder (receiverContactName, receiverPhone, receiverEmail, addressLabel, cityName, districtName, addressDetail, orderId)
      OUTPUT INSERTED.orderId
      SELECT ar.receiverContactName, ar.receiverPhone, ar.receiverEmail, ar.addressLabel, ar.cityName, ar.districtName, ar.addressDetail, @orderId AS orderId,
      FROM AddressReceive ar
      WHERE ar.id_user = @idUser AND ar.id = @receiverAddressID;
    `;

    const result = await transaction
      .request()
      .input("orderId", orderID)
      .input("idUser", idUser)
      .input("receiverAddressID", receiverAddressID)
      .query(query);
  } catch (error) {
    console.error("error mapAddressOrder");
    throw "Invalid receiverAddressID";
  }
}

function removeDuplicates(arr) {
  const seen = {};
  return arr.filter((item) => {
    const isDuplicate = seen.hasOwnProperty(item.cartID);
    seen[item.cartID] = true;
    return !isDuplicate;
  });
}

async function createOrder(idAccount, paymentMethod, transaction, DateNow) {
  try {
    const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
    const userResult = await database
      .request()
      .input("idAccount", idAccount)
      .query(queryUser);

    const query = `
        INSERT INTO [Order] (idUser, paymentMethod, createdDate, orderStatus)
        OUTPUT INSERTED.id
        VALUES (@idUser, @paymentMethod, @createdDate, @orderStatus);
        `;
    const result = await transaction
      .request()
      .input("idUser", userResult.recordset[0].id)
      .input("paymentMethod", paymentMethod)
      .input("createdDate", DateNow)
      .input("orderStatus", 0)
      .query(query);

    const orderID = result.recordset[0].id;
    const idUser = userResult.recordset[0].id;
    return { orderID, idUser };
  } catch (error) {
    throw "Error in createOrder";
  }
}

function generateOrderCode(orderID, DateNow) {
  try {
    const day = String(DateNow.getDate()).padStart(2, "0");
    const month = String(DateNow.getMonth() + 1).padStart(2, "0");
    const year = String(DateNow.getFullYear()).slice(2);

    const orderIDSuffix = String(orderID).slice(-4);

    const orderCode = `HL${year}${month}${day}-${orderIDSuffix}`;
    console.log("orderCode: ", orderCode);
    console.log("oderID: ", orderID);
    return orderCode;
  } catch (error) {
    throw "Error in generateOrderCode";
  }
}

router.get("/get-list", checkAuth, checkRole, async (request, response) => {
  try {
    response.status(200).json();
  } catch (error) {
    // Xử lý lỗi cụ thể
    if (error.code === "EREQUEST") {
      return response.status(500).json({
        error: "",
      });
    }

    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-detail", checkAuth, checkRole, async (request, response) => {
  try {
    response.status(200).json();
  } catch (error) {
    // Xử lý lỗi cụ thể
    if (error.code === "EREQUEST") {
      return response.status(500).json({
        error: "",
      });
    }

    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get(
  "/get-order-status-tracking",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      response.status(200).json();
    } catch (error) {
      // Xử lý lỗi cụ thể
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          error: "",
        });
      }

      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.get(
  "/get-count-list",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      response.status(200).json();
    } catch (error) {
      // Xử lý lỗi cụ thể
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          error: "",
        });
      }

      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.post(
  "/test-update-order-status",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      response.status(200).json();
    } catch (error) {
      // Xử lý lỗi cụ thể
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          error: "",
        });
      }

      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

module.exports = router;
