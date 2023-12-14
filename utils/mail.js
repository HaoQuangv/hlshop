const nodemailer = require("nodemailer");
require("dotenv").config();

const mail = process.env.mail;
const password = process.env.password;

// Tạo transporter cho Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
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
    subject: "OTP Verification",
    text: `Mã OTP của bạn là: ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Lỗi gửi email:", error);
    } else {
      console.log("Gửi email thành công đến " + email + ": " + otp);
    }
  });
}

function getRandomInt() {
  const ran = Math.floor(Math.random() * 8999 + 1000);
  console.log("OTP: " + ran);
  return ran;
}

module.exports.sendOTP = sendOTP;
module.exports.getRandomInt = getRandomInt;
