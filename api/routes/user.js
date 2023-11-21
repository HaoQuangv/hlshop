const express = require('express');
const multer = require('multer');

const router = express.Router()

const mail_util = require('../../utils/mail');
const database = require("../../config");
const checkAuth = require('../../middleware/check_auth');
const checkRole = require('../../middleware/check_role_user');
const firebase = require('../../firebase');
const redisClient = require('../../middleware/redisClient');

const jwt = require('jsonwebtoken');
require('dotenv').config();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('file_cover');

const upload1 = multer({ storage: storage }).single('file_avatar');

// const set = (key, value) => {
//     redisClient.set(key, JSON.stringify(value), 'EX', 3600);
// }

// const get = async (request, response, next) => {
//     let key = request.route.path + request.userData.uuid;
//     console.log(key);
//     let headersSent = false; // Cờ để kiểm tra xem header đã được gửi đi chưa

//     redisClient.on('error', (error) => {
//         console.error('Redis connection error:', error);
//         if (!headersSent) {
//             response.status(500).json({ error: 'Internal Server Error' });
//             headersSent = true;
//         }
//     });

//     redisClient.get(key, (error, data) => {
//         if (error) {
//             if (!headersSent) {
//                 response.status(400).send(error);
//                 headersSent = true;
//             }
//         } else {
//             if (data !== null) {
//                 if (!headersSent) {
//                     response.status(200).send(JSON.parse(data));
//                     headersSent = true;
//                 }
//             } else {
//                 next();
//             }
//         }
//     });
// };

// router.post('/create-profile', upload, checkAuth, checkRole, async (request, response) => {
//     try{
//         const firstName = request.body.firstName;
//         const lastName = request.body.lastName;
//         const gender = request.body.gender;
//         const phone = request.body.phone;
//         const address = request.body.address;
//         const dateOfBirth = request.body.dateOfBirth;
//         var image = '';
//         var date = new Date(dateOfBirth) ;
//         const fullName = firstName + " " + lastName;
//         if (!request.file){
//             const createDated = new Date();
//             const queryUser = 'INSERT INTO [User] (first_name, last_name, gender, dateOfBirth, phone, address, id_account, createdDate) VALUES(@firstName, @lastName, @gender, @dateOfBirth, @phone, @address, @idAccount, @createDated)'
//             const userResult = await database.request()
//                                          .input('firstName', firstName)
//                                          .input('lastName', lastName)
//                                          .input('gender', gender)
//                                          .input('dateOfBirth', date)
//                                          .input('phone', phone)
//                                          .input('address', address)
//                                          .input('idAccount', request.userData.uuid)
//                                          .input('createDated', createDated)
//                                          .query(queryUser);

//             response.status(201).json({
//                 "id": request.userData.uuid,
//                 "contactFullName": fullName,
//                 "gender": gender,
//                 "accountType": 0,
//                 "accountStatus": 1,
//                 "date": createDated,
//                 "link": ""           
//                 })
//         }else{
//             const blob = firebase.bucket.file(request.file.originalname)
//             const blobWriter = blob.createWriteStream({
//                 metadata: {
//                     contentType: request.file.mimetype
//                 }  
//             })
//             blobWriter.on('error', (err) => {
//             response.status(500).json({
//                 "error": err.message
//                 });
//             });

//             blobWriter.on('finish', async () => {
//             try {
//                 const signedUrls = await blob.getSignedUrl({
//                     action: 'read',
//                     expires: '03-01-2500' // Ngày hết hạn của đường dẫn
//                 });
//                 const publicUrl = signedUrls[0];
//                 image = image + publicUrl;
//                 const createDated = new Date();
//                 const queryUser = 'INSERT INTO [User] (first_name, last_name, gender, dateOfBirth, phone, address, id_account, image, createdDate) VALUES(@firstName, @lastName, @gender, @dateOfBirth, @phone, @address, @idAccount, @image, @createDated)'
//                 const userResult = await database.request()
//                                          .input('firstName', firstName)
//                                          .input('lastName', lastName)
//                                          .input('gender', gender)
//                                          .input('dateOfBirth', date)
//                                          .input('phone', phone)
//                                          .input('address', address)
//                                          .input('idAccount', request.userData.uuid)
//                                          .input('image', image)
//                                          .input('createDated', createDated)
//                                          .query(queryUser);

