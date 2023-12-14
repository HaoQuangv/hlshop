const express = require("express");
const router = express.Router();
require("dotenv").config();

const database = require("../../config");
const jwt = require("jsonwebtoken");

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
