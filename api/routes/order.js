const express = require("express");
const app = require("../../index");
const axios = require("axios");
const router = express.Router();
const db_action = require("../../utils/db_action");
const { token, getInfoService } = require("../../utils/shipping");
const { createMomoPayment } = require("../../utils/momo_payment");
const sql = require("mssql");
const database = require("../../config");

const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");
const checkRoleAdmin = require("../../middleware/check_role_admin");

const { get } = require("./account");

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
        await createPaymentOrder(orderID, totalOrder, DateNow, transaction);

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
        message: "Database error",
      });
    }
    if (error.code === "EABORT") {
      return response.status(500).json({
        message: "Invalid input data",
      });
    }
    response.status(500).json({
      message: error,
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

async function createPaymentOrder(orderID, amount, created, transaction) {
  try {
    const query = `
        INSERT INTO Payment_order (orderId, amount, created, finish_pay)
        VALUES (@orderID, @amount, @created, @finish_pay);
        `;
    await transaction
      .request()
      .input("orderID", orderID)
      .input("amount", amount)
      .input("created", created)
      .input("finish_pay", 0)
      .query(query);
  } catch (error) {
    throw "Error in createPaymentOrder";
  }
}

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

async function createOrderTracking(
  orderID,
  transaction,
  DateNow,
  orderStatus = 0
) {
  try {
    const query = `
        INSERT INTO OrderTracking (orderId, orderStatus, actionDate)
        VALUES (@orderId, @orderStatus, @createdDate);
        `;
    await transaction
      .request()
      .input("orderId", orderID)
      .input("orderStatus", orderStatus)
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
      message: error,
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
          po.finish_pay AS finishPay,
          oi.orderItemJsonToString AS dataOrderItem
          FROM [User] AS u
          JOIN [Order] AS o ON u.id = o.idUser
          LEFT JOIN Order_item AS oi ON oi.orderId = o.id
          LEFT JOIN Payment_order AS po ON po.orderId = o.id
          LEFT JOIN OrderTracking AS ot ON o.id = ot.orderId
          WHERE
          u.id_account = @idAccount AND o.orderStatus = @orderStatus
          ORDER BY COALESCE(ot.actionDate, o.createdDate) DESC;
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

      let parsedDataOrderItem;
      try {
        parsedDataOrderItem = JSON.parse(dataOrderItem);
      } catch (error) {
        parsedDataOrderItem = null;
      }

      if (resultMap[orderID]) {
        const existingDataItem = resultMap[orderID].dataOrderItem.find(
          (existingItem) =>
            JSON.stringify(existingItem) === JSON.stringify(parsedDataOrderItem)
        );

        if (!existingDataItem) {
          resultMap[orderID].dataOrderItem.push(parsedDataOrderItem);
        }
      } else {
        resultMap[orderID] = {
          orderID,
          dataOrderItem: parsedDataOrderItem ? [parsedDataOrderItem] : [],
          orderShippingFee: parsedOrderShippingFee,
          ...rest,
        };
      }
    });

    // result.recordset.forEach((item) => {
    //   const { orderID, dataOrderItem, orderShippingFee, ...rest } = item;

    //   let parsedOrderShippingFee;
    //   try {
    //     parsedOrderShippingFee = JSON.parse(orderShippingFee);
    //   } catch (error) {
    //     parsedOrderShippingFee = {};
    //   }
    //   if (resultMap[orderID]) {
    //     if (
    //       !resultMap[orderID].dataOrderItem.includes(JSON.parse(dataOrderItem))
    //     ) {
    //       resultMap[orderID].dataOrderItem.push(JSON.parse(dataOrderItem));
    //     }
    //   } else {
    //     resultMap[orderID] = {
    //       orderID,
    //       dataOrderItem: [JSON.parse(dataOrderItem)],
    //       orderShippingFee: parsedOrderShippingFee,
    //       ...rest,
    //     };
    //   }
    // });

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
      message: error,
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
    po.finish_pay AS finishPay,
    oi.orderItemJsonToString AS dataOrderItem
    FROM [Order] AS o
    JOIN Order_item AS oi ON o.id = oi.orderId
		LEFT JOIN Payment_order AS po ON po.orderId = o.id
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
        message: error,
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
        message: "Không thể lấy số lượng đơn hàng",
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

router.get("/payment-success", async (req, res) => {
  // Lấy dữ liệu từ request
  const {
    partnerCode,
    orderId,
    requestId,
    amount,
    orderInfo,
    orderType,
    transId,
    resultCode,
    message,
    payType,
    responseTime,
    extraData,
    signature,
    paymentOption,
  } = req.query;
  try {
    const paymentOrder = await getPaymentOrderbyOrderID(orderId);
    if (
      paymentOrder.finishPay === true ||
      paymentOrder.amount.toString() !== amount ||
      message !== "Successful." ||
      resultCode !== "0" ||
      paymentOrder.requestId !== requestId
    ) {
      throw "Error in payment confirm";
    }
    await updatePaymentOrderFinishPay(orderId);
    res.render("payment-success", {
      orderId: orderId,
      amount: amount,
    });
  } catch (error) {
    res.status(500).render("payment-error", {
      message: error,
    });
  }
});

async function updatePaymentOrderFinishPay(orderID) {
  try {
    const query = `
        UPDATE Payment_order
        SET finish_pay = @finishPay
        WHERE orderId = @orderID;
    `;
    await database
      .request()
      .input("orderID", orderID)
      .input("finishPay", true)
      .query(query);
  } catch (error) {
    throw "Error in payment confirm";
  }
}

async function getPaymentOrderbyOrderID(orderID, idAccount) {
  try {
    const query = `
    SELECT
    po.orderId,
    po.requestId,
    po.amount,
    po.signature,
    po.finish_pay AS finishPay
    FROM Payment_order AS po
    WHERE po.orderId = @orderID;
    `;
    const result = await database
      .request()
      .input("orderID", orderID)
      .query(query);
    if (result.recordset.length === 0) {
      throw "Error in payment confirm";
    }
    return result.recordset[0];
  } catch (error) {
    throw error;
  }
}

router.post(
  "/create-order-qr-payment-momo",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const { orderID } = request.query;
      const DateNow = new Date();
      const orderDetail = await getOrderPayment(orderID, request.userData.uuid);
      const isExpired = isCreatedLinkExpired(orderDetail.createdLink);
      if (
        orderDetail.paymentMethod !== 1 ||
        orderDetail.finishPay !== false ||
        orderDetail.orderStatus !== 0
      ) {
        throw "Payment method is not momo or order is paid";
      } else {
        if (orderDetail.deeplink !== null && !isExpired) {
          let result = {
            orderId: orderDetail.orderId,
            createdLink: orderDetail.createdLink,
            deeplink: orderDetail.deeplink,
          };
          response.status(200).json(result);
          return;
        } else {
          var momoPaymentResult = await createMomoPayment(
            orderDetail.orderID,
            Number(orderDetail.amount)
          );
          if (momoPaymentResult.resultCode === 0) {
            //goi ham update
            await updatePaymentOrder(
              momoPaymentResult.orderId,
              momoPaymentResult.requestId,
              momoPaymentResult.payUrl,
              momoPaymentResult.qrCodeUrl,
              momoPaymentResult.deeplink,
              DateNow,
              momoPaymentResult.signature
            );
          }
          let result = {
            orderId: momoPaymentResult.orderId,
            createdLink: DateNow,
            deeplink: momoPaymentResult.deeplink,
          };
          response.status(200).json(result);
        }
      }
    } catch (error) {
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          message: "",
        });
      }

      response.status(500).json({
        message: error,
      });
    }
  }
);
function isCreatedLinkExpired(createdLink) {
  const currentDate = new Date();
  const createdLinkDate = new Date(createdLink);
  const timeDifference = currentDate - createdLinkDate;
  const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
  return daysDifference >= 7;
}
async function updatePaymentOrder(
  orderID,
  requestId,
  payUrl,
  qrCodeUrl,
  deeplink,
  createdLink,
  signature
) {
  try {
    const query = `
        UPDATE Payment_order
        SET payUrl = @payUrl,
        requestId = @requestId,
        qrCodeUrl = @qrCodeUrl,
        deeplink = @deeplink,
        createdLink = @createdLink,
        signature = @signature
        WHERE orderId = @orderID;
    `;
    await database
      .request()
      .input("orderID", orderID)
      .input("requestId", requestId)
      .input("payUrl", payUrl)
      .input("qrCodeUrl", qrCodeUrl)
      .input("deeplink", deeplink)
      .input("createdLink", createdLink)
      .input("signature", signature)
      .query(query);
  } catch (error) {
    throw "Error in updatePaymentOrder";
  }
}

