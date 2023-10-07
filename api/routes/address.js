const express = require('express');
const router = express.Router()

const database = require("../../config");
const checkAuth = require("../../middleware/check_auth")
const checkRole = require("../../middleware/check_role_user")

router.post('/add', checkAuth, checkRole, async (request, response) => {
    try{
        const receiverContactName = request.body.receiverContactName;
        const receiverPhone = request.body.receiverPhone;
        const receiverEmail = request.body.receiverEmail;
        const cityName = request.body.cityName;
        const districtName = request.body.districtName;
        const wardName = request.body.wardName;
        const addressDetail = request.body.addressDetail;
        const addressLabel = request.body.addressLabel;

        const queryUser = 'SELECT id FROM [User] WHERE id_account = @idAccount';
        const userResult = await database.request()
                                        .input('idAccount', request.userData.uuid)
                                        .query(queryUser);

        const addressString = addressDetail + ", " + wardName + ", " + districtName + ", " + cityName;
        console.log(request.userData.uuid);
        const queryAddress = 'INSERT INTO AddressReceive(receiverPhone, receiverContactName, receiverEmail, isDefault, cityName, districtName, addressDetail, addressString, addressLabel, id_user, wardName) VALUES (@receiverPhone, @receiverContactName, @receiverEmail, 0, @cityName, @districtName, @addressDetail, @addressString, @addressLabel, @userID, @wardName)';
        const addressResult = await database.request()
                                            .input('receiverPhone', receiverPhone)
                                            .input('receiverContactName', receiverContactName)
                                            .input('receiverEmail',receiverEmail)
                                            .input('cityName', cityName)
                                            .input('districtName', districtName)
                                            .input('addressDetail', addressDetail)
                                            .input('addressString', addressString)
                                            .input('addressLabel', addressLabel)
                                            .input('userID', userResult.recordset[0].id)
                                            .input('wardName', wardName)
                                            .query(queryAddress);
        response.status(200).json({
            "status": 200,
            "message": "Add Receiver Address Success"
        })
        
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/update', checkAuth, checkRole, async (request, response) => {
    try{
        const receiverAddressID = request.body.receiverAddressID;
        const receiverContactName = request.body.receiverContactName;
        const receiverPhone = request.body.receiverPhone;
        const receiverEmail = request.body.receiverEmail;
        const cityName = request.body.cityName;
        const districtName = request.body.districtName;
        const wardName = request.body.wardName;
        const addressDetail = request.body.addressDetail;
        const addressLabel = request.body.addressLabel;

        const query = 'SELECT * FROM AddressReceive WHERE id = @addressID';
        const result = await database.request()
                                    .input('addressID', receiverAddressID)
                                    .query(query);

        if (result.recordset.length === 0){
            response.status(400).json({
                "errorCode": "MSG0071",
                "message": "Receiver Address is not existing"
            })
        }else{
            var addressString = addressDetail + ", " + wardName + ", " + districtName + ", " + cityName;
            if (wardName === ""){
                 addressString = addressDetail + ", " + districtName + ", " + cityName;
            }

            const queryAddress = 'UPDATE AddressReceive SET receiverPhone = @receiverPhone, receiverEmail = @receiverEmail, receiverContactName = @receiverContactName, cityName = @cityName, districtName = @districtName, addressDetail = @addressDetail, addressString = @addressString, addressLabel = @addressLabel, wardName = @wardName WHERE id = @addressID';
            const addressResult = await database.request()
                                                .input('receiverPhone', receiverPhone)
                                                .input('receiverEmail', receiverEmail)
                                                .input('receiverContactName', receiverContactName)
                                                .input('cityName', cityName)
                                                .input('districtName', districtName)
                                                .input('addressDetail', addressDetail)
                                                .input('addressString', addressString)
                                                .input('addressLabel', addressLabel)
                                                .input('addressID', receiverAddressID)
                                                .input('wardName', wardName)
                                                .query(queryAddress);
    
            response.status(200).json({
                "status": 200,
                "message": "Update Receiver Address Success"
            })
        }


    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.delete('/delete', checkAuth, checkRole, async (request, response) =>{
    try{
        const receiverAddressID = request.body.receiverAddressID;
        const query = 'SELECT * FROM AddressReceive WHERE id = @addressID';
        const result = await database.request()
                                    .input('addressID', receiverAddressID)
                                    .query(query);

        if(result.recordset.length === 0){
            response.status(400).json({
                "errorCode": "MSG0071",
                "message": "Receiver Address is not existing"
            })
        }else{
            const queryAddress = 'DELETE FROM AddressReceive WHERE id = @addressID'
            const addressResult = await database.request()
                                                .input('addressID', receiverAddressID)
                                                .query(queryAddress);

            response.status(200).json({
                "status": 200,
                "message": "Delete Receiver Address Success"
            })
        }

    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/add-default', checkAuth, checkRole, async (request, response) => {
    try{
        const receiverAddressID = request.body.receiverAddressID;

        const query = 'SELECT * FROM AddressReceive WHERE id = @addressID';
        const result = await database.request()
                                    .input('addressID', receiverAddressID)
                                    .query(query);

        if(result.recordset.length === 0){
            response.status(400).json({
                "errorCode": "MSG0071",
                "message": "Receiver Address is not existing"
            })
        }else {
            if(result.recordset[0].isDefault === 1){
                response.status(200).json({
                    "status": 200,
                    "message": "Add Receiver Address Default Success"
                })
            }else{
                const query1 = 'SELECT id FROM AddressReceive WHERE isDefault = 1';
                const result1 = await database.request()
                                            .query(query1);
                
                if(result1.recordset.length === 1){
                    const query2 = 'UPDATE AddressReceive SET isDefault = 0 WHERE id = @addressID'
                    const result2 = await database.request()
                                                .input('addressID', result1.recordset[0].id)
                                                .query(query2);
                }

                const query3 = 'UPDATE AddressReceive SET isDefault = 1 WHERE id = @addressID'
                const result3 = await database.request()
                                                    .input('addressID', receiverAddressID)
                                                    .query(query3);
                
                response.status(200).json({
                    "status": 200,
                    "message": "Add Receiver Address Default Success"
                })
            }
        }
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.get('/get-list', checkAuth, checkRole, async (request, response) => {
    try{
        var offset= request.query.offset;
        var limit = request.query.limit;


        console.log(typeof(offset));
        console.log(typeof(limit));
        if (offset == null || offset < 1) {
            offset = 1;
        }
    
        if (limit == null) {
            limit = 10;
        }

        offset = (offset - 1) * limit;
        const query = 'SELECT * FROM AddressReceive ORDER BY isDefault OFFSET @page ROWS FETCH NEXT @pageSize ROWS ONLY';
        const result = await database.request()
                                    .input('page', parseInt(offset))
                                    .input('pageSize', parseInt(limit))
                                    .query(query);

        response.status(200).json({
            "receiverAddresses": result.recordset
        })
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})


























module.exports = router