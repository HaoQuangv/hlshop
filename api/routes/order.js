const express = require("express");
const router = express.Router();
const db_action = require("../../utils/db_action");
const sql = require("mssql");
const database = require("../../config");

const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");
const e = require("express");

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

        await mapAddressOrder(receiverAddressID, orderID, idUser, transaction);

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
          await deleteCartItem(cart.cartID, idUser, transaction);
        }

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
    return {};
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

async function createPaymentOrder(orderID, paymentMethod, transaction) {}

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
    throw "Error in insertOderCodeAndOrderTotal";
  }
}

async function mapCarttoOrderItem(cartID, orderID, userID, transaction) {
  try {
    const query = `
        INSERT INTO Order_item (product_id, orderId, productSku_id, quantity, price, price_before)
        OUTPUT INSERTED.price, INSERTED.quantity
        SELECT 
        p.id AS product_id,
        @orderId AS orderId,
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
      .input("cartID", cartID)
      .input("userID", userID)
      .query(query);
    if (result.recordset.length > 0) {
      const price = result.recordset[0].price;
      const quantity = result.recordset[0].quantity;
      return { price, quantity };
    } else {
      throw "Not Exist cartID";
    }
  } catch (error) {
    throw error;
  }
}

async function mapAddressOrder(
  receiverAddressID,
  orderID,
  userID,
  transaction
) {
  try {
    const query = `
      INSERT INTO AddressOrder (receiverContactName, receiverPhone, receiverEmail, addressLabel, cityName, districtName, addressDetail, orderId)
      OUTPUT INSERTED.receiverContactName
      SELECT receiverContactName, receiverPhone, receiverEmail, addressLabel, cityName, districtName, addressDetail, @orderId AS orderId
      FROM AddressReceive
      WHERE id = @receiverAddressID AND id_user = @userID;
    `;

    const result = await transaction
      .request()
      .input("orderId", orderID)
      .input("receiverAddressID", receiverAddressID)
      .input("userID", userID)
      .query(query);

    if (result.recordset.length === 0) {
      throw "Not Exist receiverAddressID";
    }
  } catch (error) {
    throw error;
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
    return orderCode;
  } catch (error) {
    throw "Error in generateOrderCode";
  }
}

router.get("/get-list", checkAuth, checkRole, async (request, response) => {
  try {
    const { orderStatus } = request.query;
    let dataResponse = [];
    const ListOrder = await getOrderByOrderId(
      orderStatus,
      request.userData.uuid
    );
    for (const order of ListOrder) {
      const orderItemList = await getOrderItemList(order.id);
      let dataOrderItem = [];
      for (const orderItem of orderItemList) {
        await getOrderItem(orderItem.orderItemID).then((result) => {
          dataOrderItem.push(result);
        });
      }
      dataResponse.push({
        dataOrderItem: dataOrderItem,
        orderStatus: orderItemList[0].orderStatus,
        orderCode: orderItemList[0].orderCode,
        orderID: order.id,
        paymentMethod: orderItemList[0].paymentMethod,
      });
    }
    response.status(200).json(dataResponse);
  } catch (error) {
    console.log(error);
    if (error.code === "EREQUEST") {
      return response.status(500).json({
        error: "",
      });
    }

    response.status(500).json({
      error: error,
    });
  }
});
async function getOrderByOrderId(orderStatus, idAccount) {
  try {
    const query = `
    SELECT
    o.id
    FROM [User] AS u
    JOIN [Order] AS o ON u.id = o.idUser
    WHERE u.id_account = @idAccount AND o.orderStatus = @orderStatus
    ORDER BY o.createdDate;
    `;
    const result = await database
      .request()
      .input("idAccount", idAccount)
      .input("orderStatus", orderStatus)
      .query(query);
    console.log(result.recordset);
    return result.recordset;
  } catch (error) {
    throw "Error in getOrderByOrderId";
  }
}
router.get("/get-detail", checkAuth, checkRole, async (request, response) => {
  try {
    const { orderID } = request.query;

    await checkOrderExist(orderID, request.userData.uuid);
    const orderItemList = await getOrderItemList(orderID);
    const addressOrder = await getAddressOrder(orderID);
    let dataOrderItem = [];
    for (const orderItem of orderItemList) {
      await getOrderItem(orderItem.orderItemID).then((result) => {
        dataOrderItem.push(result);
      });
    }
    dataResponse = {
      receiverAddresse: {
        receiverAddressID: addressOrder.receiverAddressID,
        receiverContactName: addressOrder.receiverContactName,
        receiverPhone: addressOrder.receiverPhone,
        receiverEmail: addressOrder.receiverEmail,
        addressLabel: addressOrder.addressLabel,
        cityName: addressOrder.cityName,
        districtName: addressOrder.districtName,
        addressDetail: addressOrder.addressDetail,
      },
      dataOrderItem: dataOrderItem,
      orderStatus: orderItemList[0].orderStatus,
      orderCode: orderItemList[0].orderCode,
      orderID: orderID,
      paymentMethod: orderItemList[0].paymentMethod,
    };
    response.status(200).json(dataResponse);
  } catch (error) {
    console.log(error);
    if (error.code === "EREQUEST") {
      return response.status(500).json({
        error: "",
      });
    }

    response.status(500).json({
      error: error,
    });
  }
});

async function checkOrderExist(orderID, idAccount) {
  try {
    console.log(orderID);
    const query = `
    SELECT
    1
    FROM [User] AS u
    JOIN [Order] AS o ON u.id = o.idUser
    WHERE u.id_account = @idAccount AND o.id = @orderID
    `;
    const result = await database
      .request()
      .input("idAccount", idAccount)
      .input("orderID", orderID)
      .query(query);
    console.log(result.recordset);
    if (result.recordset.length === 0) {
      throw "Error in checkOrderExist";
    }
    return;
  } catch (error) {
    throw "Error in checkOrderExist";
  }
}

async function getAddressOrder(orderID) {
  try {
    const query = `
    SELECT
        ao.id AS receiverAddressID,
        ao.receiverContactName,
        ao.receiverPhone,
        ao.receiverEmail,
        ao.addressLabel,
        ao.cityName,
        ao.districtName,
        ao.addressDetail
    FROM AddressOrder AS ao
    WHERE ao.orderId = @orderID
    `;
    const result = await database
      .request()
      .input("orderID", orderID)
      .query(query);
    return result.recordset[0];
  } catch (error) {
    console.log(error);
    throw "Error in getAddressOrder";
  }
}

async function getOrderItem(orderItemID) {
  try {
    const queryDetailOrderItem = `
    SELECT
    oi.productSku_id AS productSKUID, 
    oi.quantity, 
    oi.price, 
    oi.price_before AS priceBefore,
    p.id AS productID, p.name AS productName,
    p.description AS productDescription,
    ps.idAttributeValue1 AS idAttributeValue1,
    ps.idAttributeValue1 AS idAttributeValue2
    FROM Order_item oi
    JOIN Product p ON oi.product_id = p.id
    JOIN ProductSku ps ON oi.productSku_id = ps.id
    WHERE oi.id = @orderItemID;
    `;
    const resultDetailOrderItem = await database
      .request()
      .input("orderItemID", orderItemID)
      .query(queryDetailOrderItem);
    const productSKU = {
      productSKUID: resultDetailOrderItem.recordset[0].productSKUID,
      idAttributeValue1: resultDetailOrderItem.recordset[0].idAttributeValue1,
      idAttributeValue2: resultDetailOrderItem.recordset[0].idAttributeValue2,
    };
    medias = await db_action.getImageListBySKU(
      resultDetailOrderItem.recordset[0].productID,
      productSKU
    );
    attributes = await db_action.getAttributes(
      resultDetailOrderItem.recordset[0].productID,
      productSKU
    );
    const orderItem = {
      orderItemID: orderItemID,
      productID: resultDetailOrderItem.recordset[0].productID,
      productName: resultDetailOrderItem.recordset[0].productName,
      productDescription: resultDetailOrderItem.recordset[0].productDescription,
      productSKUID: resultDetailOrderItem.recordset[0].productSKUID,
      medias: medias,
      quantity: resultDetailOrderItem.recordset[0].quantity,
      price: resultDetailOrderItem.recordset[0].price,
      priceBefore: resultDetailOrderItem.recordset[0].priceBefore,
      attribute: attributes,
    };
    return orderItem;
  } catch (error) {
    console.log(error);
    throw "Error in getOrderItem";
  }
}
async function getOrderItemList(orderID) {
  try {
    const query = `
    SELECT
    o.id AS orderID,
    o.orderCode,
    o.paymentMethod,
    o.orderStatus,
    oi.id AS orderItemID
    FROM [Order] AS o
    JOIN Order_item AS oi ON o.id = oi.orderId
    WHERE o.id = @orderID;
    `;
    const result = await database
      .request()
      .input("orderID", orderID)
      .query(query);
    return result.recordset;
  } catch (error) {
    throw "Error in getOrderDetail";
  }
}

router.get(
  "/get-order-status-tracking",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const { orderID } = request.query;
      await checkOrderExist(orderID, request.userData.uuid);
      const orderStatusTrackingList = await getListOrderStatusTracking(orderID);
      response.status(200).json(orderStatusTrackingList);
    } catch (error) {
      // Xử lý lỗi cụ thể
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          error: "",
        });
      }

      response.status(500).json({
        error: error,
      });
    }
  }
);

async function getListOrderStatusTracking(orderID) {
  try {
    const query = `
    SELECT
    ot.id AS orderStatusTrackingID,
    ot.orderId AS orderID,
    ot.orderStatus,
    ot.actionDate
    FROM OrderTracking ot
    WHERE ot.orderId = @orderID
    ORDER BY ot.actionDate DESC;
    `;
    const result = await database
      .request()
      .input("orderID", orderID)
      .query(query);
    return result.recordset.map((item) => ({
      orderStatusTrackingID: item.orderStatusTrackingID,
      orderID: item.orderID,
      orderStatus: Number(item.orderStatus), // Chuyển đổi thành số
      actionDate: item.actionDate,
    }));
  } catch (error) {
    throw "Error in getListOrderStatusTracking";
  }
}
//  ORDER_STATUS_NEW : 0,
//   ORDER_STATUS_APPROVED : 1,
//   ORDER_STATUS_PACKING : 2,
//   ORDER_STATUS_ON_DELIVERING : 3,
//   ORDER_STATUS_DELIVERY_SUCCESS : 4,
//   ORDER_STATUS_CUSTOMER_CANCELLED : 5,
//   ORDER_STATUS_SELLER_CANCELLED : 6,
//   ORDER_STATUS_RETURNED : 7,
router.get(
  "/get-count-list",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const responseCount = await countOrders(request.userData.uuid);
      response.status(200).json(responseCount);
    } catch (error) {
      console.log(error);
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

async function countOrders(idAccount) {
  try {
    const query = `
    SELECT
    COUNT(CASE WHEN o.orderStatus = 0 THEN 1 END) AS countNew,
    COUNT(CASE WHEN o.orderStatus = 1 THEN 1 END) AS countApproved,
    COUNT(CASE WHEN o.orderStatus = 2 THEN 1 END) AS countPacking,
    COUNT(CASE WHEN o.orderStatus = 3 THEN 1 END) AS countOnDelivering,
    COUNT(CASE WHEN o.orderStatus = 4 THEN 1 END) AS countDeliverySuccess,
    COUNT(CASE WHEN o.orderStatus = 5 THEN 1 END) AS countCustomerCancelled,
    COUNT(CASE WHEN o.orderStatus = 6 THEN 1 END) AS countSellerCancelled,
    COUNT(CASE WHEN o.orderStatus = 7 THEN 1 END) AS countReturned,
    COUNT(CASE WHEN o.orderStatus = 8 THEN 1 END) AS countCancel
    FROM [User] AS u
    JOIN [Order] AS o ON u.id = o.idUser
    WHERE u.id_account = @idAccount;
    `;
    const result = await database
      .request()
      .input("idAccount", idAccount)
      .query(query);
    return result.recordset[0];
  } catch (error) {
    console.log(error);
    throw "Error in countOrders";
  }
}

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
