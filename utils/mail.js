const nodemailer = require('nodemailer');
require('dotenv').config();

const mail = process.env.mail;
const password = process.env.password;

// Tạo transporter cho Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: mail,
      pass: password,
    },
  });

// Gửi email chứa OTP
function sendOTP(email, otp) {
  const mailOptions = {
    from: mail,
    to: email,
    subject: 'Xác nhận đăng ký tài khoản',
    text: `Mã OTP của bạn là: ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Lỗi gửi email:', error);
    } else {
      console.log('Đã gửi email:', info.response);
    }
  });
}

function getRandomInt() {
  return Math.floor(Math.random() * 899999 + 100000);
}

module.exports.sendOTP = sendOTP;
module.exports.getRandomInt = getRandomInt;