const express = require("express");
const axios = require("axios");
const router = express.Router();
const db_action = require("../../utils/db_action");
const { token, getInfoService } = require("../../utils/shipping");
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
        //lay dia chi nguoi nhan
        const [toDistrictID, toWardCode, receiverAddress, idUser] =
          await getAddressReceive(receiverAddressID, request.userData.uuid);
        // tao bang order gom createDate, paymentMethod, userID,
        const { orderID } = await createOrder(
          idUser,
          paymentMethod,
          transaction,
          DateNow,
          receiverAddress
        );

        const orderCode = generateOrderCode(orderID, DateNow);
        let totalItem = 0;
        for (const cart of cartList) {
          const n = await mapCarttoOrderItem(
            cart.cartID,
            orderID,
            idUser,
            transaction
          );
          await deleteCartItem(cart.cartID, idUser, transaction);
          totalItem += n;
        }

        var fee = await getFeeOrder(toDistrictID, toWardCode, totalItem);
        const totalOrder = totalItem + Number(fee);
        feeJson = { shippingFee: fee };
        feeText = JSON.stringify(feeJson);
        await insertOderCode(
          orderID,
          orderCode,
          transaction,
          feeText,
          totalOrder
        );
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
    console.log(error);
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

async function getFeeOrder(toDistrictID, toWardCode, insuranceValue) {
  try {
    const serviceID = await getInfoService(toDistrictID);
    const apiUrl =
      "https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee";
    const requestBody = {
      service_id: Number(serviceID),
      insurance_value: Number(insuranceValue),
      coupon: null,
      from_district_id: 3695,
      to_district_id: Number(toDistrictID),
      to_ward_code: toWardCode.toString(),
      height: 15,
      length: 15,
      weight: 400,
      width: 15,
    };
    const headers = {
      token: token,
      contentType: "application/json",
    };
    const response = await axios.post(apiUrl, requestBody, { headers });
    var feeShip = response.data.data.total;
    console.log("feeShip", feeShip);
    return feeShip;
  } catch (error) {
    throw error;
  }
}

async function getAddressReceive(receiverAddressID, idAccount) {
  try {
    const query = `
    SELECT
    ar.id AS receiverAddressID,
    ar.receiverContactName,
    ar.receiverPhone,
    ar.receiverEmail,
    ar.addressLabel,
    ar.cityName,
    ar.districtName,
    ar.addressDetail,
    ar.cityID,
    ar.districtID,
    ar.wardID,
    ar.wardName,
    u.id AS userID
    FROM [User] AS u
    JOIN AddressReceive AS ar ON u.id = ar.id_user
    WHERE ar.id = @receiverAddressID AND u.id_account = @idAccount;
    `;
    const result = await database
      .request()
      .input("receiverAddressID", receiverAddressID)
      .input("idAccount", idAccount)
      .query(query);
    if (result.recordset.length === 0) {
      throw "Not Exist receiverAddressID";
    } else {
      var addressToText = JSON.stringify(result.recordset[0]);
      return [
        result.recordset[0].districtID,
        result.recordset[0].wardID,
        addressToText,
        result.recordset[0].userID,
      ];
    }
  } catch (error) {
    throw error;
  }
}

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

async function insertOderCode(
  orderID,
  orderCode,
  transaction,
  fee,
  totalOrder
) {
  try {
    const query = `
            UPDATE [Order]
            SET orderCode = @orderCode,
            totalPriceOrder = @totalPriceOrder,
            orderShippingFee = @orderShippingFee
            WHERE id = @orderID;
            `;
    await transaction
      .request()
      .input("orderID", orderID)
      .input("orderCode", orderCode)
      .input("totalPriceOrder", totalOrder)
      .input("orderShippingFee", fee)
      .query(query);
  } catch (error) {
    throw "Error in insertOderCodeAndOrderTotal";
  }
}

