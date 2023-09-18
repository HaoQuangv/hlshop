const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Hlshop',
    description: 'API Hlshop',
  },
  host: 'localhost:3000',
  schemes: ['http'],
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./index.js'];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    require('./index.js'); // Your project's root file
});