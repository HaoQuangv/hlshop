const nodemailer = require("nodemailer");
require("dotenv").config();
const path = require("path");
var hbs = require("nodemailer-express-handlebars");
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

const handlebarOptions = {
  viewEngine: {
    extName: ".handlebars",
    partialsDir: path.resolve(__dirname, "../views"),
    defaultLayout: false,
  },
  viewPath: path.resolve(__dirname, "../views"),
  extName: ".handlebars",
};
transporter.use("compile", hbs(handlebarOptions));

// Gửi email chứa OTP
function sendOTP(email, otp) {
  var mailOptions = {
    from: '"HLSHOP Management" <hlshopmanagement280@gmail.com>',
    to: email,
    subject: "OTP Verification",
    template: "otp-email",
    context: {
      otp: otp,
      email: email,
    },
  };
  // var mailOptions = {
  //   from: '"HLSHOP Management"',
  //   to: email,
  //   subject: "OTP Verification",
  //   text: `Dear ${email}\nYour OTP code is: ${otp}\nIf you don't require this code, you can safely ignore this email. It's possible that someone else entered your email address by mistake.\n\nThank you,\nHLSHOP Management`,
  // };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Lỗi gửi email:", error);
    } else {
      console.log("Gửi email thành công đến " + email + ": " + otp);
    }
  });
}

function sendMessageVerifyOrder(order) {
  const formatToVND = (amount) => {
    return amount.toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
    });
  };
  let shippingFee = formatToVND(order.orderShippingFee.shippingFee);

  const totalPrice = formatToVND(
    order.dataOrderItem.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    )
  );
  let TotalOrder = formatToVND(order.totalOrder);
  // Mảng dữ liệu
  order.dataOrderItem = order.dataOrderItem.map((item) => {
    // Thay đổi giá thành VND
    item.price = formatToVND(item.price);
    item.priceBefore = formatToVND(item.priceBefore);
    return item;
  });
  console.log("order.dataOrderItem: " + order.dataOrderItem);
  const statusToString = (status) => {
    switch (status) {
      case 0:
        return "Đặt hàng thành công";
      case 1:
        return "Đơn hàng đã duyệt từ người bán";
      case 2:
        return "Đơn hàng đang được đóng gói";
      case 3:
        return "Đơn hàng đang giao đến bạn";
      case 4:
        return "Đơn hàng đã giao thành công";
      case 5:
        return "Đơn hàng đã hủy bởi bạn";
      case 6:
        return "Đơn hàng đã hủy bởi người bán";
      case 7:
        return "Đơn hàng đã trả hàng";
      default:
        return "Đang xử lý";
    }
  };

  const paymentMethodToString = (paymentMethod) => {
    switch (paymentMethod) {
      case 0:
        return "COD - Thanh toán khi nhận hàng";
      case 1:
        return "Thanh toán trực tuyến - Momo";
      default:
        return "Đang xử lý";
    }
  };

  const statusdateOrderStatus = (status) => {
    switch (status) {
      case 0:
        return "";
      case 1:
        return "Date approve";
      case 2:
        return "Date packing";
      case 3:
        return "Date shipping";
      case 4:
        return "Date success";
      case 5:
        return "Date cancel";
      case 6:
        return "Date cancel";
      case 7:
        return "Date return";
      default:
        return "Đang xử lý";
    }
  };

  const processDate = (date) => {
    let dateProcess = new Date(date);
    return (
      dateProcess.getDate() +
      "/" +
      (dateProcess.getMonth() + 1) +
      "/" +
      dateProcess.getFullYear()
    );
  };

  var mailOptions = {
    from: '"HLSHOP Management" <hlshopmanagement280@gmail.com>',
    to: order.receiverAddresse.receiverEmail,
    subject: "Order Verification",
    template: "order-email",
    context: {
      receiverAddresse: order.receiverAddresse,
      dataOrderItem: order.dataOrderItem,
      orderCode: order.orderCode,
      paymentMethod: paymentMethodToString(order.paymentMethod),
      statusToString: statusToString(order.orderStatus),
      dateCreateOrder: processDate(order.dateCreateOrder),
      statusdateOrderStatus: statusdateOrderStatus(order.orderStatus),
      dateOrderStatus:
        order.orderStatus === 0 ? "" : processDate(order.dateOrderStatus),
      Subtotal: totalPrice,
      orderShippingFee: shippingFee,
      TotalOrder: TotalOrder,
    },
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Lỗi gửi email:", error);
    } else {
      console.log(
        "Gửi email thành công đến " + order.receiverAddresse.receiverEmail
      );
    }
  });
}