async function mapCarttoOrderItem(cartID, orderID, userID, transaction) {
  try {
    const query = `
        INSERT INTO Order_item (product_id, orderId, productSku_id, quantity, price, price_before)
        OUTPUT INSERTED.id, INSERTED.productSku_id, INSERTED.quantity, INSERTED.price, INSERTED.price_before, INSERTED.product_id
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
      const queryGetSku = `
            SELECT
            ps.id AS productSku_id,
            ps.idAttributeValue1 AS idAttributeValue1,
            ps.idAttributeValue2 AS idAttributeValue2,
						p.name,
						p.description
            FROM Product p
						JOIN ProductSku ps ON p.id = ps.idProduct
            WHERE ps.id = @productSkuID;
            `;
      const resultGetSku = await transaction
        .request()
        .input("productSkuID", result.recordset[0].productSku_id)
        .query(queryGetSku);
      const productSKU = {
        productSKUID: result.recordset[0].productSku_id,
        idAttributeValue1: resultGetSku.recordset[0].idAttributeValue1,
        idAttributeValue2: resultGetSku.recordset[0].idAttributeValue2,
      };
      medias = await db_action.getImageListBySKU(
        result.recordset[0].product_id,
        productSKU
      );
      attributes = await db_action.getAttributes(
        result.recordset[0].product_id,
        productSKU
      );
      const orderItem = {
        orderItemID: result.recordset[0].id,
        productID: result.recordset[0].product_id,
        productName: resultGetSku.recordset[0].name,
        productDescription: resultGetSku.recordset[0].description,
        productSKUID: result.recordset[0].productSku_id,
        medias: medias,
        quantity: result.recordset[0].quantity,
        price: result.recordset[0].price,
        priceBefore: result.recordset[0].price_before,
        attribute: attributes,
      };
      const queryUpdateOrderItem = `
            UPDATE Order_item
            SET orderItemJsonToString = @orderItemJsonToString
            WHERE id = @orderItemID;
            `;
      await transaction
        .request()
        .input("orderItemJsonToString", JSON.stringify(orderItem))
        .input("orderItemID", orderItem.orderItemID)
        .query(queryUpdateOrderItem);
      console.log(result.recordset[0]);
      return result.recordset[0].price * result.recordset[0].quantity;
    } else {
      throw "Not Exist cartID";
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

async function createOrder(
  idUser,
  paymentMethod,
  transaction,
  DateNow,
  receiverAddress
) {
  try {
    const query = `
        INSERT INTO [Order] (idUser, paymentMethod, createdDate, orderStatus, receiverAddress)
        OUTPUT INSERTED.id
        VALUES (@idUser, @paymentMethod, @createdDate, @orderStatus, @receiverAddress);
        `;
    const result = await transaction
      .request()
      .input("idUser", idUser)
      .input("paymentMethod", paymentMethod)
      .input("createdDate", DateNow)
      .input("orderStatus", 0)
      .input("receiverAddress", receiverAddress)
      .query(query);

    const orderID = result.recordset[0].id;
    return { orderID };
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
    const ListOrder = await getListOrderByStatus(
      orderStatus,
      request.userData.uuid
    );
    response.status(200).json(ListOrder);
  } catch (error) {
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
async function getListOrderByStatus(orderStatus, idAccount) {
  try {
    const query = `
          SELECT
          o.id AS orderID,
          o.orderCode,
          o.paymentMethod,
          o.orderStatus,
          o.orderShippingFee,
          oi.orderItemJsonToString AS dataOrderItem
          FROM [User] AS u
          JOIN [Order] AS o ON u.id = o.idUser
          JOIN Order_item AS oi ON oi.orderId = o.id
          WHERE u.id_account = @idAccount AND o.orderStatus = @orderStatus
          ORDER BY o.createdDate DESC;
          `;
    const result = await database
      .request()
      .input("idAccount", idAccount)
      .input("orderStatus", orderStatus)
      .query(query);
    const resultMap = {};

    result.recordset.forEach((item) => {
      const { orderID, dataOrderItem, orderShippingFee, ...rest } = item;

      let parsedOrderShippingFee;
      try {
        parsedOrderShippingFee = JSON.parse(orderShippingFee);
      } catch (error) {
        parsedOrderShippingFee = {};
      }

      if (resultMap[orderID]) {
        resultMap[orderID].dataOrderItem.push(JSON.parse(dataOrderItem));
      } else {
        resultMap[orderID] = {
          orderID,
          dataOrderItem: [JSON.parse(dataOrderItem)],
          orderShippingFee: parsedOrderShippingFee,
          ...rest,
        };
      }
    });

    const resultArray = Object.values(resultMap);
    return resultArray;
  } catch (error) {
    throw "Error in getOrderId";
  }
}
router.get("/get-detail", checkAuth, checkRole, async (request, response) => {
  try {
    const { orderID } = request.query;

    await checkOrderExist(orderID, request.userData.uuid);
    const orderItemList = await getOrderDetailByID(orderID);
    response.status(200).json(orderItemList);
  } catch (error) {
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
    if (result.recordset.length === 0) {
      throw "Error in checkOrderExist";
    }
    return;
  } catch (error) {
    throw "Error in checkOrderExist";
  }
}

async function getOrderDetailByID(orderID) {
  try {
    const query = `
    SELECT
    o.receiverAddress,
    o.id AS orderID,
    o.orderCode,
    o.paymentMethod,
    o.orderStatus,
    o.orderShippingFee,
    oi.orderItemJsonToString AS dataOrderItem
    FROM [Order] AS o
    JOIN Order_item AS oi ON o.id = oi.orderId
    WHERE o.id = @orderID;
    `;
    const result = await database
      .request()
      .input("orderID", orderID)
      .query(query);

    const resultMap = {};

    result.recordset.forEach((item) => {
      const {
        receiverAddress,
        orderID,
        dataOrderItem,
        orderShippingFee,
        ...rest
      } = item;

      // Chuyển đổi chuỗi JSON thành đối tượng JSON
      const parsedOrderShippingFee = JSON.parse(orderShippingFee);

      if (resultMap[orderID]) {
        resultMap[orderID].dataOrderItem.push(JSON.parse(dataOrderItem));
      } else {
        resultMap[orderID] = {
          receiverAddresse: JSON.parse(receiverAddress),
          orderID,
          dataOrderItem: [JSON.parse(dataOrderItem)],
          orderShippingFee: parsedOrderShippingFee,
          ...rest,
        };
      }
    });
    const resultArray = Object.values(resultMap);
    return resultArray[0];
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

router.get("/test", checkAuth, checkRole, async (request, response) => {
  try {
    response.status(200).json();
  } catch (error) {
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

module.exports = router;
