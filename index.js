const express = require('express');
const bodyParser = require('body-parser')
require('dotenv').config();

const app = express();

//import file
const accountRouter = require('./api/routes/account');

const userRouter = require('./api/routes/user');
const port = process.env.port;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//use method from file
app.use('/account', accountRouter);
app.use('/user', userRouter);
// app.get('/', function (request, response) {
//     response.send("Hello word, this is group 08")
// })

const router = require('express').Router();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');

router.use('/api-docs', swaggerUi.serve);
router.get('/api-docs', swaggerUi.setup(swaggerDocument));

app.use('/', router);
app.listen(port, () => console.log(`Server is running on port ${port}`))

