const express = require('express');
const multer = require('multer');

const router = express.Router();
const database = require('../../config');

const checkAuth = require('../../middleware/check_auth');
const checkRole = require('../../middleware/check_role_admin');
const firebase = require('../../firebase')

const storage = multer.memoryStorage();
const upload  = multer({
    storage: storage
});

// router.post('/create-product', upload.array('file', 9), checkAuth, checkRole, async (request, response) => {
//     try{
//         const name = request.body.name;
//         const slogan = request.body.slogan;
//         const decription = request.body.decription;
//         const notes = request.body.notes;
//         const madeIn = request.body.madeIn;
//         const uses = request.body.uses;
//         const idCategory = request.body.idCategory;
//         const attribute1 = request.body.attribute1;
//         const attribute2 = request.body.attribute2;

//         const queryUser = 'SELECT id FROM [User] WHERE id_account = @idAccount';
//         const userResult = await database.request()
//                                         .input('idAccount', request.userData.uuid)
//                                         .query(queryUser);
        
//         console.log(name);
//         console.log(slogan);
//         console.log(decription);
//         console.log(notes);
//         console.log(madeIn);
//         console.log(uses);
//         console.log(idCategory);
//         console.log(attribute1);
//         console.log(attribute2);

//         // if (!request.files){
//         //     response.status(400).json({
//         //         "Message": "Khong tim thay file"
//         //     })
//         // }
//         // else{
            
//         //     const files = request.files;

//         //     files.forEach(file => {
//         //         const blob = firebase.bucket.file(file. originalname);

//         //         const blobWriter = blob.createWriteStream({
//         //             metadata: {
//         //                 contentType: file.mimetype
//         //             }
//         //         });

//         //         blobWriter.on('error', (err) => {
//         //             console.log(err);
//         //         });

//         //         blobWriter.on('finish', async () => {
//         //             // const url = await blob.getSignedUrl({
//         //             //     action: 'read',
//         //             //     expires: '03-09-2491'
//         //             // });
//         //             // urls.push(url);
                    
//         //             // if(urls.length === files.length) {
//         //             //     res.status(200).send(urls);
//         //             // }
//         //             console.log("Upload file successfull!");
//         //         });

//         //         blobWriter.end(file.buffer);
//         //     })
//         // }
//     }catch(error){
//         console.log(error);
//         response.status(500).json({
//             "error": 'Internal Server Error'
//         })
//     }
// })

router.post('/create-product', checkAuth, checkRole, async (request, response) => {
    try{
        const name = request.body.name;
        const slogan = request.body.slogan;
        const decription = request.body.decription;
        const notes = request.body.notes;
        const madeIn = request.body.madeIn;
        const uses = request.body.uses;
        const idCategory = request.body.idCategory;
        const attribute1 = request.body.attribute1;
        const attribute2 = request.body.attribute2;
        const atttributeValue1 = request.body.atttributeValue1;
        const atttributeValue2 = request.body.atttributeValue2;
        const quantity = request.body.quantity;
        const price = request.body.price;

        const queryUser = 'SELECT id FROM [User] WHERE id_account = @idAccount';
        const userResult = await database.request()
                                        .input('idAccount', request.userData.uuid)
                                        .query(queryUser);

        const queryProduct = 'INSERT INTO Product(name, slogan, decription, notes, madeIn, uses, priceDisplay, id_Category, id_User) OUTPUT inserted.id  VALUES (@name, @slogan, @decription, @notes, @madeIn, @uses, @priceDisplay, @idCategory, @idUser)';
        const productResult = await database.request()
                                            .input('name', name)
                                            .input('slogan', slogan)
                                            .input('decription', decription)
                                            .input('notes', notes)
                                            .input('madeIn', madeIn)
                                            .input('uses', uses)
                                            .input('priceDisplay', '')
                                            .input('idCategory', idCategory)
                                            .input('idUser', userResult.recordset[0].id)
                                            .query(queryProduct);

        if(attribute1 === ""){
            const updatePriceDisplay = "UPDATE Product SET priceDisplay = @price WHERE id = @idProduct";
            const updateResult = await database.request()
                                                .input('price', price[0])
                                                .input('idProduct', productResult.recordset[0].id)
                                                .query(updatePriceDisplay)
        }
        else if(attribute2 === ""){
            const insertProductAttribute1 = "INSERT INTO Product_attribute1 (name, description, image, id_product) OUTPUT inserted.id VALUES (@name, @description, @image, @idProduct)";
            const insertProductSku = "INSERT INTO Product_sku(quantity, price, idAttribute1, idProduct) VALUES (@quantity, @price, @idAttribute1, @idProduct)";
            for(var x = 0; x < atttributeValue1.length; x++){
                const resultProductAttribute1 = await database.request()
                                                            .input('name', attribute1)
                                                            .input('description', atttributeValue1[x])
                                                            .input('image', '')
                                                            .input('idProduct', productResult.recordset[0].id)
                                                            .query(insertProductAttribute1);

                const resultProductSku = await database.request()
                                                        .input('quantity', quantity[x])
                                                        .input('price', rice[x])
                                                        .input('idAttribute1', resultProductAttribute1.recordset[0].id)
                                                        .input('idProduct', productResult.recordset[0].id)
                                                        .query(insertProductSku);
            }

            const updatePriceDisplay = "UPDATE Product SET priceDisplay = @price WHERE id = @idProduct";
            const priceDisplay = Math.min(...atttributeValue1).toString + ' - ' + Math.max(...atttributeValue1).toString()
            const updateResult = await database.request()
                                                .input('price', priceDisplay)
                                                .input('idProduct', productResult.recordset[0].id)
                                                .query(updatePriceDisplay)
        }else{

        }
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})























































module.exports = router