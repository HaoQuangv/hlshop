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
      const { receiverAddressID, insuranceValue } = req.body;
      const [toDistrictID, toWardCode] = await getIdDistrictAndWardCode(
        receiverAddressID,
        req.userData.uuid
      );
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
