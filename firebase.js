const serviceAccount = require('./firebase-admin-config.json')
const admin = require('firebase-admin');


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "hlsop-393ef.appspot.com"
});

const bucket = admin.storage().bucket()

module.exports = { 
    bucket 
}