async function getOrderPayment(orderID, idAccount) {
  try {
    const query = `
    SELECT
    o.id AS orderID,
    o.paymentMethod,
    o.orderStatus,
    o.totalPriceOrder,
		po.amount,
		po.orderId,
		po.deeplink,
    po.finish_pay AS finishPay,
		po.createdLink
    FROM [User] AS u
    JOIN [Order] AS o ON u.id = o.idUser
    LEFT JOIN Payment_order AS po ON o.id = po.orderId
    WHERE u.id_account = @idAccount AND o.id = @orderID;
    `;
    const result = await database
      .request()
      .input("idAccount", idAccount)
      .input("orderID", orderID)
      .query(query);
    if (result.recordset.length === 0) {
      throw "Order not exist";
    }
    return result.recordset[0];
  } catch (error) {
    throw error;
  }
}

router.post(
  "/user-update-order-status",
  checkAuth,
  checkRole,
  async (request, response) => {
    let transaction = new sql.Transaction(database);
    try {
      const { orderID, orderStatus } = request.body;
      const now = new Date();
      const [currentOrderStatus, finishPay] =
        await checkOrderExistAndGetCurrentStatusAndFinishPay(
          orderID,
          request.userData.uuid
        );
      await transaction
        .begin()
        .then(async () => {
          if (
            currentOrderStatus === 0 ||
            currentOrderStatus === 3 ||
            currentOrderStatus === 4 ||
            orderStatus === 4 ||
            orderStatus === 7 ||
            orderStatus === 5
          ) {
            if (
              currentOrderStatus === 0 &&
              orderStatus === 5 &&
              finishPay === false
            ) {
              // huy don hang
              await updateOrderStatus(orderID, orderStatus, transaction);
              await createOrderTracking(orderID, transaction, now, orderStatus);
              //xoa payment order
            } else if (currentOrderStatus === 3 && orderStatus === 4) {
              // nhan hang
              await updateOrderStatus(orderID, orderStatus), transaction;
              await createOrderTracking(orderID, transaction, now, orderStatus);
            } else if (currentOrderStatus === 4 && orderStatus === 7) {
              // tra hang
              await updateOrderStatus(orderID, orderStatus, transaction);
              await createOrderTracking(orderID, transaction, now, orderStatus);
            } else {
              throw "Invalid order status";
            }
          } else {
            throw "Invalid order status";
          }
          await transaction.commit();
          response.status(200).json({
            message: "Update order status success",
          });
        })
        .catch(async (err) => {
          await transaction.rollback();
          throw err;
        });
    } catch (error) {
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          message: error,
        });
      }
      response.status(500).json({
        message: error,
      });
    }
  }
);

