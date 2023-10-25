const express = require('express');
const axios = require('axios')

const router = express.Router()

router.get('/get-list-by-city-id', async (req, res) => {
    try {
      const { cityID } = req.query;
      const depth = 2;
      const apiUrl = `https://provinces.open-api.vn/api/p/${cityID}?depth=${depth}`;
      const response = await axios.get(apiUrl);
      const transformedData = {
        districts: response.data.districts.map(district => {
          return {
            districtID: district.code.toString(),
            name: district.name,
            cityID: response.data.code.toString()
          };
        }),
        total: response.data.districts.length
      };
      res.json(transformedData);
    } catch (error) {
      res.status(500).json({ error: 'Lỗi khi gọi API gốc' });
    }
  });
  
module.exports = router