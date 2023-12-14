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

module.exports = {
  createMomoPayment,
};