async function updateOrderStatus(orderID, orderStatus, transaction) {
  try {
    console.log(orderID, orderStatus);
    const query = `
        UPDATE [Order]
        SET orderStatus = @orderStatus
        WHERE id = @orderID;
        `;
    await transaction
      .request()
      .input("orderID", orderID)
      .input("orderStatus", orderStatus)
      .query(query);
  } catch (error) {
    console.log(error);
    throw "Error in updateOrderStatus";
  }
}

async function checkOrderExistAndGetCurrentStatusAndFinishPay(
  orderID,
  idAccount
) {
  try {
    const query = `
    SELECT
    o.orderStatus,
    po.finish_pay AS finishPay
    FROM [User] AS u
    JOIN [Order] AS o ON u.id = o.idUser
    LEFT JOIN Payment_order AS po ON o.id = po.orderId
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
    return [result.recordset[0].orderStatus, result.recordset[0].finishPay];
  } catch (error) {
    throw error;
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

router.post(
  "/admin-update-order-status",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    let transaction = new sql.Transaction(database);
    try {
      const { orderID, orderStatus } = request.body;
      const now = new Date();
      const [currentOrderStatus, finishPay, paymentMethod] =
        await checkOrderExistAndGetCurrentStatusAndFinishPayAdmin(orderID);
      await transaction
        .begin()
        .then(async () => {
          switch (currentOrderStatus) {
            case 0:
              switch (orderStatus) {
                case 1:
                  if (
                    paymentMethod === 0 ||
                    (finishPay === true && paymentMethod === 1)
                  ) {
                    // duyet don hang
                    await updateOrderStatus(orderID, orderStatus, transaction);
                    await createOrderTracking(
                      orderID,
                      transaction,
                      now,
                      orderStatus
                    );
                  } else if (finishPay === false && paymentMethod === 1) {
                    throw "Don hang chua thanh toan bang momo";
                  }
                  break;
                case 6:
                  if (finishPay === false) {
                    // huy don hang
                    await updateOrderStatus(orderID, orderStatus, transaction);
                    await createOrderTracking(
                      orderID,
                      transaction,
                      now,
                      orderStatus
                    );
                  }
                  break;
                default:
                  throw "Invalid order status";
              }
              break;
            case 1:
              if (orderStatus === 2) {
                // chuyen trang thai dong goi
                await updateOrderStatus(orderID, orderStatus, transaction);
                await createOrderTracking(
                  orderID,
                  transaction,
                  now,
                  orderStatus
                );
              } else {
                throw "Invalid order status";
              }
              break;
            case 2:
              if (orderStatus === 3) {
                // chuyen trang thai giao hang
                await updateOrderStatus(orderID, orderStatus, transaction);
                await createOrderTracking(
                  orderID,
                  transaction,
                  now,
                  orderStatus
                );
              } else {
                throw "Invalid order status";
              }
              break;
            case 3:
              if (orderStatus === 4 || orderStatus === 7) {
                // chuyen trang thai giao hang thanh cong sau 10 ngay, hoac tra hang khi giao hang that bai
                await updateOrderStatus(orderID, orderStatus, transaction);
                await createOrderTracking(
                  orderID,
                  transaction,
                  now,
                  orderStatus
                );
              } else {
                throw "Invalid order status";
              }
              break;
            default:
              throw "Invalid order status";
          }
          await transaction.commit();
          response.status(200).json({
            message: "Update order status success",
          });
        })
        .catch(async (err) => {
          await transaction.rollback();
          throw err;
        });
    } catch (error) {
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          message: "",
        });
      }
      response.status(500).json({
        message: error,
      });
    }
  }
);

async function checkOrderExistAndGetCurrentStatusAndFinishPayAdmin(orderID) {
  try {
    const query = `
    SELECT
    o.orderStatus,
    po.finish_pay AS finishPay,
    o.paymentMethod
    FROM [Order] AS o
    LEFT JOIN Payment_order AS po ON o.id = po.orderId
    WHERE o.id = @orderID
    `;
    const result = await database
      .request()
      .input("orderID", orderID)
      .query(query);
    console.log(result.recordset);
    if (result.recordset.length === 0) {
      throw "Error in checkOrderExist";
    }
    return [
      result.recordset[0].orderStatus,
      result.recordset[0].finishPay,
      result.recordset[0].paymentMethod,
    ];
  } catch (error) {
    throw error;
  }
}

module.exports = router;
