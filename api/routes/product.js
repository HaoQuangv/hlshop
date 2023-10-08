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

router.post('/create-media-product', upload.array('file', 9), checkAuth, checkRole, async (request, response) => {
    try{
        const idProduct = request.body.idProduct
        var urls = [];

        if (!request.files){
            response.status(400).json({
                "Message": "Khong tim thay file"
            })
        }
        else{
            console.log(27);
            const files = request.files;

            files.forEach(file => {
                const blob = firebase.bucket.file(file. originalname);
                console.log(32);
                const blobWriter = blob.createWriteStream({
                    metadata: {
                        contentType: file.mimetype
                    }
                });

                blobWriter.on('error', (err) => {
                    console.log(err);
                });

                blobWriter.on('finish', async () => {
                    const url = await blob.getSignedUrl({
                        action: 'read',
                        expires: '03-09-2491'
                    });
                    var publicUrl = url[0];
                    urls.push(publicUrl);
                    
                    const queryMedia = "INSERT INTO Media(linkString, title, description, id_product) VALUES (@linkString, @title, @description, @idProduct)";
                    const mediaResult = await database.request()
                                                    .input('linkString', publicUrl)
                                                    .input('title','')
                                                    .input('description', '')
                                                    .input('idProduct', idProduct)
                                                    .query(queryMedia);
                });

                blobWriter.end(file.buffer);
            })

            response.status(200).json({
                "Message": "Uoload successful!"            
            })                   
        }
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

// router.post('/create-media-product', upload.array('file', 9), checkAuth, checkRole, async (request, response) => {
//     try{
//         const idProduct = request.body.idProduct
//         var urls = [];

//         if (!request.files){
//             response.status(400).json({
//                 "Message": "Khong tim thay file"
//             })
//         }
//         else{
//             console.log(27);
//             const files = request.files;

//             // Tạo một mảng các Promise
//             let promises = files.map(file => {
//                 return new Promise((resolve, reject) => {
//                     const blob = firebase.bucket.file(file.originalname);
//                     const blobWriter = blob.createWriteStream({
//                         metadata: {
//                             contentType: file.mimetype
//                         }
//                     });

//                     blobWriter.on('error', (err) => {
//                         console.log(err);
//                         reject(err);
//                     });

//                     blobWriter.on('finish', async () => {
//                         const url = await blob.getSignedUrl({
//                             action: 'read',
//                             expires: '03-09-2491'
//                         });
//                         var publicUrl = url[0];
//                         urls.push(publicUrl);

//                         const queryMedia = "INSERT INTO Media(linkString, title, description, id_product) VALUES (@linkString, @title, @description, @idProduct)";
//                         const mediaResult = await database.request()
//                                                         .input('linkString', publicUrl)
//                                                         .input('title','')
//                                                         .input('description', '')
//                                                         .input('idProduct', idProduct)
//                                                         .query(queryMedia);
//                         resolve();
//                     });

//                     blobWriter.end(file.buffer);
//                 });
//             });

//             // Chờ tất cả các Promise hoàn thành
//             Promise.all(promises).then(() => {
//                 console.log(...urls)
//                 response.status(200).json({
//                     "Media": urls
//                 })  
//             }).catch(error => {
//                 console.log(error);
//                 response.status(500).json({
//                     "error": 'Internal Server Error'
//                 })
//             });                 
//         }
//     }catch(error){
//         console.log(error);
//         response.status(500).json({
//             "error": 'Internal Server Error'
//         })
//     }
// })

router.post('/create-media-attribute', upload.single('file'), checkAuth, checkRole, async (request, response) => {
    try{
        const idAttribute = request.body.idAttribute;
        console.log(idAttribute)
        if (!request.file){
            response.status(400).json({
                "Message": "Khong tim thay file"
            })
        }
        else{
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
                        
                    const queryAttribute = "UPDATE Product_attribute1 SET image = @image WHERE id = @idAttribute";
                    const resultAttribute = await database.request()
                                                        .input('image', publicUrl)
                                                        .input('idAttribute', idAttribute)
                                                        .query(queryAttribute);
                        
                    response.status(201).json({
                            "Message": "Upload successful!"         
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

        var arrayIdAttribureValue1 = [];
        var arrayIdAttribureValue2 = [];
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

            const insertProductSku = "INSERT INTO Product_sku(quantity, price, idAttribute1, idAttribute2, idProduct) VALUES (@quantity, @price, @idAttribute1, @idAttribute2, @idProduct)";
            const resultProductSku = await database.request()
                                                .input('quantity', quantity[0])
                                                .input('price', price[0])
                                                .input('idAttribute1', "")
                                                .input('idAttribute2', "")
                                                .input('idProduct', productResult.recordset[0].id)
                                                .query(insertProductSku);
        }
        else if(attribute2 === ""){
            const insertProductAttribute1 = "INSERT INTO Product_attribute1 (name, description, image, id_product) OUTPUT inserted.id VALUES (@name, @description, @image, @idProduct)";
            const insertProductSku = "INSERT INTO Product_sku(quantity, price, idAttribute1, idAttribute2, idProduct) VALUES (@quantity, @price, @idAttribute1, @idAttribute2, @idProduct)";
            for(var x = 0; x < atttributeValue1.length; x++){
                const resultProductAttribute1 = await database.request()
                                                            .input('name', attribute1)
                                                            .input('description', atttributeValue1[x])
                                                            .input('image', '')
                                                            .input('idProduct', productResult.recordset[0].id)
                                                            .query(insertProductAttribute1);

                const resultProductSku = await database.request()
                                                        .input('quantity', quantity[x])
                                                        .input('price', price[x])
                                                        .input('idAttribute1', resultProductAttribute1.recordset[0].id)
                                                        .input('idAttribute2', "")
                                                        .input('idProduct', productResult.recordset[0].id)
                                                        .query(insertProductSku);
            }

            const updatePriceDisplay = "UPDATE Product SET priceDisplay = @price WHERE id = @idProduct";
            const priceDisplay = Math.min(...price).toString() + ' - ' + Math.max(...price).toString()
            const updateResult = await database.request()
                                                .input('price', priceDisplay)
                                                .input('idProduct', productResult.recordset[0].id)
                                                .query(updatePriceDisplay)
        }else{
            const insertProductAttribute1 = "INSERT INTO Product_attribute1 (name, description, image, id_product) OUTPUT inserted.id VALUES (@name, @description, @image, @idProduct)";
            const insertProductAttribute2 = "INSERT INTO Product_attribute2 (name, description, id_product) OUTPUT inserted.id VALUES (@name, @description, @idProduct)";
            const insertProductSku = "INSERT INTO Product_sku(quantity, price, idAttribute1, idAttribute2, idProduct) VALUES (@quantity, @price, @idAttribute1, @idAttribute2, @idProduct)";

            for(var i = 0; i < atttributeValue1.length; i++){
                const resultProductAttribute1 = await database.request()
                                                            .input('name', attribute1)
                                                            .input('description', atttributeValue1[i])
                                                            .input('image', '')
                                                            .input('idProduct', productResult.recordset[0].id)
                                                            .query(insertProductAttribute1);

                arrayIdAttribureValue1.push(resultProductAttribute1.recordset[0].id);
            }

            for(var j = 0; j < atttributeValue2.length; j++){
                const resultProductAttribute2 = await database.request()
                                                            .input('name', attribute2)
                                                            .input('description', atttributeValue2[j])
                                                            .input('idProduct', productResult.recordset[0].id)
                                                            .query(insertProductAttribute2)

                arrayIdAttribureValue2.push(resultProductAttribute2.recordset[0].id);
            }

            var x = 0;
            for(var i = 0 ; i < arrayIdAttribureValue1.length; i++){
                for(var j = 0; j < arrayIdAttribureValue2.length; j++){
                    const resultProductSku = await database.request()
                                                        .input('quantity', quantity[x])
                                                        .input('price', price[x])
                                                        .input('idAttribute1', arrayIdAttribureValue1[i])
                                                        .input('idAttribute2', arrayIdAttribureValue2[j])
                                                        .input('idProduct', productResult.recordset[0].id)
                                                        .query(insertProductSku);

                    x++;
                }
            }

            const updatePriceDisplay = "UPDATE Product SET priceDisplay = @price WHERE id = @idProduct";
            const priceDisplay = Math.min(...price).toString() + ' - ' + Math.max(...price).toString()
            const updateResult = await database.request()
                                                .input('price', priceDisplay)
                                                .input('idProduct', productResult.recordset[0].id)
                                                .query(updatePriceDisplay)
            
            response.status(200).json({
                "idProduct": productResult.recordset[0].id,
                "arrayAttributeValue1": arrayIdAttribureValue1,
                "arrayAttributeValue1": arrayIdAttribureValue2
            })
        }
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.get('/get-detail', async (request, response) => {
    try{
        const idProduct = request.query.idProduct;

        var medias = [];
        var skus = [];
        const queryProduct = "SELECT * FROM Product WHERE id = @idProduct"
        const resultProduct = await database.request()
                                            .input('idProduct', idProduct)
                                            .query(queryProduct)
        
        const queryMedia = "SELECT * FROM Media WHERE id_product = @idProduct";
        const resultMedia = await database.request()
                                        .input('idProduct', idProduct)
                                        .query(queryMedia)
        const queryCategory = "SELECT * FROM Category WHERE id = @idCategory";
        const resultCategory = await database.request()
                                            .input('idCategory', resultProduct.recordset[0].id_Category)
                                            .query(queryCategory);

        const queryUser = "SELECT * FROM [User] WHERE id = @idUser"
        const resultUser = await database.request()
                                        .input('idUser', resultProduct.recordset[0].id_User)
                                        .query(queryUser)

        const queryProductSku = "SELECT* from Product_sku WHERE idProduct =  @idProduct"
        const resultProductSku = await database.request()
                                                .input('idProduct', idProduct)
                                                .query(queryProductSku)

        
        for (var x = 0; x < resultMedia.recordset.length; x++){
            var media = {};
            media['mediaID'] = resultMedia.recordset[x].id;
            media['linkString'] = resultMedia.recordset[x].linkString;
            media['title'] = resultMedia.recordset[x].title;
            media['description'] = resultMedia.recordset[x].description;

            medias.push(media);
        }

        for (var x = 0; x < resultProductSku.recordset.length; x++){
            var sku = {};
            sku['skuID'] = resultProductSku.recordset[x].id;
            sku['quantity'] = resultProductSku.recordset[x].quantity;
            sku['price'] = resultProductSku.recordset[x].price;
            sku['idAttribute1'] = resultProductSku.recordset[x].idAttribute1;
            sku['idAttribute2'] = resultProductSku.recordset[x].idAttribute2;


            skus.push(sku);
        }
        response.status(200).json({
            "productID": resultProduct.recordset[0].id,
            "sellerID": resultProduct.recordset[0].id_User,
            "productName": resultProduct.recordset[0].name,
            "productNotes": resultProduct.recordset[0].notes,
            "productSlogan": resultProduct.recordset[0].slogan,
            "productMadeIn": resultProduct.recordset[0].madeIn,
            "productUses": resultProduct.recordset[0].uses,
            "medias": medias,
            "productCategory": {
                "productCategoryID": resultCategory.recordset[0].id,
                "productCategoryName": resultCategory.recordset[0].name,
                "linkString": resultCategory.recordset[0].image
            },
            "seller": {
                "firstName": resultUser.recordset[0].first_name,
                "lastName": resultUser.recordset[0].last_name,
                "address": resultUser.recordset[0].address,
                "image": resultUser.recordset[0].image
            },
            "productSKU": skus
        })
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.get('/get-product-sku-detail', async (request, response) => {
    try{
        const idProduct = request.body.idProduct;
        const attributes = request.body.attributes;

        const queryAttribute1 = "SELECT id FROM Product_attribute1 WHERE id_product = @idProduct AND description = @description"
        const resultAttribute1 = await database.request()
                                                .input('idProduct', idProduct)
                                                .input('description', attributes[0])
                                                .query(queryAttribute1)
        const queryAttribute2 = "SELECT id FROM Product_attribute2 WHERE id_product = @idProduct AND description = @description"
         const resultAttribute2 = await database.request()
                                                .input('idProduct', idProduct)
                                                .input('description', attributes[1])
                                                .query(queryAttribute2)

        const querySkuDetail = "SELECT * FROM Product_sku WHERE idProduct = @idProduct AND idAttribute1 = @idAttribute1 AND idAttribute2 = @idAttribute2"
        const resultSkuDetail = await database.request()
                                            .input('idProduct', idProduct)
                                            .input('idAttribute1', resultAttribute1.recordset[0].id)
                                            .input('idAttribute2', resultAttribute2.recordset[0].id)
                                            .query(querySkuDetail)

        response.status(200).json({
            "price": resultSkuDetail.recordset[0].price,
            "quantity": resultSkuDetail.recordset[0].quantity
        })
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})





















































module.exports = router