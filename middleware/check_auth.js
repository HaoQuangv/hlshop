const jwt = require('jsonwebtoken')
require('dotenv').config();

async function authenticateToken(request, response, next) {
    try{
        const authHeader = request.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
  
        if (token == null) {
            response.status(401).json({
            "statusCode": 401,
            "message": "Unauthorized"
            })
        }
  
        const decoded = jwt.verify(token, process.env.privateKey);
        request.userData = decoded;
        next();
    }catch(error){
        console.log(error);
        response.status(500).json({
        "error": 'Internal Server Error'
        })
    }
}

  module.exports = authenticateToken
  