const axios = require("axios");
const { token } = require("../utils/shipping");

async function checkAddressValidated(cityID, districtID, wardID) {
  try {
    const apiUrlDistrict =
      "https://online-gateway.ghn.vn/shiip/public-api/master-data/district";
    const requestBodyDistrict = {
      province_id: parseInt(cityID),
    };

    const headers = {
      token: token,
      contentType: "application/json",
    };

    const responseDistrict = await axios.post(
      apiUrlDistrict,
      requestBodyDistrict,
      {
        headers,
      }
    );

    if (
      responseDistrict.data.code !== 200 ||
      !responseDistrict.data.data ||
      responseDistrict.data.data.length === 0
    ) {
      throw new Error("API District không trả về dữ liệu hợp lệ");
    }

    const districtsData = responseDistrict.data.data;

    const isDistrictValid = districtsData.some(
      (district) => district.DistrictID === parseInt(districtID)
    );
    if (!isDistrictValid) {
      throw new Error("districtID không hợp lệ");
    }

    const apiUrlWard =
      "https://online-gateway.ghn.vn/shiip/public-api/master-data/ward";
    const requestBodyWard = {
      district_id: parseInt(districtID),
    };

    const responseWard = await axios.post(apiUrlWard, requestBodyWard, {
      headers,
    });

    if (
      responseWard.data.code !== 200 ||
      !responseWard.data.data ||
      responseWard.data.data.length === 0
    ) {
      throw new Error("API Ward không trả về dữ liệu hợp lệ");
    }

    const wardsData = responseWard.data.data;

    const isWardValid = wardsData.some((ward) => ward.WardCode === wardID);
    if (!isWardValid) {
      throw new Error("wardID không hợp lệ");
    }

    return true;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports = {
  checkAddressValidated,
};