//                 response.status(201).json({
//                     "id": request.userData.uuid,
//                     "contactFullName": fullName,
//                     "gender": gender,
//                     "accountType": 0,
//                     "accountStatus": 1,
//                     "date": createDated,
//                     "link": image           
//                 })
//             } catch (err) {
//                 response.status(500).json({
//                     "error": err.message
//                 });
//             }
//         });

//          blobWriter.end(request.file.buffer);
//         }

//     }catch(error){
//         console.log(error);
//         response.status(500).json({
//             "error": 'Internal Server Error'
//         })
//     }

// })

router.get('/get-profile', checkAuth, checkRole, async (request, response) => {
    try {
        console.log(144);
        const queryUser = "SELECT * FROM [User] WHERE id_account = @idAccount";
        const userResult = await database.request()
            .input("idAccount", request.userData.uuid)
            .query(queryUser)

        const queryAccount = "SELECT * FROM Account WHERE id = @idAccount"
        const resultAccount = await database.request()
            .input('idAccount', request.userData.uuid)
            .query(queryAccount)

        const queryEmail = "SELECT id AS emailID, emailAddress, emailLabel, isDefault, isVerify FROM Email WHERE idUser = @idUser";
        const resultEmail = await database.request()
            .input('idUser', userResult.recordset[0].id)
            .query(queryEmail)

        const queryPhone = "SELECT id AS phoneID, phoneNo, extendNumber, phoneLabel, phoneArea, countryArea, isDefault, isVerify FROM Phone WHERE idUser = @idUser";
        const resultPhone = await database.request()
            .input('idUser', userResult.recordset[0].id)
            .query(queryPhone)

        const responseData = {
            "userID": request.userData.uuid,
            "userLoginID": resultAccount.recordset[0].userLogin,
            "contactFullName": userResult.recordset[0].contactFullName,
            "slogan": userResult.recordset[0].slogan,
            "gender": userResult.recordset[0].gender,
            "pID": userResult.recordset[0].pID,
            "createdDate": userResult.recordset[0].createdDate,
            "accountType": resultAccount.recordset[0].role,
            "accountStatus": resultAccount.recordset[0].isVerify,
            "userType": resultAccount.recordset[0].role,
            "emails": resultEmail.recordset,
            "phones": resultPhone.recordset,
            "urls": [
                {
                    "urlID": "1010a4e3-2b79-4cf6-9e7a-716cdacc464f",
                    "urlString": "google.com",
                    "isDefault": 0
                },
                {
                    "urlID": "61441d2c-aa96-4790-b139-0eee81b8cf31",
                    "urlString": "haha",
                    "isDefault": 0
                }
            ],
            "userAvatar": userResult.recordset[0].userAvatar,
            "userCover": userResult.recordset[0].userCover
        };

        // var key = request.route.path + request.userData.uuid;
        // set(key, responseData);

        response.status(200).json(responseData)
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/profile/update-contact-name', checkAuth, checkRole, async (request, response) => {
    try {
        const contactFullName = request.body.contactFullName;
        const query = "UPDATE [User] SET contactFullName = @contactFullName OUTPUT inserted.id, inserted.slogan, inserted.gender, inserted.pID, inserted.createdDate WHERE id_account = @idAccount"
        const result = await database.request()
            .input('contactFullName', contactFullName)
            .input('idAccount', request.userData.uuid)
            .query(query);

        const queryAccount = "SELECT * FROM Account WHERE id = @idAccount";
        const resultAccount = await database.request()
            .input('idAccount', request.userData.uuid)
            .query(queryAccount);

        const toDay = new Date();
        response.status(201).json({
            "userID": request.userData.uuid,
            "userLoginID": resultAccount.recordset[0].userLogin,
            "contactFullName": contactFullName,
            "slogan": result.recordset[0].slogan,
            "gender": result.recordset[0].gender,
            "pID": result.recordset[0].pID,
            "createdDate": result.recordset[0].createdDate,
            "accountType": resultAccount.recordset[0].role,
            "accountStatus": resultAccount.recordset[0].isVerify,
            "userType": 1,
            "updatedDate": toDay,
            "isLoginIDEmail": null,
            "aboutInfo": null,
            "businessID": null,
            "businessName": "HLSHOP",
            "hasMedia": null,
            "hasAddress": null,
            "hasEmail": null,
            "hasPhone": null,
            "hasURL": null,
            "password": null,
            "businessType": null,
            "pIDType": null,
            "userRole": null,
            "parentUserID": null
        })
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/profile/update-cover', upload, checkAuth, checkRole, async (request, response) => {
    try {
        if (!request.file) {
            response.status(400).json({
                "errorCode": "MSG0084",
                "message": "File Cover is empty"
            })
        } else {
            var image = '';
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
                    const queryUser = 'UPDATE [User] SET userCover = @image WHERE id_account = @idAccount'
                    const userResult = await database.request()
                        .input('idAccount', request.userData.uuid)
                        .input('image', image)
                        .query(queryUser);

                    response.status(201).json({
                        "message": "Upload successful!"
                    })
                } catch (err) {
                    response.status(500).json({
                        "error": err.message
                    });
                }
            });

            blobWriter.end(request.file.buffer);
        }
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/profile/update-avatar', upload1, checkAuth, checkRole, async (request, response) => {
    try {
        if (!request.file) {
            response.status(400).json({
                "errorCode": "MSG0084",
                "message": "File Cover is empty"
            })
        } else {
            var image = '';
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
                    const queryUser = 'UPDATE [User] SET userAvatar = @image WHERE id_account = @idAccount'
                    const userResult = await database.request()
                        .input('idAccount', request.userData.uuid)
                        .input('image', image)
                        .query(queryUser);

                    response.status(201).json({
                        "message": "Upload successful!"
                    })
                } catch (err) {
                    response.status(500).json({
                        "error": err.message
                    });
                }
            });

            blobWriter.end(request.file.buffer);
        }
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/profile/email-add', checkAuth, checkRole, async (request, response) => {
    try {
        const emailAddress = request.body.emailAddress;
        const emailLabel = request.body.emailLabel;
        const isDefault = request.body.isDefault;

        const queryUser = 'SELECT id FROM [User] WHERE id_account = @idAccount';
        const userResult = await database.request()
            .input('idAccount', request.userData.uuid)
            .query(queryUser);

        if (isDefault === 1) {
            const queryEmailDefault = "SELECT * FROM Email WHERE idUser = @idUser AND isDefault = 1";
            const resultEmailDefault = await database.request()
                .input('idUser', userResult.recordset[0].id)
                .query(queryEmailDefault)

            if (resultEmailDefault.recordset.length !== 0) {
                const updateEmailDefault = "UPDATE Email SET isDefault = 0 WHERE id = @idEmail"
                const resultUpdateEmailDefault = await database.request()
                    .input('idEmail', resultEmailDefault.recordset[0].id)
                    .query(updateEmailDefault);
            }
            const createdDate = new Date();
            const expired = new Date(createdDate.getTime() + 60000);

            const queryEmail = "INSERT INTO Email(emailAddress, emailLabel, isDefault, isVerify, idUser) OUTPUT inserted.id VALUES (@emailAddress, @emailLabel, @isDefault, 0, @idUser)";
            const resultEmail = await database.request()
                .input('emailAddress', emailAddress)
                .input('emailLabel', emailLabel)
                .input('isDefault', isDefault)
                .input('idUser', userResult.recordset[0].id)
                .query(queryEmail);

            var otp = mail_util.getRandomInt();
            mail_util.sendOTP(emailAddress, otp);

            const queryOtp = 'INSERT INTO OtpEmail(value, createdDate, idEmail) OUTPUT inserted.id VALUES (@value, @createdDate, @idEmail)';
            const otpResult = await database.request()
                .input('value', otp)
                .input('createdDate', createdDate)
                .input('idEmail', resultEmail.recordset[0].id)
                .query(queryOtp);

            response.status(200).json({
                "status": 200,
                "message": "Add Email Success",
                "result": {
                    "userID": request.userData.uuid,
                    "uuid": otpResult.recordset[0].id,
                    "emailID": resultEmail.recordset[0].id,
                    "emailAddress": emailAddress,
                    "today": createdDate,
                    "expired": expired,
                    'otp': otp.toString()
                }
            })
        } else {
            const createdDate = new Date();
            const expired = new Date(createdDate.getTime() + 60000);

            const queryEmail = "INSERT INTO Email(emailAddress, emailLabel, isDefault, isVerify, idUser) OUTPUT inserted.id VALUES (@emailAddress, @emailLabel, @isDefault, 0, @idUser)";
            const resultEmail = await database.request()
                .input('emailAddress', emailAddress)
                .input('emailLabel', emailLabel)
                .input('isDefault', isDefault)
                .input('idUser', userResult.recordset[0].id)
                .query(queryEmail);


            var otp = mail_util.getRandomInt();
            mail_util.sendOTP(emailAddress, otp);

            const queryOtp = 'INSERT INTO OtpEmail(value, createdDate, idEmail) OUTPUT inserted.id VALUES (@value, @createdDate, @idEmail)';
            const otpResult = await database.request()
                .input('value', otp)
                .input('createdDate', createdDate)
                .input('idEmail', resultEmail.recordset[0].id)
                .query(queryOtp);

            response.status(200).json({
                "status": 200,
                "message": "Add Email Success",
                "result": {
                    "userID": request.userData.uuid,
                    "uuid": otpResult.recordset[0].id,
                    "emailID": resultEmail.recordset[0].id,
                    "emailAddress": emailAddress,
                    "today": createdDate,
                    "expired": expired,
                    'otp': otp.toString()
                }
            })
        }
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/profile/email-delete', checkAuth, checkRole, async (request, response) => {
    try {
        const emailID = request.body.emailID;

        const queryEmail = "SELECT * FROM Email WHERE id = @emailID";
        const resultEmail = await database.request()
            .input('emailID', emailID)
            .query(queryEmail);

        if (resultEmail.recordset.length === 0) {
            response.status(400).json({
                "errorCode": "MSG0091",
                "message": "Email is not existing"
            })
        }
        else {
            const queryDeleteEmail = "DELETE FROM Email WHERE id = @idEmail";
            const resultQueryDeleteEmail = await database.request()
                .input('idEmail', emailID)
                .query(queryDeleteEmail);
            response.status(200).json({
                "status": 200,
                "message": "Delete Email Success"
            })
        }
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/profile/email-resend-otp', checkAuth, checkRole, async (request, response) => {
    try {
        const emailID = request.body.emailID;
        const queryEmail = "SELECT * FROM Email WHERE id = @emailID";
        const resultEmail = await database.request()
            .input('emailID', emailID)
            .query(queryEmail);

        if (resultEmail.recordset.length !== 0) {
            const mail = resultEmail.recordset[0].emailAddress;

            var otp = mail_util.getRandomInt();
            mail_util.sendOTP(mail, otp);

            const createdDate = new Date();
            const expiredDate = new Date(createdDate.getTime() + 60000);
            const queryOtp = 'INSERT INTO OtpEmail(value, createdDate, idEmail) OUTPUT inserted.id VALUES (@value, @createdDate, @idEmail)';
            const otpResult = await database.request()
                .input('value', otp)
                .input('createdDate', createdDate)
                .input('idEmail', emailID)
                .query(queryOtp);

            response.status(201).json({
                "status": 200,
                "message": "Resend OTP Email Success",
                "result": {
                    "userID": request.userData.uuid,
                    "uuid": otpResult.recordset[0].id,
                    "emailID": emailID,
                    "emailAddress": resultEmail.recordset[0].emailAddress,
                    "today": createdDate,
                    "expired": expiredDate
                },
                "otp": otp.toString()
            })
        }
        else {
            response.status(400).json({
                "errorCode": "MSG0091",
                "message": "Email is not existing"
            });
        }
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/profile/email-verify', checkAuth, checkRole, async (request, response) => {
    try {
        const emailID = request.body.emailID;
        const uuid = request.body.uuid;
        const otp = request.body.otp;

        const queryEmail = "SELECT * FROM Email WHERE id = @emailID";
        const resultEmail = await database.request()
            .input('emailID', emailID)
            .query(queryEmail);

        if (resultEmail.recordset.length !== 0) {
            const query = 'SELECT * FROM OtpEmail WHERE idEmail = @idEmail AND createdDate = (SELECT MAX(createdDate) FROM OtpEmail ) AND id = @idOtpEmail'
            const result = await database.request()
                .input('idEmail', emailID)
                .input('idOtpEmail', uuid)
                .query(query);

            const today = new Date();
            const expired = today.getTime() - result.recordset[0].createdDate.getTime();

            if (result.recordset[0].value === parseInt(otp) && expired < 60000) {
                const queryAccount = 'UPDATE Email SET isVerify  = 1 OUTPUT inserted.emailAddress WHERE id = @idEmail'
                const accountResult = await database.request()
                    .input('idEmail', emailID)
                    .query(queryAccount);

                response.status(201).json({
                    "userID": request.userData.uuid,
                    "emailID": emailID,
                    "emailAddress": accountResult.recordset[0].userLogin,
                    "accountType": 1
                })
            }
            else {
                response.status(400).json({
                    'message': 'Mã otp của bạn bị sai hoặc đã quá hạn!'
                })
            }
        } else {
            response.status(400).json({
                "errorCode": "MSG0091",
                "message": "Email is not existing"
            })
        }
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/profile/email-update', checkAuth, checkRole, async (request, response) => {
    try {
        const emailID = request.body.emailID;
        const emailAddress = request.body.emailAddress;
        const emailLabel = request.body.emailLabel;
        const isDefault = request.body.isDefault;

        const queryEmail = "SELECT * FROM Email WHERE id = @emailID";
        const resultEmail = await database.request()
            .input('emailID', emailID)
            .query(queryEmail);

        if (resultEmail.recordset.length !== 0) {
            if (isDefault === 1) {
                const queryUser = 'SELECT id FROM [User] WHERE id_account = @idAccount';
                const userResult = await database.request()
                    .input('idAccount', request.userData.uuid)
                    .query(queryUser);

                const queryExistEmailIsDefault = "SELECT * FROM Email WHERE idUser = @idUser AND isDefault = 1";
                const resultExistEmailIsDefault = await database.request()
                    .input('idUser', userResult.recordset[0].id)
                    .query(queryExistEmailIsDefault);

                if (resultExistEmailIsDefault.recordset.length !== 0) {
                    const queryUpdateIsDefault = "UPDATE Email SET isDefault = 0 WHERE id = @idEmail";
                    const resultUpdateIsDefault = await database.request()
                        .input('idEmail', resultExistEmailIsDefault.recordset[0].id)
                        .query(queryUpdateIsDefault);
                }

                const queryUpdateEmail = "UPDATE Email SET isVerify = 0, emailAddress = @emailAddress, emailLabel = @emailLabel, isDefault = @isDefault WHERE id = @idEmail";
                const resultUpdateEmail = await database.request()
                    .input('idEmail', emailID)
                    .input('emailAddress', emailAddress)
                    .input('emailLabel', emailLabel)
                    .input('isDefault', isDefault)
                    .query(queryUpdateEmail);

                var otp = mail_util.getRandomInt();
                mail_util.sendOTP(emailAddress, otp);

                const createdDate = new Date();
                const expiredDate = new Date(createdDate.getTime() + 60000);

                const queryOtp = 'INSERT INTO OtpEmail(value, createdDate, idEmail) OUTPUT inserted.id VALUES (@value, @createdDate, @idEmail)';
                const otpResult = await database.request()
                    .input('value', otp)
                    .input('createdDate', createdDate)
                    .input('idEmail', emailID)
                    .query(queryOtp);


                response.status(200).json({
                    "status": 200,
                    "message": "Update Email Success",
                    "result": {
                        "emailID": emailID,
                        "emailAddress": emailAddress,
                        "isDefault": isDefault
                    },
                    "otp": otp.toString(),
                    "uuid": otpResult.recordset[0].id
                })
            } else {
                response.status(400).json({
                    "errorCode": "MSG0091",
                    "message": "Email is not existing"
                })
            }
        }
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/profile/phone-add', checkAuth, checkRole, async (request, response) => {
    try {
        const phoneNo = request.body.phoneNo;
        const phoneLabel = request.body.phoneLabel;
        const isDefault = request.body.isDefault;

        const queryUser = 'SELECT id FROM [User] WHERE id_account = @idAccount';
        const userResult = await database.request()
            .input('idAccount', request.userData.uuid)
            .query(queryUser);

        if (isDefault === 1) {
            const queryPhoneDefault = "SELECT * FROM Phone WHERE idUser = @idUser AND isDefault = 1";
            const resultPhoneDefault = await database.request()
                .input('idUser', userResult.recordset[0].id)
                .query(queryPhoneDefault)

            if (resultPhoneDefault.recordset.length !== 0) {
                const updatePhoneDefault = "UPDATE Phone SET isDefault = 0 WHERE id = @idPhone"
                const resultUpdatePhoneDefault = await database.request()
                    .input('idPhone', resultPhoneDefault.recordset[0].id)
                    .query(updatePhoneDefault);
            }
            const createdDate = new Date();
            const expired = new Date(createdDate.getTime() + 60000);

            const queryPhone = "INSERT INTO Phone(phoneNo, phoneLabel, isDefault, isVerify, idUser) OUTPUT inserted.id VALUES (@phoneNo, @phoneLabel, @isDefault, 0, @idUser)";
            const resultPhone = await database.request()
                .input('phoneNo', phoneNo)
                .input('phoneLabel', phoneLabel)
                .input('isDefault', isDefault)
                .input('idUser', userResult.recordset[0].id)
                .query(queryPhone);

            var otp = mail_util.getRandomInt();

            const queryOtp = 'INSERT INTO OtpPhone(value, createdDate, idPhone) OUTPUT inserted.id VALUES (@value, @createdDate, @idPhone)';
            const otpResult = await database.request()
                .input('value', otp)
                .input('createdDate', createdDate)
                .input('idPhone', resultPhone.recordset[0].id)
                .query(queryOtp);

            response.status(200).json({
                "status": 200,
                "message": "Add Phone Success",
                "result": {
                    "userID": request.userData.uuid,
                    "uuid": otpResult.recordset[0].id,
                    "phoneID": resultPhone.recordset[0].id,
                    "phone": phoneNo,
                    "today": createdDate,
                    "expired": expired,
                    'otp': otp.toString()
                }
            })
        } else {
            const createdDate = new Date();
            const expired = new Date(createdDate.getTime() + 60000);

            const queryPhone = "INSERT INTO Phone(phoneNo, phoneLabel, isDefault, isVerify, idUser) OUTPUT inserted.id VALUES (@phoneNo, @phoneLabel, @isDefault, 0, @idUser)";
            const resultPhone = await database.request()
                .input('phoneNo', phoneNo)
                .input('phoneLabel', phoneLabel)
                .input('isDefault', isDefault)
                .input('idUser', userResult.recordset[0].id)
                .query(queryPhone);

            var otp = mail_util.getRandomInt();

            const queryOtp = 'INSERT INTO OtpPhone(value, createdDate, idPhone) OUTPUT inserted.id VALUES (@value, @createdDate, @idPhone)';
            const otpResult = await database.request()
                .input('value', otp)
                .input('createdDate', createdDate)
                .input('idPhone', resultPhone.recordset[0].id)
                .query(queryOtp);

            response.status(200).json({
                "status": 200,
                "message": "Add Phone Success",
                "result": {
                    "userID": request.userData.uuid,
                    "uuid": otpResult.recordset[0].id,
                    "phoneID": resultPhone.recordset[0].id,
                    "phone": phoneNo,
                    "today": createdDate,
                    "expired": expired,
                    'otp': otp.toString()
                }
            })
        }
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/profile/phone-delete', checkAuth, checkRole, async (request, response) => {
    try {
        const phoneID = request.body.phoneID;

        const queryPhone = "SELECT * FROM Phone WHERE id = @phoneID";
        const resultPhone = await database.request()
            .input('phoneID', phoneID)
            .query(queryPhone);

        if (resultPhone.recordset.length === 0) {
            response.status(400).json({
                "errorCode": "MSG0094",
                "message": "Phone is not existing"
            })
        }
        else {
            const queryDeletePhone = "DELETE FROM Phone WHERE id = @phoneID";
            const resultQueryDeletePhone = await database.request()
                .input('phoneID', phoneID)
                .query(queryDeletePhone);
            response.status(200).json({
                "status": 200,
                "message": "Delete Phone Success"
            })
        }
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/profile/phone-resend-otp', checkAuth, checkRole, async (request, response) => {
    try {
        const phoneID = request.body.phoneID;
        const queryPhone = "SELECT * FROM Phone WHERE id = @phoneID";
        const resultPhone = await database.request()
            .input('phoneID', phoneID)
            .query(queryPhone);

        if (resultPhone.recordset.length !== 0) {
            var otp = mail_util.getRandomInt();

            const createdDate = new Date();
            const expiredDate = new Date(createdDate.getTime() + 60000);
            const queryOtp = 'INSERT INTO OtpPhone(value, createdDate, idPhone) OUTPUT inserted.id VALUES (@value, @createdDate, @idPhone)';
            const otpResult = await database.request()
                .input('value', otp)
                .input('createdDate', createdDate)
                .input('idPhone', phoneID)
                .query(queryOtp);

            response.status(201).json({
                "status": 200,
                "message": "Resend OTP Phone Success",
                "result": {
                    "userID": request.userData.uuid,
                    "uuid": otpResult.recordset[0].id,
                    "phoneID": phoneID,
                    "phone": resultPhone.recordset[0].phoneNo,
                    "today": createdDate,
                    "expired": expiredDate
                },
                "otp": otp.toString()
            })
        }
        else {
            response.status(400).json({
                "errorCode": "MSG0094",
                "message": "Phone is not existing"
            });
        }
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/profile/phone-verify', checkAuth, checkRole, async (request, response) => {
    try {
        const phoneID = request.body.phoneID;
        const uuid = request.body.uuid;
        const otp = request.body.otp;

        const queryPhone = "SELECT * FROM Phone WHERE id = @phoneID";
        const resultPhone = await database.request()
            .input('phoneID', phoneID)
            .query(queryPhone);

        if (resultPhone.recordset.length !== 0) {
            const query = 'SELECT * FROM OtpPhone WHERE idPhone = @idPhone AND createdDate = (SELECT MAX(createdDate) FROM OtpPhone ) AND id = @idOtpPhone'
            const result = await database.request()
                .input('idPhone', phoneID)
                .input('idOtpPhone', uuid)
                .query(query);

            const today = new Date();
            const expired = today.getTime() - result.recordset[0].createdDate.getTime();

            if (result.recordset[0].value === parseInt(otp) && expired < 60000) {
                const queryAccount = 'UPDATE Phone SET isVerify  = 1 OUTPUT inserted.phoneNo WHERE id = @idPhone'
                const accountResult = await database.request()
                    .input('idPhone', phoneID)
                    .query(queryAccount);

                response.status(201).json({
                    "userID": request.userData.uuid,
                    "phoneID": phoneID,
                    "phone": accountResult.recordset[0].phoneNo,
                    "accountType": 1
                })
            }
            else {
                response.status(400).json({
                    'message': 'Mã otp của bạn bị sai hoặc đã quá hạn!'
                })
            }
        } else {
            response.status(400).json({
                "errorCode": "MSG0094",
                "message": "Phone is not existing"
            })
        }
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/profile/phone-update', checkAuth, checkRole, async (request, response) => {
    try {
        const phoneID = request.body.phoneID;
        const phoneNo = request.body.phoneNo;
        const phoneLabel = request.body.phoneLabel;
        const isDefault = request.body.isDefault;

        const queryPhone = "SELECT * FROM Phone WHERE id = @phoneID";
        const resultPhone = await database.request()
            .input('phoneID', phoneID)
            .query(queryPhone);

        if (resultPhone.recordset.length !== 0) {
            if (isDefault === 1) {
                const queryUser = 'SELECT id FROM [User] WHERE id_account = @idAccount';
                const userResult = await database.request()
                    .input('idAccount', request.userData.uuid)
                    .query(queryUser);

                const queryExistPhoneIsDefault = "SELECT * FROM Phone WHERE idUser = @idUser AND isDefault = 1";
                const resultExistPhoneIsDefault = await database.request()
                    .input('idUser', userResult.recordset[0].id)
                    .query(queryExistPhoneIsDefault);

                if (resultExistPhoneIsDefault.recordset.length !== 0) {
                    const queryUpdateIsDefault = "UPDATE Phone SET isDefault = 0 WHERE id = @idPhone";
                    const resultUpdateIsDefault = await database.request()
                        .input('idPhone', resultExistPhoneIsDefault.recordset[0].id)
                        .query(queryUpdateIsDefault);
                }

                const queryUpdatePhone = "UPDATE Phone SET isVerify = 0, phoneNo = @phoneNo, phoneLabel = @phoneLabel, isDefault = @isDefault WHERE id = @idPhone";
                const resultUpdateEmail = await database.request()
                    .input('idPhone', phoneID)
                    .input('phoneLabel', phoneLabel)
                    .input('phoneNo', phoneNo)
                    .input('isDefault', isDefault)
                    .query(queryUpdatePhone);

                var otp = mail_util.getRandomInt();

                const createdDate = new Date();
                const expiredDate = new Date(createdDate.getTime() + 60000);

                const queryOtp = 'INSERT INTO OtpPhone(value, createdDate, idPhone) OUTPUT inserted.id VALUES (@value, @createdDate, @idPhone)';
                const otpResult = await database.request()
                    .input('value', otp)
                    .input('createdDate', createdDate)
                    .input('idPhone', phoneID)
                    .query(queryOtp);


                response.status(200).json({
                    "status": 200,
                    "message": "Update Phone Success",
                    "result": {
                        "userID": request.userData.uuid,
                        "uuid": otpResult.recordset[0].id,
                        "phoneID": phoneID,
                        "phone": phoneNo,
                        "isDefault": isDefault,
                        "today": createdDate,
                        "expired": expiredDate,
                        "otp": otp.toString()
                    }
                })
            } else {
                response.status(400).json({
                    "errorCode": "MSG0094",
                    "message": "Phone is not existing"
                })
            }
        }
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})
// router.put('/update-profile', upload, checkAuth, checkRole, async(request, response) => {
//     try{
//         const firstName = request.body.firstName;
//         const lastName = request.body.lastName;
//         const gender = request.body.gender;
//         const phone = request.body.phone;
//         const address = request.body.address;
//         const dateOfBirth = request.body.dateOfBirth;
//         var image = '';
//         var date = new Date(dateOfBirth) ;
//         date.setDate(date.getDate() + 1);
//         const fullName = firstName + " " + lastName;
//         if (!request.file){
//             const queryUser = 'UPDATE [User] SET first_name = @firstName, last_name = @lastName, gender = @gender, dateOfBirth = @dateOfBirth, phone = @phone, address = @address WHERE id_account = @idAccount'
//             const userResult = await database.request()
//                                          .input('firstName', firstName)
//                                          .input('lastName', lastName)
//                                          .input('gender', gender)
//                                          .input('dateOfBirth', date)
//                                          .input('phone', phone)
//                                          .input('address', address)
//                                          .input('idAccount', request.userData.uuid)
//                                          .query(queryUser);

//             response.status(200).json({
//                 "id": request.userData.uuid,
//                 "contactFullName": fullName,
//                 "gender": gender,
//                 "accountType": 0,
//                 "accountStatus": 1,
//                 "date": dateOfBirth,
//                 "link": ""
//         })
//     }else{
//         const blob = firebase.bucket.file(request.file.originalname)
//         const blobWriter = blob.createWriteStream({
//             metadata: {
//                 contentType: request.file.mimetype
//             }  
//         })
//         blobWriter.on('error', (err) => {
//         response.status(500).json({
//             "error": err.message
//             });
//         });

//         blobWriter.on('finish', async () => {
//         try {
//             const signedUrls = await blob.getSignedUrl({
//                 action: 'read',
//                 expires: '03-01-2500' // Ngày hết hạn của đường dẫn
//             });
//             const publicUrl = signedUrls[0];
//             image = image + publicUrl;
//             const queryUser = 'UPDATE [User] SET first_name = @firstName, last_name = @lastName, gender = @gender, dateOfBirth = @dateOfBirth, phone = @phone, address = @address, image = @image WHERE id_account = @idAccount'
//             const userResult = await database.request()
//                                      .input('firstName', firstName)
//                                      .input('lastName', lastName)
//                                      .input('gender', gender)
//                                      .input('dateOfBirth', date)
//                                      .input('phone', phone)
//                                      .input('address', address)
//                                      .input('idAccount', request.userData.uuid)
//                                      .input('image', image)
//                                      .query(queryUser);

//             response.status(201).json({
//                 "id": request.userData.uuid,
//                 "contactFullName": fullName,
//                 "gender": gender,
//                 "accountType": 0,
//                 "accountStatus": 1,
//                 "date": dateOfBirth,
//                 "link": image           
//             })
//         } catch (err) {
//             response.status(500).json({
//                 "error": err.message
//             });
//         }
//     });

//      blobWriter.end(request.file.buffer);
//     }
//     }catch(error){
//         console.log(error);
//         response.status(500).json({
//             "error": 'Internal Server Error'
//         })
//     }

// })

// router.delete('/delete-profile', checkAuth, checkRole, async (request, response) => {
//     try{
//         const queryUser = 'DELETE FROM [User] WHERE id_account = @idAccount'
//         const userResult = await database.request()
//                                         .input('idAccount', request.userData.uuid)
//                                         .query(queryUser);

//         response.status(200).json({
//             "message": "Deleted successfull!"
//         })
//     }catch(error){
//         console.log(error);
//         response.status(500).json({
//             "error": 'Internal Server Error'
//         })
//     }
// })

module.exports = router