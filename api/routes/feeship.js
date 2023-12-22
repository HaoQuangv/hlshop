const express = require("express");
const { token, getInfoService } = require("../../utils/shipping");
const axios = require("axios");
const router = express.Router();
const database = require("../../config");

const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");

router.get(
  "/get-shipping-order-fee",
  checkAuth,
  checkRole,
  async (req, res) => {
    try {
      const { receiverAddressID, insuranceValue, carts } = req.body;
      const resultMap = {};
      for (const cart of carts) {
        const itemCartSize = await getSizeItem(cart.cartID);
        resultMap[cart.cartID] = itemCartSize;
      }
      const resultArray = Object.values(resultMap);
      console.log(resultArray);
      const totalWeight = resultArray.reduce(
        (total, item) => total + item.weight * item.quantity,
        0
      );
      const [totalHeight, totalLength, totalWidth] =
        processArraySize(resultArray);
      const [toDistrictID, toWardCode] = await getIdDistrictAndWardCode(
        receiverAddressID,
        req.userData.uuid
      );
      console.log("totalWeight", totalWeight);
      console.log("totalHeight", totalHeight);
      console.log("totalLength", totalLength);
      console.log("totalWidth", totalWidth);
      console.log("insuranceValue", insuranceValue);
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
        height: Number(totalHeight),
        length: Number(totalLength),
        weight: Number(totalWeight),
        width: Number(totalWidth),
      };

      // Thêm token vào header
      const headers = {
        token: token,
        contentType: "application/json",
      };
      const response = await axios.post(apiUrl, requestBody, { headers });
      var feeShip = response.data.data.total;
      res.json({ shippingFee: feeShip });
    } catch (error) {
      res.status(500).json({ error: "Lỗi khi gọi API gốc" });
    }
  }
);

function processArraySize(array) {
  var x = 0;
  var V = array.reduce(
    (total, item) =>
      total + item.height * item.length * item.width * item.quantity,
    0
  );
  console.log("V order: ", V);
  array.forEach((item) => {
    x = Math.max(x, item.height);
    x = Math.max(x, item.length);
    x = Math.max(x, item.width);
  });

  var S = V / x;
  height = x;
  length = Math.round(Math.sqrt(S));
  width = Math.round(S / length);

  return [height, length, width];
}

async function getSizeItem(cartID) {
  try {
    const query = `
    SELECT
    c.id AS cartItemID,
    c.quantity AS QuantityCartItem,
    ps.idProduct AS ProductID,
    p.height AS ProductHeight,
    p.length AS ProductLength,
    p.width AS ProductWidth,
    p.weight AS ProductWeight
    FROM Cart AS c
    JOIN ProductSku AS ps ON c.idProductSku = ps.id
    JOIN Product AS p ON ps.idProduct = p.id
    WHERE c.id = @cartID;
    `;
    const result = await database
      .request()
      .input("cartID", cartID)
      .query(query);
    if (result.recordset.length === 0) {
      throw "Not Exist cartID";
    } else {
      return {
        cartItemID: result.recordset[0].cartItemID,
        quantity: result.recordset[0].QuantityCartItem,
        productID: result.recordset[0].ProductID,
        height: result.recordset[0].ProductHeight,
        length: result.recordset[0].ProductLength,
        width: result.recordset[0].ProductWidth,
        weight: result.recordset[0].ProductWeight,
      };
    }
  } catch (error) {
    throw error;
  }
}

async function getIdDistrictAndWardCode(receiverAddressID, idAccount) {
  try {
    const query = `
    SELECT
    ar.districtID,
    ar.wardID
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
      return [result.recordset[0].districtID, result.recordset[0].wardID];
    }
  } catch (error) {
    throw error;
  }
}

module.exports = router;
