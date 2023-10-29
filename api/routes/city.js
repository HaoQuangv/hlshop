const express = require("express");
const axios = require("axios");

const router = express.Router();

module.exports = router;

router.get("/get-list", async (req, res) => {
  try {
    const { offset, limit, search } = req.query;
    const response = await axios.get(
      "https://vn-public-apis.fpo.vn/provinces/getAll?limit=-1"
    );
    let transformedData;
    let cities = response.data.data.data;
    if (search) {
      // Lọc dữ liệu dựa trên tìm kiếm
      cities = cities.filter((city) =>
        city.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (offset === null || limit === null || isNaN(offset) || isNaN(limit)) {
      transformedData = {
        cities: cities.map((city) => {
          return {
            cityID: city.code,
            name: city.name,
          };
        }),
        total: cities.length,
      };
    } else {
      transformedData = {
        cities: cities.slice(offset, offset + limit).map((city) => {
          return {
            cityID: city.code,
            name: city.name,
          };
        }),
        total: cities.length,
      };
    }
    res.json(transformedData);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi gọi API gốc" });
  }
});

// router.get("/get-list", async (req, res) => {
//   try {
//     const { offset, limit, search } = req.query;
//     const response = await axios.get(
//       "https://vn-public-apis.fpo.vn/provinces/getAll?limit=-1"
//     );

//     let transformedData;
//     let cities = response.data.data.data;

//     if (search) {
//       // Lọc dữ liệu dựa trên tìm kiếm
//       cities = cities.filter((city) =>
//         city.name.toLowerCase().includes(search.toLowerCase())
//       );
//     }

//     if (offset === null || limit === null || isNaN(offset) || isNaN(limit)) {
//       transformedData = {
//         cities: cities.map((city) => {
//           return {
//             cityID: city.code,
//             name: city.name,
//           };
//         }),
//         total: cities.length,
//       };
//     } else {
//       transformedData = {
//         cities: cities.slice(offset, offset + limit).map((city) => {
//           return {
//             cityID: city.code.toString(),
//             name: city.name,
//           };
//         }),
//         total: cities.length,
//       };
//     }
//     res.json(transformedData);
//   } catch (error) {
//     res.status(500).json({ error: "Lỗi khi gọi API mới" });
//   }
// });
