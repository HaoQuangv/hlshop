const express = require("express");
const axios = require("axios");

const router = express.Router();

router.get("/get-list-by-city-id", async (req, res) => {
  try {
    const { cityID, search } = req.query;
    const depth = 2;
    const apiUrl = `https://provinces.open-api.vn/api/p/${cityID}?depth=${depth}`;
    const response = await axios.get(apiUrl);
    let transformedData;
    let filteredDistricts = response.data.districts;

    if (search) {
      // Lọc dữ liệu dựa trên tìm kiếm
      filteredDistricts = response.data.districts.filter((district) =>
        district.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    transformedData = {
      districts: filteredDistricts.map((district) => {
        return {
          districtID: district.code.toString(),
          name: district.name,
          cityID: response.data.code.toString(),
        };
      }),
      total: filteredDistricts.length,
    };

    res.json(transformedData);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi gọi API gốc" });
  }
});

module.exports = router;
