const redis = require('ioredis');
require('dotenv').config();

const cacheHostName = process.env.AZURE_CACHE_FOR_REDIS_HOST_NAME;
const cachePassword = process.env.AZURE_CACHE_FOR_REDIS_ACCESS_KEY;


const redisClient = new redis({
    host: cacheHostName,
    port: 6380,
    password: cachePassword,
    tls: {}
})

module.exports = redisClient;