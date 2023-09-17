const express = require('express');
const router = express.Router()


const mail_util = require('../../utils/mail');
const database = require("../../config");
const jwt = require('jsonwebtoken');
require('dotenv').config();


router.post('/signup', async (request, response) => {
    try{
        const email = request.body.email;
        const phone = request.body.phone;
        const password = request.body.password;
        const query = 'SELECT id FROM Account WHERE email = @email';
        const result = await database.request()
                                    .input('email', email)
                                    .query(query);

        if (result.recordset.length !== 0){
            response.status(400).json({
                "errorCode": 'MSG0046',
                "userLogin": email,
                "userID": result.recordset[0].id
            });
        } 
        else
        {
            const role = 0;
            const createdDate = new Date();
            const expired = new Date(createdDate.getTime() + 90000);
            const enabled = 0;

            const queryAccount = 'INSERT INTO Account(email, phone, password, role, enabled, createdDate) OUTPUT inserted.id VALUES (@email, @phone, @password, @role, @enabled, @createdDate)';
            const accountResult = await database.request()
                                                .input('email', email)
                                                .input('phone', phone)
                                                .input('password', password)
                                                .input('role', role)
                                                .input('enabled', enabled)
                                                .input('createdDate', createdDate)
                                                .query(queryAccount);
            
            const otp = mail_util.getRandomInt();
            mail_util.sendOTP(email, otp);

            const insertedAccountId = accountResult.recordset[0].id;

            const queryOtp = 'INSERT INTO Otp(value, createdDate, id_account) VALUES (@value, @createdDate, @id_account)';
            const otpResult = await database.request()
                                            .input('value', otp)
                                            .input('createdDate', createdDate)
                                            .input('id_account', insertedAccountId)
                                            .query(queryOtp);
            
            response.status(201).json({
                'uuid': insertedAccountId,
                'email': email,
                'today': createdDate.toISOString(),
                'expired': expired.toISOString(),
                'otp': otp
            });
        }
    } catch (error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/verify', async (request, response) => {
    try{
        const idAccount = request.body.uuid;
        const otp = request.body.otp;
        
        const query = 'SELECT * FROM Otp WHERE id_account = @idAccount AND createdDate = (SELECT MAX(createdDate) FROM OTP )'
        const result = await database.request()
                                    .input('idAccount', idAccount)
                                    .query(query);
        const today = new Date();
        const expired = today.getTime() - result.recordset[0].createdDate.getTime();
        if (result.recordset[0].value === otp && expired < 90000){
            const queryAccount = 'UPDATE Account SET enabled = 1 WHERE id = @idAccount'
            const accountResult = await database.request()
                                                .input('idAccount', idAccount)
                                                .query(queryAccount);
            
            response.status(201).json({
                'message': 'Ban da xac nhan thanh cong'
            })
        }
        else{
            response.status(400).json({
                'message': 'Ban khong xac nhan thanh cong'
            })
        }
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/resend-otp', async (request, response) => {
    try{
        const idAccount = request.body.uuid;
        const query = 'SELECT email FROM Account WHERE id = @idAccount';
        const result = await database.request()
                                    .input('idAccount', idAccount)
                                    .query(query);
        
        if (result.recordset.length !== 0){
            const mail = result.recordset[0].email;

            const otp = mail_util.getRandomInt();
            mail_util.sendOTP(mail, otp);

            const createdDate = new Date();
            const queryOtp = 'INSERT INTO Otp(value, createdDate, id_account) VALUES (@value, @createdDate, @id_account)';
            const otpResult = await database.request()
                                            .input('value', otp)
                                            .input('createdDate', createdDate)
                                            .input('id_account', idAccount)
                                            .query(queryOtp);

            response.status(201).json({
            "otp": otp
            })
        } 
        else{
            response.status(400).json({
                "errorCode": "MSG0020",
                "message": "User is not existing"
            });
        }
        
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }

})

router.post('/signin', async (request, response) => {
    try{
        const email = request.body.email;
        const password = request.body.password;

        const query = 'SELECT * FROM Account WHERE email = @email AND password = @password AND enabled = 1' ;
        const result = await database.request()
                                .input('email', email)
                                .input('password', password)
                                .query(query);

        if(result.recordset.length === 1){
            const token = jwt.sign({uuid: result.recordset[0].id}, process.env.privateKey, { expiresIn: "10h"})

            response.status(201).json({
                "token": token,
                "uuid": result.recordset[0].id,
                "accountType": result.recordset[0].role
            })

        }
        else{
            response.status(400).json({
                "errorCode": "MSG0020",
                "message": "User is not existing"
            })
        }
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})




















module.exports = router