const express = require('express');
const bodyParser = require('body-parser')
require('dotenv').config();

const app = express();

//import file
const accountRouter = require('./api/routes/account');
const port = process.env.port;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//use method from file
app.use('/account', accountRouter);

app.listen(port, () => console.log(`Server is running on port ${port}`))

