const express = require('express');
const axios = require('axios')

const router = express.Router()

router.get('/get-list', async (req, res) => {
    try {
      const { offset, limit } = req.query;
      const response = await axios.get('https://provinces.open-api.vn/api/');
  
      let transformedData;
  
      if (offset === null || limit === null || isNaN(offset) || isNaN(limit)) {
        transformedData = {
          cities: response.data.map(city => {
            return {
              cityID: city.code.toString(),
              name: city.name
            };
          }),
          total: response.data.length
        };
      } else {
        transformedData = {
          cities: response.data.slice(offset, offset + limit).map(city => {
            return {
              cityID: city.code.toString(),
              name: city.name
            };
          }),
          total: response.data.length
        };
      }
      res.json(transformedData);
    } catch (error) {
      res.status(500).json({ error: 'Lỗi khi gọi API gốc' });
    }
  });

module.exports = router