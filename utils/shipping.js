const axios = require("axios");

const token = "23480bbd-8962-11ee-b394-8ac29577e80e";

async function getInfoService(to_district) {
  try {
    const apiUrl =
      "https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/available-services";
    const requestBody = {
      shop_id: 4716763,
      from_district: 3695,
      to_district: Number(to_district),
    };
    const headers = {
      token: token,
      contentType: "application/json",
    };

    const response = await axios.post(apiUrl, requestBody, { headers });

    const firstServiceId =
      response.data.data.length > 0 ? response.data.data[0].service_id : null;

    return firstServiceId;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  token,
  getInfoService,
};