function sendMessageThanksPayment(order) {
  const formatToVND = (amount) => {
    return amount.toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
    });
  };
  let TotalOrder = formatToVND(order.totalOrder);
  // Mảng dữ liệu
  order.dataOrderItem = order.dataOrderItem.map((item) => {
    // Thay đổi giá thành VND
    item.price = formatToVND(item.price);
    item.priceBefore = formatToVND(item.priceBefore);
    return item;
  });

  const paymentMethodToString = (paymentMethod) => {
    switch (paymentMethod) {
      case 0:
        return "COD - Thanh toán khi nhận hàng";
      case 1:
        return "Thanh toán trực tuyến - Momo";
      default:
        return "Đang xử lý";
    }
  };

  const processDate = (date) => {
    let dateProcess = new Date(date);
    return (
      dateProcess.getDate() +
      "/" +
      (dateProcess.getMonth() + 1) +
      "/" +
      dateProcess.getFullYear()
    );
  };

  var mailOptions = {
    from: '"HLSHOP Management" <hlshopmanagement280@gmail.com>',
    to: order.receiverAddresse.receiverEmail,
    subject: "Thanks for your payment",
    template: "thanks-payment",
    context: {
      receiverAddresse: order.receiverAddresse,
      orderCode: order.orderCode,
      paymentMethod: paymentMethodToString(order.paymentMethod),
      dateCreateOrder: processDate(order.dateCreateOrder),
      TotalOrder: TotalOrder,
    },
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Lỗi gửi email:", error);
    } else {
      console.log(
        "Gửi email thành công đến " + order.receiverAddresse.receiverEmail
      );
    }
  });
}

function sendMessagePaymentRefund(order) {
  const formatToVND = (amount) => {
    return amount.toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
    });
  };
  let TotalOrder = formatToVND(order.totalOrder);
  // Mảng dữ liệu
  order.dataOrderItem = order.dataOrderItem.map((item) => {
    // Thay đổi giá thành VND
    item.price = formatToVND(item.price);
    item.priceBefore = formatToVND(item.priceBefore);
    return item;
  });

  const paymentMethodToString = (paymentMethod) => {
    switch (paymentMethod) {
      case 0:
        return "COD - Thanh toán khi nhận hàng";
      case 1:
        return "Thanh toán trực tuyến - Momo";
      default:
        return "Đang xử lý";
    }
  };

  const processDate = (date) => {
    let dateProcess = new Date(date);
    return (
      dateProcess.getDate() +
      "/" +
      (dateProcess.getMonth() + 1) +
      "/" +
      dateProcess.getFullYear()
    );
  };

  var mailOptions = {
    from: '"HLSHOP Management" <hlshopmanagement280@gmail.com>',
    to: order.receiverAddresse.receiverEmail,
    subject: "Payment Refund",
    template: "payment-refund",
    context: {
      receiverAddresse: order.receiverAddresse,
      orderCode: order.orderCode,
      paymentMethod: paymentMethodToString(order.paymentMethod),
      dateCreateOrder: processDate(order.dateCreateOrder),
      TotalOrder: TotalOrder,
    },
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Lỗi gửi email:", error);
    } else {
      console.log(
        "Gửi email thành công đến " + order.receiverAddresse.receiverEmail
      );
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
module.exports.sendMessageThanksPayment = sendMessageThanksPayment;
module.exports.sendMessagePaymentRefund = sendMessagePaymentRefund;
