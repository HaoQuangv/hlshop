const express = require("express");
const router = express.Router();
require("dotenv").config();
const database = require("../../config");
const sql = require("mssql");

const checkAuth = require("../../middleware/check_auth");
const checkRoleAdmin = require("../../middleware/check_role_admin");

router.get(
  "/get-list",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
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
  }
);
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
          FROM [Order] AS o
          LEFT JOIN Order_item AS oi ON oi.orderId = o.id
          LEFT JOIN Payment_order AS po ON po.orderId = o.id
          LEFT JOIN OrderTracking AS ot ON o.id = ot.orderId
          WHERE o.orderStatus = @orderStatus
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

    const resultArray = Object.values(resultMap);
    return resultArray;
  } catch (error) {
    throw "Error in getOrderId";
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
      const orderID = request.query.orderID;
      const orderStatus = Number(request.query.orderStatus);
      const now = new Date();
      const [currentOrderStatus, finishPay, paymentMethod, actionDate] =
        await checkOrderExistAndGetCurrentStatusAndFinishPayAdmin(orderID);
      const checkExpired = checkExpiredOrder(actionDate);
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
              if (orderStatus === 4 && checkExpired) {
                // chuyen trang thai giao hang thanh cong sau 10 ngay
                await updateOrderStatus(orderID, orderStatus, transaction);
                await createOrderTracking(
                  orderID,
                  transaction,
                  now,
                  orderStatus
                );
              } else if (orderStatus === 4 && !checkExpired) {
                throw "Chua het han 10 ngay";
              } else if (orderStatus === 7) {
                //tra hang khi giao hang that bai
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
          errorCode: "EREQUEST",
        });
      }
      response.status(500).json({
        errorCode: error,
      });
    }
  }
);

function checkExpiredOrder(actionDate) {
  const currentDate = new Date();
  const actionDateDate = new Date(actionDate);
  const timeDifference = currentDate - actionDateDate;
  const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
  console.log("daysDifference: " + daysDifference);
  return daysDifference >= 10;
}

async function checkOrderExistAndGetCurrentStatusAndFinishPayAdmin(orderID) {
  try {
    const query = `
    SELECT
    o.orderStatus,
    po.finish_pay AS finishPay,
    o.paymentMethod,
    ot.actionDate
    FROM [Order] AS o
    LEFT JOIN Payment_order AS po ON o.id = po.orderId
    LEFT JOIN OrderTracking AS ot ON o.id = ot.orderId
    WHERE o.id = @orderID
    ORDER BY ot.actionDate DESC;
    `;
    const result = await database
      .request()
      .input("orderID", orderID)
      .query(query);
    if (result.recordset.length === 0) {
      throw "Error in checkOrderExist";
    }
    return [
      result.recordset[0].orderStatus,
      result.recordset[0].finishPay,
      result.recordset[0].paymentMethod,
      result.recordset[0].actionDate,
    ];
  } catch (error) {
    throw error;
  }
}

module.exports = router;
