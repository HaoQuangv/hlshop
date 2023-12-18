const e = require("express");
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
    from: '"HLSHOP Management" <hlshopmanagement280@gmail.com>',
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

function sendMessageVerifyOrder(order) {
  console.log("order", order);
  const mailOptions = {
    from: '"HLSHOP Management"',
    to: order.receiverAddresse.receiverEmail,
    from: '"HLSHOP Management" <hlshopmanagement280@gmail.com>',
    subject: "Order Verification",
    text: `Dear ${order.receiverAddresse.receiverEmail}
    Thank you for choosing HLSHOP for shopping! Here are the details of your order:
    \nOrder Information:
    \nOrder code: ${order.orderCode}
    Order Date: ${new Date().toLocaleString("vi-VN")} 
    \nProducts:\n${order.dataOrderItem.map((item) => {
      return `Product name: ${item.productName}
      -Quantity: ${item.quantity}\n-Price: ${item.price}\n`;
    })}
    \nTotal Funds: ${order.dataOrderItem.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    )}
    Shipping fee: ${order.orderShippingFee.shippingFee}
    Total: ${
      order.dataOrderItem.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      ) + order.orderShippingFee.shippingFee
    }
    \nPayment methods: ${order.paymentMethod === 0 ? "COD" : "MOMO"} 
    \nShipping address: ${order.receiverAddresse.addressDetail}, ${
      order.receiverAddresse.wardName
    }, ${order.receiverAddresse.districtName}, ${
      order.receiverAddresse.cityName
    }
    \nThank you for choosing HLSHOP. We are honored to serve you!
    Respect
    HLSHOP Management`,
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
module.exports.sendMessageVerifyOrder = sendMessageVerifyOrder;
