const express = require('express');
const router = express.Router();

const database = require("../../config");
const checkAuth = require("../../middleware/check_auth")
const checkRole = require("../../middleware/check_role_user");

router.post('/add-cart', checkAuth, checkRole, async (request, response) => {
    try {
        //const idProduct = request.body.idProduct;
        const idProductSku = request.body.idProductSku;
        const quantity = request.body.quantity;

        const queryUser = 'SELECT id FROM [User] WHERE id_account = @idAccount';
        const userResult = await database.request()
            .input('idAccount', request.userData.uuid)
            .query(queryUser);

        const queryExitCart = "SELECT * FROM Cart WHERE idProductSku = @idProductSku AND id_user = @userID";
        const exitCartResult = await database.request()
            .input('idProductSku', idProductSku)
            .input('userID', userResult.recordset[0].id)
            .query(queryExitCart)

        if (exitCartResult.recordset.length !== 0) {
            const queryUpdateCart = "UPDATE Cart SET quantity = quantity + @quantity WHERE id = @idCart"
            const updateCartResult = await database.request()
                .input('quantity', quantity)
                .input('idCart', exitCartResult.recordset[0].id)
                .query(queryUpdateCart);
        } else {
            const queryCart = "INSERT INTO Cart(id_user, quantity, idProductSku) VALUES (@idUser, @quantity, @idProductSku)"
            const resultCart = await database.request()
                .input('idUser', userResult.recordset[0].id)
                .input('quantity', quantity)
                .input('idProductSku', idProductSku)
                .query(queryCart)
        }
        response.status(201).json({
            "status": 200,
            "message": "Add Cart successful"
        })
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.post('/update-quantity-cart', checkAuth, checkRole, async (request, response) => {
    try {
        const idCart = request.body.idCart;
        const quantity = request.body.quantity;

        const queryCart = "UPDATE Cart SET quantity = @quantity WHERE id = @idCart"
        const cartResult = await database.request()
            .input('quantity', quantity)
            .input('idCart', idCart)
            .query(queryCart);

        response.status(200).json({
            "status": 200,
            "message": "Update quantity cart success",
            "cart": {
                "cartID": idCart,
                "quantity": quantity
            }
        })
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.get('/get-list-cart', checkAuth, checkRole, async (request, response) => {
    try {
        const queryUser = 'SELECT * FROM [User] WHERE id_account = @idAccount';
        const userResult = await database.request()
            .input('idAccount', request.userData.uuid)
            .query(queryUser);

        const queryCart = "SELECT * FROM Cart WHERE id_user = @idUser"
        const cartResult = await database.request()
            .input('idUser', userResult.recordset[0].id)
            .query(queryCart);

        const queryProduct = "SELECT * FROM Product WHERE id = @idProduct";

        const queryProductSku = "SELECT * FROM ProductSku WHERE id = @idProductSku";

        const queryAttributeValue1 = "SELECT * FROM ProductAttributeValue WHERE id = @idAttributeValue1";

        const queryAttributeValue2 = "SELECT * FROM ProductAttributeValue WHERE id = @idAttributeValue2";

        const queryAttribute1 = "SELECT * FROM ProductAttribute WHERE id = @idAttribute1"

        const queryAttribute2 = "SELECT * FROM ProductAttribute WHERE id = @idAttribute2"

        const queryMedia = "SELECT linkString FROM Media WHERE id_product = @idProduct AND isDefault = 1";

        var carts = [];
        console.log(cartResult.recordset.length);

        for (var i = 0; i < cartResult.recordset.length; i++) {
            var attributes = [];
            var media = "Đây là ảnh mặc định";

            var productSkuResult = await database.request()
                .input('idProductSku', cartResult.recordset[i].idProductSku)
                .query(queryProductSku);

            //console.log(productSkuResult.recordset[0].idProduct);
            console.log(productSkuResult.recordset);

            var productResult = await database.request()
                .input('idProduct', productSkuResult.recordset[0].idProduct)
                .query(queryProduct)

            if (productSkuResult.recordset[0].idAttributeValue1 !== null) {

                var resultAttributeValue1 = await database.request()
                    .input('idAttributeValue1', productSkuResult.recordset[0].idAttributeValue1)
                    .query(queryAttributeValue1);

                var resultAttribute1 = await database.request()
                    .input('idAttribute1', resultAttributeValue1.recordset[0].productAttributeID)
                    .query(queryAttribute1);

                media = resultAttributeValue1.recordset[0].linkString;

                var attribute = {
                    "locAttributeValueName": resultAttributeValue1.recordset[0].valueName,
                    "locAttributeValueDescription": resultAttributeValue1.recordset[0].valueName,
                    "attributeValueID": resultAttributeValue1.recordset[0].id,
                    "locAttributeName": resultAttribute1.recordset[0].name,
                    "attributeID": resultAttribute1.recordset[0].id
                }

                attributes.push(attribute);
            }

            if (productSkuResult.recordset[0].idAttributeValue2 !== null) {
                console.log(141)
                var resultAttributeValue2 = await database.request()
                    .input('idAttributeValue2', productSkuResult.recordset[0].idAttributeValue2)
                    .query(queryAttributeValue2);

                //console.log(resultAttributeValue2.recordset);

                var resultAttribute2 = await database.request()
                    .input('idAttribute2', resultAttributeValue2.recordset[0].productAttributeID)
                    .query(queryAttribute2);

                var attribute = {
                    "locAttributeValueName": resultAttributeValue2.recordset[0].valueName,
                    "locAttributeValueDescription": resultAttributeValue2.recordset[0].valueName,
                    "attributeValueID": resultAttributeValue2.recordset[0].id,
                    "locAttributeName": resultAttribute2.recordset[0].name,
                    "attributeID": resultAttribute2.recordset[0].id
                }

                attributes.push(attribute);
            }

            if (attributes.length === 0) {
                var mediaResult = await database.request()
                    .input('idProduct', productSkuResult.recordset[0].idProduct)
                    .query(queryMedia)

                media = mediaResult.recordset[0].linkString;
            }
            var cart = {
                "cartID": cartResult.recordset[i].id,
                "productID": cartResult.recordset[i].idProduct,
                "productDescription": productResult.recordset[0].decription,
                "productSKUID": cartResult.recordset[i].idProductSku,
                "medias": [{ linkString: media }],
                "quantity": cartResult.recordset[i].quantity,
                "price": productSkuResult.recordset[0].price,
                "attribute": attributes
            };

            carts.push(cart);
        }

        response.status(200).json({
            "sellerID": userResult.recordset[0].id,
            "sellerContactFullName": userResult.recordset[0].contactFullName,
            "sellerBusinessName": userResult.recordset[0].address,
            "dataCart": carts
        })
    } catch (error) {
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})
module.exports = router