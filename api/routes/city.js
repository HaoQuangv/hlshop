const express = require('express');
const axios = require('axios')

const router = express.Router()

router.get('/get-list', async (req, res) => {
  try {
    const { offset, limit, search } = req.query;
    const response = await axios.get('https://provinces.open-api.vn/api/');
  
    let transformedData;
    let filteredCities = response.data;
  
    if (search) {
      // Lọc dữ liệu dựa trên tìm kiếm
      filteredCities = response.data.filter(city => city.name.toLowerCase().includes(search.toLowerCase()));
    }
  
    if (offset === null || limit === null || isNaN(offset) || isNaN(limit)) {
      transformedData = {
        cities: filteredCities.map(city => {
          return {
            cityID: city.code.toString(),
            name: city.name
          };
        }),
        total: filteredCities.length
      };
    } else {
      transformedData = {
        cities: filteredCities.slice(offset, offset + limit).map(city => {
          return {
            cityID: city.code.toString(),
            name: city.name
          };
        }),
        total: filteredCities.length
      };
    }
    res.json(transformedData);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi gọi API gốc' });
  }
  });

module.exports = router