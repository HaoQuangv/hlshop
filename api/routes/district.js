const express = require("express");
const axios = require("axios");
const { token } = require("../../utils/shipping");
const router = express.Router();

// router.get("/get-list-by-city-id", async (req, res) => {
//   try {
//     const { cityID, search } = req.query;
//     const depth = 2;
//     const apiUrl = `https://provinces.open-api.vn/api/p/${cityID}?depth=${depth}`;
//     const response = await axios.get(apiUrl);
//     let transformedData;
//     let filteredDistricts = response.data.districts;

//     if (search) {
//       // Lọc dữ liệu dựa trên tìm kiếm
//       filteredDistricts = response.data.districts.filter((district) =>
//         district.name.toLowerCase().includes(search.toLowerCase())
//       );
//     }

//     transformedData = {
//       districts: filteredDistricts.map((district) => {
//         return {
//           districtID: district.code.toString(),
//           name: district.name,
//           cityID: response.data.code.toString(),
//         };
//       }),
//       total: filteredDistricts.length,
//     };

//     res.json(transformedData);
//   } catch (error) {
//     res.status(500).json({ error: "Lỗi khi gọi API gốc" });
//   }
// });

router.get("/get-list-by-city-id", async (req, res) => {
  try {
    const { cityID, search } = req.query;

    // Thay đổi đường link API và cấu trúc body theo yêu cầu mới
    const apiUrl =
      "https://online-gateway.ghn.vn/shiip/public-api/master-data/district";
    const requestBody = {
      province_id: parseInt(cityID),
    };

    // Thêm token vào header
    const headers = {
      token: token,
      contentType: "application/json",
    };
    const response = await axios.post(apiUrl, requestBody, { headers });
    const districtsData = response.data.data;
    let transformedData;
    let filteredDistricts = districtsData;

    if (search) {
      // Lọc dữ liệu dựa trên tìm kiếm trong DistrictName hoặc NameExtension
      filteredDistricts = districtsData.filter(
        (district) =>
          district.DistrictName.toLowerCase().includes(search.toLowerCase()) ||
          district.NameExtension.some((extension) =>
            extension.toLowerCase().includes(search.toLowerCase())
          )
      );
    }

    transformedData = {
      districts: filteredDistricts.map((district) => {
        return {
          districtID: district.DistrictID.toString(),
          name: district.DistrictName,
          cityID: district.ProvinceID.toString(),
        };
      }),
      total: filteredDistricts.length,
    };

    res.json(transformedData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Lỗi khi gọi API gốc" });
  }
});

module.exports = router;
