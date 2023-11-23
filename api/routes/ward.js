const express = require("express");
const { token } = require("../../utils/shipping");
const axios = require("axios");
const router = express.Router();

router.get("/get-list-by-district-id", async (req, res) => {
  try {
    const { districtID, search } = req.query;

    // Thay đổi đường link API và cấu trúc body theo yêu cầu mới
    const apiUrl =
      "https://online-gateway.ghn.vn/shiip/public-api/master-data/ward";
    const requestBody = {
      district_id: parseInt(districtID),
    };

    // Thêm token vào header (nếu cần)
    const headers = {
      token: token,
      contentType: "application/json",
    };

    const response = await axios.post(apiUrl, requestBody, { headers });
    const wardsData = response.data.data;

    let transformedData;
    let filteredWards = wardsData;

    if (search) {
      // Lọc dữ liệu dựa trên tìm kiếm trong WardName hoặc NameExtension
      filteredWards = wardsData.filter(
        (ward) =>
          ward.WardName.toLowerCase().includes(search.toLowerCase()) ||
          ward.NameExtension.some((extension) =>
            extension.toLowerCase().includes(search.toLowerCase())
          )
      );
    }

    transformedData = {
      wards: filteredWards.map((ward) => {
        return {
          wardID: ward.WardCode.toString(),
          name: ward.WardName,
          districtID: ward.DistrictID.toString(),
        };
      }),
      total: filteredWards.length,
    };

    res.json(transformedData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Lỗi khi gọi API gốc" });
  }
});

module.exports = router;
