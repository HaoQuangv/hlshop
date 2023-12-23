const crypto = require("crypto");

const axios = require("axios");

async function createMomoPayment(orderId, amount) {
  const accessKey = "klm05TvNBzhg7h7j";
  const secretKey = "at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa";
  const partnerCode = "MOMOBKUN20180529";
  const requestId = "RD" + orderId + Date.now();
  const lang = "vi";
  const orderInfo = "Thanh toán hóa đơn của HLSHOP: " + orderId;
  const redirectUrl =
    "https://hl-shop.azurewebsites.net/api/hlshop/order/payment-success"; //(172.20.10.3) thay cho localhost
  const ipnUrl =
    "https://hl-shop.azurewebsites.net/api/hlshop/order/payment-success"; //172.20.10.3
  const requestType = "captureWallet";
  const extraData = "";

  const signature = generateSignature({
    accessKey,
    amount,
    extraData,
    ipnUrl,
    orderId,
    orderInfo,
    partnerCode,
    redirectUrl,
    requestId,
    requestType,
    secretKey,
  });

  const requestBody = {
    partnerCode,
    requestId,
    orderId,
    amount,
    lang,
    orderInfo,
    redirectUrl,
    ipnUrl,
    requestType,
    extraData,
    signature,
  };

  try {
    const response = await axios.post(
      "https://test-payment.momo.vn/gateway/api/developer-web/init",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const resultData = {
      signature: signature,
      orderId: response.data.orderId,
      requestId: response.data.requestId,
      amount: response.data.amount,
      resultCode: response.data.resultCode,
      payUrl: response.data.payUrl,
      qrCodeUrl: response.data.qrCodeUrl,
      deeplink: response.data.deeplink,
    };
    return resultData;
  } catch (error) {
    throw error;
  }
}

function generateSignature({
  accessKey,
  amount,
  extraData,
  ipnUrl,
  orderId,
  orderInfo,
  partnerCode,
  redirectUrl,
  requestId,
  requestType,
  secretKey,
}) {
  const rawSignature =
    "accessKey=" +
    accessKey +
    "&amount=" +
    amount +
    "&extraData=" +
    extraData +
    "&ipnUrl=" +
    ipnUrl +
    "&orderId=" +
    orderId +
    "&orderInfo=" +
    orderInfo +
    "&partnerCode=" +
    partnerCode +
    "&redirectUrl=" +
    redirectUrl +
    "&requestId=" +
    requestId +
    "&requestType=" +
    requestType;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");
  return signature;
}

async function refundOrderPayment(amount, transId, orderIdOrder, requestId) {
  var secretKey = "at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa";
  var accessKey = "klm05TvNBzhg7h7j";
  var orderId = orderIdOrder + "79";
  var description = "hoan tien hoa don: " + orderId;
  var partnerCode = "MOMOBKUN20180529";

  console.log("refundOrderPayment");
  console.log("accessKey", accessKey);
  console.log("amount", amount);
  console.log("description", description);
  console.log("orderId", orderId);
  console.log("partnerCode", partnerCode);
  console.log("requestId", requestId);
  console.log("transId", transId);

  var rawSignature =
    "accessKey=" +
    accessKey +
    "&amount=" +
    amount +
    "&description=" +
    description +
    "&orderId=" +
    orderId +
    "&partnerCode=" +
    partnerCode +
    "&requestId=" +
    requestId +
    "&transId=" +
    transId;

  const crypto = require("crypto");
  var signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const requestBody = JSON.stringify({
    partnerCode: partnerCode,
    orderId: orderId,
    requestId: requestId,
    amount: Number(amount),
    transId: Number(transId),
    lang: "vi",
    description: description,
    signature: signature,
  });

  try {
    const response = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/refund",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.resultCode != 0) {
      throw "refundOrderPayment error";
    }

    const resultData = {
      orderId: response.data.orderId,
      requestId: response.data.requestId,
      amount: response.data.amount,
      transId: response.data.transId,
      resultCode: response.data.resultCode,
      message: response.data.message,
      responseTime: response.data.responseTime,
      signature: response.data.signature,
    };
    console.log("refundOrderPayment success", resultData);
    return resultData;
  } catch (error) {
    throw error;
  }
}
module.exports = {
  createMomoPayment,
  refundOrderPayment,
};
