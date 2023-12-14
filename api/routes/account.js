const express = require("express");
const router = express.Router();

const mail_util = require("../../utils/mail");
const database = require("../../config");
const jwt = require("jsonwebtoken");
const e = require("express");
require("dotenv").config();

router.post("/signup-email", async (request, response) => {
  try {
    const email = request.body.userLogin;
    const password = request.body.password;
    const query =
      "SELECT id, isVerify FROM Account WHERE userLogin = @userLogin";
    const result = await database
      .request()
      .input("userLogin", email)
      .query(query);

    if (result.recordset.length !== 0) {
      if (result.recordset[0].isVerify === 0) {
        response.status(400).json({
          errorCode: "MSG0046",
          message: "Account is not verified",
          userLogin: email,
          userID: result.recordset[0].id,
        });
        return;
      } else {
        response.status(400).json({
          errorCode: "MSG0044",
          message: "Account is existing",
          userLogin: email,
          userID: result.recordset[0].id,
        });
        return;
      }
    } else {
      const role = 1;
      const createdDate = new Date();
      const expired = new Date(createdDate.getTime() + 60000);
      const isVerify = 0; //Lúc đăng ký chưa xác nhận thì có giá trị 0, sau khi xác nhận thì có giá trị 1

      const queryAccount =
        "INSERT INTO Account(userLogin, password, role, isVerify , createdDate) OUTPUT inserted.id VALUES (@email, @password, @role, @isVerify, @createdDate)";
      const accountResult = await database
        .request()
        .input("email", email)
        .input("password", password)
        .input("role", role)
        .input("isVerify", isVerify)
        .input("createdDate", createdDate)
        .query(queryAccount);

      var otp = mail_util.getRandomInt();
      mail_util.sendOTP(email, otp);

      const insertedAccountId = accountResult.recordset[0].id;

      const queryOtp =
        "INSERT INTO Otp(value, createdDate, id_account) OUTPUT inserted.id VALUES (@value, @createdDate, @id_account)";
      const otpResult = await database
        .request()
        .input("value", otp)
        .input("createdDate", createdDate)
        .input("id_account", insertedAccountId)
        .query(queryOtp);

      response.status(201).json({
        userID: insertedAccountId,
        uuid: otpResult.recordset[0].id,
        userLogin: email,
        today: createdDate.toISOString(),
        expired: expired.toISOString(),
        otp: otp.toString(),
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/signup-phone", async (request, response) => {
  try {
    const phone = request.body.userLogin;
    const password = request.body.password;
    const query =
      "SELECT id, isVerify FROM Account WHERE userLogin = @userLogin";
    const result = await database
      .request()
      .input("userLogin", phone)
      .query(query);

    if (result.recordset.length !== 0) {
      if (result.recordset[0].isVerify === 0) {
        response.status(400).json({
          errorCode: "MSG0046",
          message: "Account is not verified",
          userLogin: phone,
          userID: result.recordset[0].id,
        });
        return;
      } else {
        response.status(400).json({
          errorCode: "MSG0044",
          message: "Account is existing",
          userLogin: phone,
          userID: result.recordset[0].id,
        });
        return;
      }
    } else {
      const role = 1;
      const createdDate = new Date();
      const expired = new Date(createdDate.getTime() + 60000);
      const isVerify = 0; //Lúc đăng ký chưa xác nhận thì có giá trị 0, sau khi xác nhận thì có giá trị 1

      const queryAccount =
        "INSERT INTO Account(userLogin, password, role, isVerify , createdDate) OUTPUT inserted.id VALUES (@phone, @password, @role, @isVerify, @createdDate)";
      const accountResult = await database
        .request()
        .input("phone", phone)
        .input("password", password)
        .input("role", role)
        .input("isVerify", isVerify)
        .input("createdDate", createdDate)
        .query(queryAccount);

      var otp = mail_util.getRandomInt();

      const insertedAccountId = accountResult.recordset[0].id;

      const queryOtp =
        "INSERT INTO Otp(value, createdDate, id_account) OUTPUT inserted.id VALUES (@value, @createdDate, @id_account)";
      const otpResult = await database
        .request()
        .input("value", otp)
        .input("createdDate", createdDate)
        .input("id_account", insertedAccountId)
        .query(queryOtp);

      response.status(201).json({
        userID: insertedAccountId,
        uuid: otpResult.recordset[0].id,
        userLogin: phone,
        today: createdDate.toISOString(),
        expired: expired.toISOString(),
        otp: otp.toString(),
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/verify-otp", async (request, response) => {
  try {
    const idAccount = request.body.userID;
    const idOtp = request.body.uuid;
    const otp = request.body.otp;

    const query =
      "SELECT * FROM Otp WHERE id_account = @idAccount AND createdDate = (SELECT MAX(createdDate) FROM OTP ) AND id = @idOtp";
    const result = await database
      .request()
      .input("idAccount", idAccount)
      .input("idOtp", idOtp)
      .query(query);

    const today = new Date();
    const expired = today.getTime() - result.recordset[0].createdDate.getTime();
    if (expired < 60000) {
      if (result.recordset[0].value === parseInt(otp)) {
        const queryAccount =
          "UPDATE Account SET isVerify  = 1 OUTPUT inserted.userLogin WHERE id = @idAccount";
        const accountResult = await database
          .request()
          .input("idAccount", idAccount)
          .query(queryAccount);

        const queryUser =
          "INSERT INTO [User] (id_account, createdDate) VALUES(@idAccount, @createDated)";
        const userResult = await database
          .request()
          .input("idAccount", idAccount)
          .input("createDated", result.recordset[0].createdDate)
          .query(queryUser);

        const token = jwt.sign({ uuid: idAccount }, process.env.privateKey, {
          expiresIn: "10h",
        });
        response.status(201).json({
          token: token,
          userID: idAccount,
          userLogin: accountResult.recordset[0].userLogin,
          accountType: 1,
        });
      } else {
        response.status(400).json({
          errorCode: "MSG0008",
          message: "Mã otp của bạn bị sai",
        });
      }
    } else {
      response.status(400).json({
        errorCode: "MSG0043",
        message: "Mã otp của bạn  đã quá hạn!",
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/resend-otp-email", async (request, response) => {
  try {
    const idAccount = request.body.userID;
    const query = "SELECT userLogin FROM Account WHERE id = @idAccount";
    const result = await database
      .request()
      .input("idAccount", idAccount)
      .query(query);

    if (result.recordset.length !== 0) {
      const mail = result.recordset[0].userLogin;

      var otp = mail_util.getRandomInt();
      mail_util.sendOTP(mail, otp);

      const createdDate = new Date();
      const expiredDate = new Date(createdDate.getTime() + 60000);
      const queryOtp =
        "INSERT INTO Otp(value, createdDate, id_account) OUTPUT inserted.id VALUES (@value, @createdDate, @id_account)";
      const otpResult = await database
        .request()
        .input("value", otp)
        .input("createdDate", createdDate)
        .input("id_account", idAccount)
        .query(queryOtp);

      response.status(201).json({
        userID: idAccount,
        uuid: otpResult.recordset[0].id,
        userLogin: result.recordset[0].userLogin,
        today: createdDate,
        expired: expiredDate,
        otp: otp.toString(),
      });
    } else {
      response.status(400).json({
        errorCode: "MSG0020",
        message: "User is not existing",
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/resend-otp-phone", async (request, response) => {
  try {
    const idAccount = request.body.userID;
    const phone = request.body.phone;

    const query = "SELECT userLogin FROM Account WHERE id = @idAccount";
    const result = await database
      .request()
      .input("idAccount", idAccount)
      .query(query);

    if (result.recordset.length !== 0) {
      var otp = mail_util.getRandomInt();

      const createdDate = new Date();
      const expiredDate = new Date(createdDate.getTime() + 60000);
      const queryOtp =
        "INSERT INTO Otp(value, createdDate, id_account) OUTPUT inserted.id  VALUES (@value, @createdDate, @id_account)";
      const otpResult = await database
        .request()
        .input("value", otp)
        .input("createdDate", createdDate)
        .input("id_account", idAccount)
        .query(queryOtp);

      response.status(201).json({
        userID: idAccount,
        uuid: otpResult.recordset[0].id,
        userLogin: phone,
        today: createdDate,
        expired: expiredDate,
        otp: otp.toString(),
      });
    } else {
      response.status(400).json({
        errorCode: "MSG0020",
        message: "User is not existing",
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/signin-email", async (request, response) => {
  try {
    const email = request.body.userLogin;
    const password = request.body.password;

    const query = "SELECT * FROM Account WHERE userLogin = @email";
    const result = await database
      .request()
      .input("email", email)
      .input("password", password)
      .query(query);

    if (result.recordset.length === 0) {
      response.status(400).json({
        errorCode: "MSG0020",
        message: "User is not existing",
      });
    } else {
      if (result.recordset[0].password === password) {
        if (result.recordset[0].role === 0) {
          if (result.recordset[0].isVerify === 0) {
            response.status(400).json({
              errorCode: "MSG0046",
              message: "Account is not verified",
            });
          } else {
            const token = jwt.sign(
              { uuid: result.recordset[0].id },
              process.env.privateKey,
              { expiresIn: "10h" }
            );
            response.status(201).json({
              token: token,
              userID: result.recordset[0].id,
              userLogin: email,
              accountType: result.recordset[0].role,
            });
          }
        } else {
          response.status(400).json({
            errorCode: "MSG0047",
            message: "Ban khong co quyen dang nhap",
          });
        }
      } else {
        response.status(400).json({
          errorCode: "MSG0021",
          message: "Password or phone is not correct",
        });
      }
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/signin-phone", async (request, response) => {
  try {
    const phone = request.body.userLogin;
    const password = request.body.password;

    const query = "SELECT * FROM Account WHERE userLogin = @phone";
    const result = await database.request().input("phone", phone).query(query);
    if (result.recordset.length === 0) {
      response.status(400).json({
        errorCode: "MSG0020",
        message: "User is not existing",
      });
    } else {
      if (result.recordset[0].password === password) {
        if (result.recordset[0].role === 1) {
          if (result.recordset[0].isVerify === 0) {
            response.status(400).json({
              errorCode: "MSG0046",
              message: "Account is not verified",
            });
          } else {
            const token = jwt.sign(
              { uuid: result.recordset[0].id },
              process.env.privateKey,
              { expiresIn: "10h" }
            );
            response.status(201).json({
              token: token,
              userID: result.recordset[0].id,
              userLogin: phone,
              accountType: result.recordset[0].role,
            });
          }
        } else {
          response.status(400).json({
            errorCode: "MSG0047",
            message: "Ban khong co quyen dang nhap",
          });
        }
      } else {
        response.status(400).json({
          errorCode: "MSG0021",
          message: "Password or phone is not correct",
        });
      }
    }
  } catch (error) {
    console.log(error);
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

module.exports = router;
