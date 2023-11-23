const express = require("express");
const axios = require("axios");
const { token } = require("../../utils/shipping");
const router = express.Router();

module.exports = router;

// router.get("/get-list", async (req, res) => {
//   try {
//     const { offset, limit, search } = req.query;
//     const response = await axios.get("https://provinces.open-api.vn/api/");

//     let transformedData;
//     let filteredCities = response.data;

//     if (search) {
//       // Lọc dữ liệu dựa trên tìm kiếm
//       filteredCities = response.data.filter((city) =>
//         city.name.toLowerCase().includes(search.toLowerCase())
//       );
//     }

//     if (offset === null || limit === null || isNaN(offset) || isNaN(limit)) {
//       transformedData = {
//         cities: filteredCities.map((city) => {
//           return {
//             cityID: city.code.toString(),
//             name: city.name,
//           };
//         }),
//         total: filteredCities.length,
//       };
//     } else {
//       transformedData = {
//         cities: filteredCities.slice(offset, offset + limit).map((city) => {
//           return {
//             cityID: city.code.toString(),
//             name: city.name,
//           };
//         }),
//         total: filteredCities.length,
//       };
//     }
//     res.json(transformedData);
//   } catch (error) {
//     res.status(500).json({ error: "Lỗi khi gọi API gốc" });
//   }
// });

//giao hang nhanh
router.get("/get-list", async (req, res) => {
  try {
    const { offset, limit, search } = req.query;

    // Thay đổi đường link API của bạn ở đây
    const apiUrl =
      "https://online-gateway.ghn.vn/shiip/public-api/master-data/province";

    // Thêm token vào header
    const headers = {
      token: token,
    };

    const response = await axios.get(apiUrl, { headers });

    let transformedData;
    let filteredProvinces = response.data.data; // Lấy mảng dữ liệu từ response

    if (search) {
      // Lọc dữ liệu dựa trên tìm kiếm
      filteredProvinces = response.data.data.filter(
        (province) =>
          province.ProvinceName.toLowerCase().includes(search.toLowerCase()) ||
          province.NameExtension.some((extension) =>
            extension.toLowerCase().includes(search.toLowerCase())
          )
      );
    }

    if (offset === null || limit === null || isNaN(offset) || isNaN(limit)) {
      transformedData = {
        cities: filteredProvinces.map((province) => {
          return {
            cityID: province.ProvinceID.toString(),
            name: province.ProvinceName,
          };
        }),
        total: filteredProvinces.length,
      };
    } else {
      transformedData = {
        cities: filteredProvinces
          .slice(offset, offset + limit)
          .map((province) => {
            return {
              cityID: province.ProvinceID.toString(),
              name: province.ProvinceName,
            };
          }),
        total: filteredProvinces.length,
      };
    }
    res.json(transformedData);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi gọi API gốc" });
  }
});
