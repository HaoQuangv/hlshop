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
    from: '"HLSHOP Management" <quangquangquangquang67@gmail.com>',
    to: email,
    subject: "OTP Verification",
    text: `Dear ${email}\nYour OTP code is: ${otp}\nIf you don't require this code, you can safely ignore this email. It's possible that someone else entered your email address by mistake.\n\nThank you,\nHLSHOP Management`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Lỗi gửi email:", error);
    } else {
      console.log("Gửi email thành công đến " + email + ": " + otp);
    }
  });
}

function sendMessageVerifyOrder(email, orderCode, orderDate, products, totalFund, shippingFee, total, address, payment) {
  const mailOptions = {
    from: '"HLSHOP Management"',
    to: email,
    subject: "Order Verification",
    text: `Dear ${email}\nThank you for choosing HLSHOP for shopping! Here are the details of your order:\n\nOrder Information:\n-Order code: ${orderCode}\nOrder Date: ${orderDate}\n\nProducts:\n${products}\n\nTotal Funds: ${totalFund}\n\nShipping fee: ${shippingFee}\n\nTotal: ${total}\n\nShipping address: ${address}\n\nPayment methods: ${payment}\n\nThank you for choosing HLSHOP. We are honored to serve you!\nRespect\nHLSHOP Management`,
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
