const express = require('express');
const multer = require('multer');

const router = express.Router();

const database = require('../../config');
const checkAuth = require('../../middleware/check_auth');
const checkRoleAdmin = require('../../middleware/check_role_admin');
const checkRole = require('../../middleware/check_role');
const firebase = require('./firebase');

const storage = multer.memoryStorage();
const upload = multer({storage: storage}).single('file');   

router.post('/create-category', upload, checkAuth, checkRoleAdmin, async (request, response) => {
    try{
        const name = request.body.name;
        var image = '';
        if (!request.file){
            response.status(400).json({
                "message": "Ban chua upload anh"
            })
        }else {
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
                try{
                    const signedUrls = await blob.getSignedUrl({
                        action: 'read',
                        expires: '03-01-2500' // Ngày hết hạn của đường dẫn
                    });
                    const publicUrl = signedUrls[0];
                    image = image + publicUrl;
                    const queryCategory = 'INSERT INTO Category(name, image) VALUES(@name, @image)';
                    const categoryResult = await database.request()
                                                    .input('name', name)
                                                    .input('image', image)
                                                    .query(queryCategory);
    
                    response.status(200).json({
                        "name": name,
                        "image": image
                    })
                }catch(error){
                    console.log(error);
                    response.status(500).json({
                    "error": 'Internal Server Error'
                    })
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

router.put('/update-category', upload, checkAuth, checkRoleAdmin, async (request, response) => {
    try{
        const name = request.body.name;
        const idCategory = request.body.idCategory;
        var image = '';
        if(!request.file){
            const queryCategory = 'UPDATE Category SET name = @name WHERE id = @idCategory';
            const categoryResult = await database.request()
                                            .input('name', name)
                                            .input('idCategory', idCategory)
                                            .query(queryCategory);
    
            response.status(200).json({
                "message": "Upload thanh cong"
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
                try{
                    const signedUrls = await blob.getSignedUrl({
                        action: 'read',
                        expires: '03-01-2500' // Ngày hết hạn của đường dẫn
                    });
                    const publicUrl = signedUrls[0];
                    image = image + publicUrl;
                    const queryCategory = 'UPDATE Category SET name = @name, image = @image WHERE id = @idCategory';
                    const categoryResult = await database.request()
                                                    .input('name', name)
                                                    .input('image', image)
                                                    .input('idCategory', idCategory)
                                                    .query(queryCategory);
    
                    response.status(200).json({
                        "message": "Upload thanh cong"
                    })
                }catch(error){
                    console.log(error);
                    response.status(500).json({
                    "error": 'Internal Server Error'
                    })
                }
            });
    
            blobWriter.end(request.file.buffer);
        }
    }catch{
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.delete('/delete-category', checkAuth, checkRoleAdmin, async (request, response) => {
    try{
        const idCategory = request.body.idCategory;

        const queryCategory = 'DELETE FROM [Category] WHERE id = @idCategory';
        const categoryResult = await database.request()
                                            .input('idCategory', idCategory)
                                            .query(queryCategory);

        response.status(200).json({
            "message": "Xoa category thanh cong"
        })
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

router.get('/get-list', async (request, response) => {
    try{
        var page= request.query.page;
        var pageSize = request.query.pageSize;


        console.log(typeof(page));
        console.log(typeof(pageSize));
        if (page == null || page < 1) {
            page = 1;
        }
    
        if (pageSize == null) {
            pageSize = 10;
        }

        page = (page - 1) * pageSize;
        
        const queryCategory = 'SELECT * FROM Category ORDER BY name OFFSET @page ROWS FETCH NEXT @pageSize ROWS ONLY'
        const categoryResult = await database.request()
                                            .input('page', parseInt(page))
                                            .input('pageSize', parseInt(pageSize))
                                            .query(queryCategory)

        response.status(200).json({
            "result": categoryResult.recordset
        })
    }catch(error){
        console.log(error);
        response.status(500).json({
            "error": 'Internal Server Error'
        })
    }
})

module.exports = router