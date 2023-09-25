const express = require('express');
const multer = require('multer');

const router = express.Router()

const database = require("../../config");
const checkAuth = require('../../middleware/check_auth');
const checkRole = require('../../middleware/check_role_user');
const firebase = require('../../firebase');



const storage = multer.memoryStorage();
const upload = multer({storage: storage}).single('file');  


router.post('/create-profile', upload, checkAuth, checkRole, async (request, response) => {
    try{
        const firstName = request.body.firstName;
        const lastName = request.body.lastName;
        const gender = request.body.gender;
        const phone = request.body.phone;
        const address = request.body.address;
        const dateOfBirth = request.body.dateOfBirth;
        var image = '';
        var date = new Date(dateOfBirth) ;
        const fullName = firstName + " " + lastName;
        if (!request.file){
            const createDated = new Date();
            const queryUser = 'INSERT INTO [User] (first_name, last_name, gender, dateOfBirth, phone, address, id_account, createdDate) VALUES(@firstName, @lastName, @gender, @dateOfBirth, @phone, @address, @idAccount, @createDated)'
            const userResult = await database.request()
                                         .input('firstName', firstName)
                                         .input('lastName', lastName)
                                         .input('gender', gender)
                                         .input('dateOfBirth', date)
                                         .input('phone', phone)
                                         .input('address', address)
                                         .input('idAccount', request.userData.uuid)
                                         .input('createDated', createDated)
                                         .query(queryUser);
                
            response.status(201).json({
                "id": request.userData.uuid,
                "contactFullName": fullName,
                "gender": gender,
                "accountType": 0,
                "accountStatus": 1,
                "date": createDated,
                "link": ""           
                })
        }else{
            const blob = firebase.bucket.file(request.file.originalname)
            const blobWriter = blob.createWriteStream({
                metadata: {
                    contentType: request.file.mimetype
                }  
            })
            blobWriter.on('error', (err) => {
            response.status(500).json({
                "error": err.message
                });
            });
    
            blobWriter.on('finish', async () => {
            try {
                const signedUrls = await blob.getSignedUrl({
                    action: 'read',
                    expires: '03-01-2500' // Ngày hết hạn của đường dẫn
                });
                const publicUrl = signedUrls[0];
                image = image + publicUrl;
                const createDated = new Date();
                const queryUser = 'INSERT INTO [User] (first_name, last_name, gender, dateOfBirth, phone, address, id_account, image, createdDate) VALUES(@firstName, @lastName, @gender, @dateOfBirth, @phone, @address, @idAccount, @image, @createDated)'
                const userResult = await database.request()
                                         .input('firstName', firstName)
                                         .input('lastName', lastName)
                                         .input('gender', gender)
                                         .input('dateOfBirth', date)
                                         .input('phone', phone)
                                         .input('address', address)
                                         .input('idAccount', request.userData.uuid)
                                         .input('image', image)
                                         .input('createDated', createDated)
                                         .query(queryUser);
                
                response.status(201).json({
                    "id": request.userData.uuid,
                    "contactFullName": fullName,
                    "gender": gender,
                    "accountType": 0,
                    "accountStatus": 1,
                    "date": createDated,
                    "link": image           
                })
            } catch (err) {
                response.status(500).json({
                    "error": err.message
                });
            }
        });
    
         blobWriter.end(request.file.buffer);
        }
        
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }

})

router.get('/get-profile', checkAuth, checkRole, async (request, response) => {
    try{
        const queryUser = "SELECT * FROM [User] WHERE id_account = @idAccount";
        const userResult = await database.request()
                                        .input("idAccount", request.userData.uuid)
                                        .query(queryUser)

        const fullName = userResult.recordset[0].first_name + " " + userResult.recordset[0].last_name
        response.status(200).json({
            "id": userResult.recordset[0].id,
            "contactFullName": fullName,
            "gender": userResult.recordset[0].gender,
            "accountType": 0,
            "accountStatus": 1,
            "date": userResult.recordset[0].createdDate,
            "link": userResult.recordset[0].image  
        })
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.put('/update-profile', upload, checkAuth, checkRole, async(request, response) => {
    try{
        const firstName = request.body.firstName;
        const lastName = request.body.lastName;
        const gender = request.body.gender;
        const phone = request.body.phone;
        const address = request.body.address;
        const dateOfBirth = request.body.dateOfBirth;
        var image = '';
        var date = new Date(dateOfBirth) ;
        date.setDate(date.getDate() + 1);
        const fullName = firstName + " " + lastName;
        if (!request.file){
            const queryUser = 'UPDATE [User] SET first_name = @firstName, last_name = @lastName, gender = @gender, dateOfBirth = @dateOfBirth, phone = @phone, address = @address WHERE id_account = @idAccount'
            const userResult = await database.request()
                                         .input('firstName', firstName)
                                         .input('lastName', lastName)
                                         .input('gender', gender)
                                         .input('dateOfBirth', date)
                                         .input('phone', phone)
                                         .input('address', address)
                                         .input('idAccount', request.userData.uuid)
                                         .query(queryUser);
        
            response.status(200).json({
                "id": request.userData.uuid,
                "contactFullName": fullName,
                "gender": gender,
                "accountType": 0,
                "accountStatus": 1,
                "date": dateOfBirth,
                "link": ""
        })
    }else{
        const blob = firebase.bucket.file(request.file.originalname)
        const blobWriter = blob.createWriteStream({
            metadata: {
                contentType: request.file.mimetype
            }  
        })
        blobWriter.on('error', (err) => {
        response.status(500).json({
            "error": err.message
            });
        });

        blobWriter.on('finish', async () => {
        try {
            const signedUrls = await blob.getSignedUrl({
                action: 'read',
                expires: '03-01-2500' // Ngày hết hạn của đường dẫn
            });
            const publicUrl = signedUrls[0];
            image = image + publicUrl;
            const queryUser = 'UPDATE [User] SET first_name = @firstName, last_name = @lastName, gender = @gender, dateOfBirth = @dateOfBirth, phone = @phone, address = @address, image = @image WHERE id_account = @idAccount'
            const userResult = await database.request()
                                     .input('firstName', firstName)
                                     .input('lastName', lastName)
                                     .input('gender', gender)
                                     .input('dateOfBirth', date)
                                     .input('phone', phone)
                                     .input('address', address)
                                     .input('idAccount', request.userData.uuid)
                                     .input('image', image)
                                     .query(queryUser);
            
            response.status(201).json({
                "id": request.userData.uuid,
                "contactFullName": fullName,
                "gender": gender,
                "accountType": 0,
                "accountStatus": 1,
                "date": dateOfBirth,
                "link": image           
            })
        } catch (err) {
            response.status(500).json({
                "error": err.message
            });
        }
    });

     blobWriter.end(request.file.buffer);
    }
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
    
})

router.delete('/delete-profile', checkAuth, checkRole, async (request, response) => {
    try{
        const queryUser = 'DELETE FROM [User] WHERE id_account = @idAccount'
        const userResult = await database.request()
                                        .input('idAccount', request.userData.uuid)
                                        .query(queryUser);

        response.status(200).json({
            "message": "Deleted successfull!"
        })
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})
module.exports = router