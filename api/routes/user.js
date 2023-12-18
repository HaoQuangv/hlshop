const express = require("express");
const multer = require("multer");

const router = express.Router();

const mail_util = require("../../utils/mail");
const database = require("../../config");
const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");
const firebase = require("../../firebase");
const sql = require("mssql");
const e = require("express");

require("dotenv").config();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single("file_cover");

const upload1 = multer({ storage: storage }).single("file_avatar");

router.get("/get-profile", checkAuth, checkRole, async (request, response) => {
  try {
    const responseData = await getProfile(request.userData.uuid);
    response.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

async function getProfile(idAccount) {
  try {
    const query = `
    SELECT
    [User].id AS userID,
    [User].contactFullName,
    [User].slogan,
    [User].gender,
    [User].pID,
    [User].createdDate,
    [User].userAvatar,
    [User].userCover,
    Account.role AS accountType,
    Account.role AS userType,
    Email.id AS emailID,
    Email.emailAddress,
    Email.emailLabel,
    Email.isDefault AS isDefaultEmail,
    Email.isVerify,
    Phone.id AS phoneID,
    Phone.phoneNo,
    Phone.extendNumber,
    Phone.phoneLabel,
    Phone.phoneArea,
    Phone.countryArea,
    Phone.isDefault AS isDefaultPhone
    FROM [User]
    LEFT JOIN Account ON [User].id_account = Account.id
    LEFT JOIN Email ON [User].id = Email.idUser AND Email.isVerify = 1
    LEFT JOIN Phone ON [User].id = Phone.idUser AND Phone.isVerify = 1
    WHERE [User].id_account = @idAccount
    ORDER BY Email.isDefault DESC, Phone.isDefault DESC
    `;
    const result = await database
      .request()
      .input("idAccount", idAccount)
      .query(query);

    const resultMap = {};
    result.recordset.forEach((item) => {
      const { userID, emailID, phoneID, ...rest } = item;
      if (!resultMap[userID]) {
        resultMap[userID] = {
          userID: userID,
          userLoginID: item.userLoginID,
          contactFullName: item.contactFullName,
          slogan: item.slogan ? item.slogan : null,
          gender: item.gender ? item.gender : null,
          pID: item.pID ? item.pID : null,
          createdDate: item.createdDate,
          accountType: item.accountType,
          userType: item.userType,
          emails: item.emails,
          phones: item.phones,
          urls: [],
          emails: [],
          phones: [],
          userAvatar: item.userAvatar ? item.userAvatar : null,
          userCover: item.userCover ? item.userCover : null,
        };
      }
      const emailExist = resultMap[userID].emails.some(
        (email) => email.emailID === emailID
      );
      if (!emailExist && emailID) {
        resultMap[userID].emails.push({
          emailID: emailID,
          emailAddress: item.emailAddress,
          emailLabel: item.emailLabel,
          isDefault: item.isDefaultEmail,
          isVerify: item.isVerify,
        });
      }

      const phoneExist = resultMap[userID].phones.some(
        (phone) => phone.phoneID === phoneID
      );
      if (!phoneExist && phoneID) {
        resultMap[userID].phones.push({
          phoneID: phoneID,
          phoneNo: item.phoneNo,
          extendNumber: item.extendNumber,
          phoneLabel: item.phoneLabel,
          phoneArea: item.phoneArea,
          countryArea: item.countryArea,
          isDefault: item.isDefaultPhone,
          isVerify: item.isVerify,
        });
      }
    });

    const resultArray = Object.values(resultMap);
    return resultArray[0];
  } catch (error) {
    throw "getProfile";
  }
}

router.post(
  "/profile/update-contact-name",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const contactFullName = request.body.contactFullName;
      if (
        !contactFullName ||
        contactFullName === "" ||
        contactFullName === null ||
        contactFullName === undefined
      ) {
        response.status(400).json({
          errorCode: "Contact Full Name is empty",
          message: "Contact Full Name is empty",
        });
        return;
      }
      const query =
        "UPDATE [User] SET contactFullName = @contactFullName OUTPUT inserted.id, inserted.slogan, inserted.gender, inserted.pID, inserted.createdDate WHERE id_account = @idAccount";
      const result = await database
        .request()
        .input("contactFullName", contactFullName)
        .input("idAccount", request.userData.uuid)
        .query(query);

      const queryAccount = "SELECT * FROM Account WHERE id = @idAccount";
      const resultAccount = await database
        .request()
        .input("idAccount", request.userData.uuid)
        .query(queryAccount);

      const toDay = new Date();
      response.status(201).json({
        userID: request.userData.uuid,
        userLoginID: resultAccount.recordset[0].userLogin,
        contactFullName: contactFullName,
        slogan: result.recordset[0].slogan,
        gender: result.recordset[0].gender,
        pID: result.recordset[0].pID,
        createdDate: result.recordset[0].createdDate,
        accountType: resultAccount.recordset[0].role,
        accountStatus: resultAccount.recordset[0].isVerify,
        userType: 1,
        updatedDate: toDay,
        isLoginIDEmail: null,
        aboutInfo: null,
        businessID: null,
        businessName: "HLSHOP",
        hasMedia: null,
        hasAddress: null,
        hasEmail: null,
        hasPhone: null,
        hasURL: null,
        password: null,
        businessType: null,
        pIDType: null,
        userRole: null,
        parentUserID: null,
      });
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.post(
  "/profile/update-cover",
  upload,
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      if (!request.file) {
        response.status(400).json({
          errorCode: "MSG0084",
          message: "File Cover is empty",
        });
      } else {
        var image = "";
        const uniqueFileName = Date.now() + "-" + request.file.originalname;
        const blob = firebase.bucket.file(uniqueFileName);
        const blobWriter = blob.createWriteStream({
          metadata: {
            contentType: request.file.mimetype,
          },
        });
        blobWriter.on("error", (err) => {
          console.log(err);
          response.status(500).json({
            error: err.message,
          });
        });

        blobWriter.on("finish", async () => {
          try {
            const signedUrls = await blob.getSignedUrl({
              action: "read",
              expires: "03-01-2500", // Ngày hết hạn của đường dẫn
            });
            const publicUrl = signedUrls[0];
            image = image + publicUrl;
            const queryUser =
              "UPDATE [User] SET userCover = @image WHERE id_account = @idAccount";
            const userResult = await database
              .request()
              .input("idAccount", request.userData.uuid)
              .input("image", image)
              .query(queryUser);

            response.status(201).json({
              message: "Upload successful!",
            });
          } catch (err) {
            response.status(500).json({
              error: err.message,
            });
          }
        });

        blobWriter.end(request.file.buffer);
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.post(
  "/profile/update-avatar",
  upload1,
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      if (!request.file) {
        response.status(400).json({
          errorCode: "MSG0084",
          message: "File Cover is empty",
        });
      } else {
        var image = "";

        const uniqueFileName = Date.now() + "-" + request.file.originalname;
        const blob = firebase.bucket.file(uniqueFileName);
        const blobWriter = blob.createWriteStream({
          metadata: {
            contentType: request.file.mimetype,
          },
        });
        blobWriter.on("error", (err) => {
          console.log(err);
          response.status(500).json({
            error: err.message,
          });
        });

        blobWriter.on("finish", async () => {
          try {
            const signedUrls = await blob.getSignedUrl({
              action: "read",
              expires: "03-01-2500", // Ngày hết hạn của đường dẫn
            });
            const publicUrl = signedUrls[0];
            image = image + publicUrl;
            const queryUser =
              "UPDATE [User] SET userAvatar = @image WHERE id_account = @idAccount";
            const userResult = await database
              .request()
              .input("idAccount", request.userData.uuid)
              .input("image", image)
              .query(queryUser);

            response.status(201).json({
              message: "Upload successful!",
            });
          } catch (err) {
            response.status(500).json({
              error: err.message,
            });
          }
        });

        blobWriter.end(request.file.buffer);
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.post(
  "/profile/email-add",
  checkAuth,
  checkRole,
  async (request, response) => {
    let transaction = new sql.Transaction(database);
    try {
      const emailAddress = request.body.emailAddress;
      const createdDate = new Date();
      await transaction
        .begin()
        .then(async () => {
          await checkEmailIsExisting(
            emailAddress,
            request.userData.uuid,
            transaction
          );
          const isDefault = await checkUserHaveEmail(
            request.userData.uuid,
            transaction
          );
          const [userID, emailID] = await createEmail(
            request.userData.uuid,
            emailAddress,
            isDefault,
            transaction
          );

          var otp = mail_util.getRandomInt();
          mail_util.sendOTP(emailAddress, otp);
          const expired = new Date(createdDate.getTime() + 30000);
          const OtpId = await createOtpEmail(
            otp,
            createdDate,
            emailID,
            transaction
          );
          await transaction.commit();
          response.status(200).json({
            status: 200,
            message: "Add Email Success",
            result: {
              userID: userID,
              uuid: OtpId,
              emailID: emailID,
              emailAddress: emailAddress,
              today: createdDate,
              expired: expired,
              otp: otp.toString(),
            },
          });
        })
        .catch(async (err) => {
          await transaction.rollback();
          throw err;
        });
      return {};
    } catch (error) {
      console.log(error);
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          message: "Database error",
        });
      }
      if (error.code === "EABORT") {
        return response.status(500).json({
          message: "Invalid input data",
        });
      }
      response.status(500).json({
        errorCode: error,
      });
    }
  }
);

async function createOtpEmail(otp, createdDate, emailID, transaction) {
  try {
    const query = `
        INSERT INTO OtpEmail(value, createdDate, idEmail)
        OUTPUT inserted.id
        VALUES (@value, @createdDate, @idEmail)
        `;
    const result = await transaction
      .request()
      .input("value", otp)
      .input("createdDate", createdDate)
      .input("idEmail", emailID)
      .query(query);
    return result.recordset[0].id;
  } catch (error) {
    throw "createOtpEmail";
  }
}
async function createEmail(idAccount, emailAddress, isDefault, transaction) {
  try {
    query = `
        INSERT INTO Email(emailAddress, isDefault, isVerify, idUser) 
        OUTPUT inserted.id, inserted.idUser
        SELECT 
        @email,
        @isDefault,
        0,
        [User].id
        FROM [User]
        WHERE [User].id_account = @idAccount
        `;
    const result = await transaction
      .request()
      .input("email", emailAddress)
      .input("isDefault", isDefault)
      .input("idAccount", idAccount)
      .query(query);
    return [result.recordset[0].idUser, result.recordset[0].id];
  } catch (error) {
    throw "createEmail";
  }
}

async function checkUserHaveEmail(idAccount, transaction) {
  try {
    const query = `
        SELECT 1
        FROM [User]
        LEFT JOIN Email ON [User].id = Email.idUser
        WHERE [User].id_account = @idAccount AND Email.isVerify = 1
        `;
    const result = await transaction
      .request()
      .input("idAccount", idAccount)
      .query(query);
    if (result.recordset.length === 0) {
      return 1;
    }
    return 0;
  } catch (error) {
    console.log(error);
    throw "checkUserHaveEmail";
  }
}

async function checkEmailIsExisting(emailAddress, idAccount, transaction) {
  try {
    const queryEmail = `SELECT
      Email.id AS emailID,
      Email.emailAddress,
      Email.isVerify
      FROM [User] 
      LEFT JOIN Email ON [User].id = Email.idUser
      WHERE [User].id_account = @idAccount AND Email.emailAddress = @email
      `;
    const resultEmail = await transaction
      .request()
      .input("idAccount", idAccount)
      .input("email", emailAddress)
      .query(queryEmail);
    if (resultEmail.recordset.length !== 0) {
      if (resultEmail.recordset[0].isVerify === 1) {
        throw "Email is existing";
      } else {
        return [resultEmail.recordset[0].emailID, 0];
      }
    }
  } catch (error) {
    throw error;
  }
}

router.post(
  "/profile/email-delete",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const emailID = request.body.emailID;

      const queryEmail = "SELECT * FROM Email WHERE id = @emailID";
      const resultEmail = await database
        .request()
        .input("emailID", emailID)
        .query(queryEmail);

      if (resultEmail.recordset.length === 0) {
        response.status(400).json({
          errorCode: "MSG0091",
          message: "Email is not existing",
        });
      } else {
        const queryDeleteEmail = "DELETE FROM Email WHERE id = @idEmail";
        const resultQueryDeleteEmail = await database
          .request()
          .input("idEmail", emailID)
          .query(queryDeleteEmail);
        response.status(200).json({
          status: 200,
          message: "Delete Email Success",
        });
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.post(
  "/profile/email-resend-otp",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const emailID = request.body.emailID;
      const queryEmail = "SELECT * FROM Email WHERE id = @emailID";
      const resultEmail = await database
        .request()
        .input("emailID", emailID)
        .query(queryEmail);

      if (resultEmail.recordset.length !== 0) {
        const mail = resultEmail.recordset[0].emailAddress;

        var otp = mail_util.getRandomInt();
        mail_util.sendOTP(mail, otp);

        const createdDate = new Date();
        const expiredDate = new Date(createdDate.getTime() + 35000);
        const queryOtp =
          "INSERT INTO OtpEmail(value, createdDate, idEmail) OUTPUT inserted.id VALUES (@value, @createdDate, @idEmail)";
        const otpResult = await database
          .request()
          .input("value", otp)
          .input("createdDate", createdDate)
          .input("idEmail", emailID)
          .query(queryOtp);

        response.status(201).json({
          status: 200,
          message: "Resend OTP Email Success",
          result: {
            userID: request.userData.uuid,
            uuid: otpResult.recordset[0].id,
            emailID: emailID,
            emailAddress: resultEmail.recordset[0].emailAddress,
            today: createdDate,
            expired: expiredDate,
          },
          otp: otp.toString(),
        });
      } else {
        response.status(400).json({
          errorCode: "MSG0091",
          message: "Email is not existing",
        });
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.post(
  "/profile/email-verify",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const emailID = request.body.emailID;
      const uuid = request.body.uuid;
      const otp = request.body.otp;
      const query = `
      SELECT
      Email.id AS emailID,
      Email.emailAddress,
      Email.isVerify,
      OtpEmail.value,
      OtpEmail.createdDate
      FROM [User]
      LEFT JOIN Email ON [User].id = Email.idUser
      LEFT JOIN OtpEmail ON Email.id = OtpEmail.idEmail
      WHERE [User].id_account = @idAccount AND Email.id = @emailID AND OtpEmail.id = @idOtpEmail
      `;
      const result = await database
        .request()
        .input("emailID", emailID)
        .input("idOtpEmail", uuid)
        .input("idAccount", request.userData.uuid)
        .query(query);
      console.log(result);
      if (result.recordset.length !== 0) {
        if (result.recordset[0].isVerify === 1) {
          throw "Email is existing";
        }
        const today = new Date();
        const expired =
          today.getTime() - result.recordset[0].createdDate.getTime();
        if (expired < 30000) {
          if (result.recordset[0].value === parseInt(otp)) {
            const queryAccount =
              "UPDATE Email SET isVerify  = 1 OUTPUT inserted.emailAddress WHERE id = @idEmail";
            const accountResult = await database
              .request()
              .input("idEmail", emailID)
              .query(queryAccount);

            response.status(201).json({
              userID: request.userData.uuid,
              emailID: emailID,
              emailAddress: accountResult.recordset[0].emailAddress,
              accountType: 1,
            });
            return;
          } else {
            throw "Mã otp của bạn bị sai!";
          }
        } else {
          throw "Mã otp của bạn đã quá hạn!";
        }
      } else {
        throw "Email is not existing";
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({
        errorCode: error,
      });
    }
  }
);

router.post(
  "/profile/phone-add",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const phoneNo = request.body.phoneNo;
      const phoneLabel = request.body.phoneLabel;
      const isDefault = request.body.isDefault;

      const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
      const userResult = await database
        .request()
        .input("idAccount", request.userData.uuid)
        .query(queryUser);

      if (isDefault === 1) {
        const queryPhoneDefault =
          "SELECT * FROM Phone WHERE idUser = @idUser AND isDefault = 1";
        const resultPhoneDefault = await database
          .request()
          .input("idUser", userResult.recordset[0].id)
          .query(queryPhoneDefault);

        if (resultPhoneDefault.recordset.length !== 0) {
          const updatePhoneDefault =
            "UPDATE Phone SET isDefault = 0 WHERE id = @idPhone";
          const resultUpdatePhoneDefault = await database
            .request()
            .input("idPhone", resultPhoneDefault.recordset[0].id)
            .query(updatePhoneDefault);
        }
        const createdDate = new Date();
        const expired = new Date(createdDate.getTime() + 60000);

        const queryPhone =
          "INSERT INTO Phone(phoneNo, phoneLabel, isDefault, isVerify, idUser) OUTPUT inserted.id VALUES (@phoneNo, @phoneLabel, @isDefault, 0, @idUser)";
        const resultPhone = await database
          .request()
          .input("phoneNo", phoneNo)
          .input("phoneLabel", phoneLabel)
          .input("isDefault", isDefault)
          .input("idUser", userResult.recordset[0].id)
          .query(queryPhone);

        var otp = mail_util.getRandomInt();

        const queryOtp =
          "INSERT INTO OtpPhone(value, createdDate, idPhone) OUTPUT inserted.id VALUES (@value, @createdDate, @idPhone)";
        const otpResult = await database
          .request()
          .input("value", otp)
          .input("createdDate", createdDate)
          .input("idPhone", resultPhone.recordset[0].id)
          .query(queryOtp);

        response.status(200).json({
          status: 200,
          message: "Add Phone Success",
          result: {
            userID: request.userData.uuid,
            uuid: otpResult.recordset[0].id,
            phoneID: resultPhone.recordset[0].id,
            phone: phoneNo,
            today: createdDate,
            expired: expired,
            otp: otp.toString(),
          },
        });
      } else {
        const createdDate = new Date();
        const expired = new Date(createdDate.getTime() + 60000);

        const queryPhone =
          "INSERT INTO Phone(phoneNo, phoneLabel, isDefault, isVerify, idUser) OUTPUT inserted.id VALUES (@phoneNo, @phoneLabel, @isDefault, 0, @idUser)";
        const resultPhone = await database
          .request()
          .input("phoneNo", phoneNo)
          .input("phoneLabel", phoneLabel)
          .input("isDefault", isDefault)
          .input("idUser", userResult.recordset[0].id)
          .query(queryPhone);

        var otp = mail_util.getRandomInt();

        const queryOtp =
          "INSERT INTO OtpPhone(value, createdDate, idPhone) OUTPUT inserted.id VALUES (@value, @createdDate, @idPhone)";
        const otpResult = await database
          .request()
          .input("value", otp)
          .input("createdDate", createdDate)
          .input("idPhone", resultPhone.recordset[0].id)
          .query(queryOtp);

        response.status(200).json({
          status: 200,
          message: "Add Phone Success",
          result: {
            userID: request.userData.uuid,
            uuid: otpResult.recordset[0].id,
            phoneID: resultPhone.recordset[0].id,
            phone: phoneNo,
            today: createdDate,
            expired: expired,
            otp: otp.toString(),
          },
        });
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.post(
  "/profile/phone-delete",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const phoneID = request.body.phoneID;

      const queryPhone = "SELECT * FROM Phone WHERE id = @phoneID";
      const resultPhone = await database
        .request()
        .input("phoneID", phoneID)
        .query(queryPhone);

      if (resultPhone.recordset.length === 0) {
        response.status(400).json({
          errorCode: "MSG0094",
          message: "Phone is not existing",
        });
      } else {
        const queryDeletePhone = "DELETE FROM Phone WHERE id = @phoneID";
        const resultQueryDeletePhone = await database
          .request()
          .input("phoneID", phoneID)
          .query(queryDeletePhone);
        response.status(200).json({
          status: 200,
          message: "Delete Phone Success",
        });
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.post(
  "/profile/phone-resend-otp",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const phoneID = request.body.phoneID;
      const queryPhone = "SELECT * FROM Phone WHERE id = @phoneID";
      const resultPhone = await database
        .request()
        .input("phoneID", phoneID)
        .query(queryPhone);

      if (resultPhone.recordset.length !== 0) {
        var otp = mail_util.getRandomInt();

        const createdDate = new Date();
        const expiredDate = new Date(createdDate.getTime() + 60000);
        const queryOtp =
          "INSERT INTO OtpPhone(value, createdDate, idPhone) OUTPUT inserted.id VALUES (@value, @createdDate, @idPhone)";
        const otpResult = await database
          .request()
          .input("value", otp)
          .input("createdDate", createdDate)
          .input("idPhone", phoneID)
          .query(queryOtp);

        response.status(201).json({
          status: 200,
          message: "Resend OTP Phone Success",
          result: {
            userID: request.userData.uuid,
            uuid: otpResult.recordset[0].id,
            phoneID: phoneID,
            phone: resultPhone.recordset[0].phoneNo,
            today: createdDate,
            expired: expiredDate,
          },
          otp: otp.toString(),
        });
      } else {
        response.status(400).json({
          errorCode: "MSG0094",
          message: "Phone is not existing",
        });
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.post(
  "/profile/phone-verify",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const phoneID = request.body.phoneID;
      const uuid = request.body.uuid;
      const otp = request.body.otp;

      const queryPhone = "SELECT * FROM Phone WHERE id = @phoneID";
      const resultPhone = await database
        .request()
        .input("phoneID", phoneID)
        .query(queryPhone);

      if (resultPhone.recordset.length !== 0) {
        const query =
          "SELECT * FROM OtpPhone WHERE idPhone = @idPhone AND createdDate = (SELECT MAX(createdDate) FROM OtpPhone ) AND id = @idOtpPhone";
        const result = await database
          .request()
          .input("idPhone", phoneID)
          .input("idOtpPhone", uuid)
          .query(query);

        const today = new Date();
        const expired =
          today.getTime() - result.recordset[0].createdDate.getTime();

        if (result.recordset[0].value === parseInt(otp) && expired < 60000) {
          const queryAccount =
            "UPDATE Phone SET isVerify  = 1 OUTPUT inserted.phoneNo WHERE id = @idPhone";
          const accountResult = await database
            .request()
            .input("idPhone", phoneID)
            .query(queryAccount);

          response.status(201).json({
            userID: request.userData.uuid,
            phoneID: phoneID,
            phone: accountResult.recordset[0].phoneNo,
            accountType: 1,
          });
        } else {
          response.status(400).json({
            message: "Mã otp của bạn bị sai hoặc đã quá hạn!",
          });
        }
      } else {
        response.status(400).json({
          errorCode: "MSG0094",
          message: "Phone is not existing",
        });
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.post(
  "/profile/phone-update",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      const phoneID = request.body.phoneID;
      const phoneNo = request.body.phoneNo;
      const phoneLabel = request.body.phoneLabel;
      const isDefault = request.body.isDefault;

      const queryPhone = "SELECT * FROM Phone WHERE id = @phoneID";
      const resultPhone = await database
        .request()
        .input("phoneID", phoneID)
        .query(queryPhone);

      if (resultPhone.recordset.length !== 0) {
        if (isDefault === 1) {
          const queryUser =
            "SELECT id FROM [User] WHERE id_account = @idAccount";
          const userResult = await database
            .request()
            .input("idAccount", request.userData.uuid)
            .query(queryUser);

          const queryExistPhoneIsDefault =
            "SELECT * FROM Phone WHERE idUser = @idUser AND isDefault = 1";
          const resultExistPhoneIsDefault = await database
            .request()
            .input("idUser", userResult.recordset[0].id)
            .query(queryExistPhoneIsDefault);

          if (resultExistPhoneIsDefault.recordset.length !== 0) {
            const queryUpdateIsDefault =
              "UPDATE Phone SET isDefault = 0 WHERE id = @idPhone";
            const resultUpdateIsDefault = await database
              .request()
              .input("idPhone", resultExistPhoneIsDefault.recordset[0].id)
              .query(queryUpdateIsDefault);
          }

          const queryUpdatePhone =
            "UPDATE Phone SET isVerify = 0, phoneNo = @phoneNo, phoneLabel = @phoneLabel, isDefault = @isDefault WHERE id = @idPhone";
          const resultUpdateEmail = await database
            .request()
            .input("idPhone", phoneID)
            .input("phoneLabel", phoneLabel)
            .input("phoneNo", phoneNo)
            .input("isDefault", isDefault)
            .query(queryUpdatePhone);

          var otp = mail_util.getRandomInt();

          const createdDate = new Date();
          const expiredDate = new Date(createdDate.getTime() + 60000);

          const queryOtp =
            "INSERT INTO OtpPhone(value, createdDate, idPhone) OUTPUT inserted.id VALUES (@value, @createdDate, @idPhone)";
          const otpResult = await database
            .request()
            .input("value", otp)
            .input("createdDate", createdDate)
            .input("idPhone", phoneID)
            .query(queryOtp);

          response.status(200).json({
            status: 200,
            message: "Update Phone Success",
            result: {
              userID: request.userData.uuid,
              uuid: otpResult.recordset[0].id,
              phoneID: phoneID,
              phone: phoneNo,
              isDefault: isDefault,
              today: createdDate,
              expired: expiredDate,
              otp: otp.toString(),
            },
          });
        } else {
          response.status(400).json({
            errorCode: "MSG0094",
            message: "Phone is not existing",
          });
        }
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);
// router.put('/update-profile', upload, checkAuth, checkRole, async(request, response) => {
//     try{
//         const firstName = request.body.firstName;
//         const lastName = request.body.lastName;
//         const gender = request.body.gender;
//         const phone = request.body.phone;
//         const address = request.body.address;
//         const dateOfBirth = request.body.dateOfBirth;
//         var image = '';
//         var date = new Date(dateOfBirth) ;
//         date.setDate(date.getDate() + 1);
//         const fullName = firstName + " " + lastName;
//         if (!request.file){
//             const queryUser = 'UPDATE [User] SET first_name = @firstName, last_name = @lastName, gender = @gender, dateOfBirth = @dateOfBirth, phone = @phone, address = @address WHERE id_account = @idAccount'
//             const userResult = await database.request()
//                                          .input('firstName', firstName)
//                                          .input('lastName', lastName)
//                                          .input('gender', gender)
//                                          .input('dateOfBirth', date)
//                                          .input('phone', phone)
//                                          .input('address', address)
//                                          .input('idAccount', request.userData.uuid)
//                                          .query(queryUser);

//             response.status(200).json({
//                 "id": request.userData.uuid,
//                 "contactFullName": fullName,
//                 "gender": gender,
//                 "accountType": 0,
//                 "accountStatus": 1,
//                 "date": dateOfBirth,
//                 "link": ""
//         })
//     }else{
//         const blob = firebase.bucket.file(request.file.originalname)
//         const blobWriter = blob.createWriteStream({
//             metadata: {
//                 contentType: request.file.mimetype
//             }
//         })
//         blobWriter.on('error', (err) => {
//         response.status(500).json({
//             "error": err.message
//             });
//         });

//         blobWriter.on('finish', async () => {
//         try {
//             const signedUrls = await blob.getSignedUrl({
//                 action: 'read',
//                 expires: '03-01-2500' // Ngày hết hạn của đường dẫn
//             });
//             const publicUrl = signedUrls[0];
//             image = image + publicUrl;
//             const queryUser = 'UPDATE [User] SET first_name = @firstName, last_name = @lastName, gender = @gender, dateOfBirth = @dateOfBirth, phone = @phone, address = @address, image = @image WHERE id_account = @idAccount'
//             const userResult = await database.request()
//                                      .input('firstName', firstName)
//                                      .input('lastName', lastName)
//                                      .input('gender', gender)
//                                      .input('dateOfBirth', date)
//                                      .input('phone', phone)
//                                      .input('address', address)
//                                      .input('idAccount', request.userData.uuid)
//                                      .input('image', image)
//                                      .query(queryUser);

//             response.status(201).json({
//                 "id": request.userData.uuid,
//                 "contactFullName": fullName,
//                 "gender": gender,
//                 "accountType": 0,
//                 "accountStatus": 1,
//                 "date": dateOfBirth,
//                 "link": image
//             })
//         } catch (err) {
//             response.status(500).json({
//                 "error": err.message
//             });
//         }
//     });

//      blobWriter.end(request.file.buffer);
//     }
//     }catch(error){
//         console.log(error);
//         response.status(500).json({
//             "error": 'Internal Server Error'
//         })
//     }

// })

// router.delete('/delete-profile', checkAuth, checkRole, async (request, response) => {
//     try{
//         const queryUser = 'DELETE FROM [User] WHERE id_account = @idAccount'
//         const userResult = await database.request()
//                                         .input('idAccount', request.userData.uuid)
//                                         .query(queryUser);

//         response.status(200).json({
//             "message": "Deleted successfull!"
//         })
//     }catch(error){
//         console.log(error);
//         response.status(500).json({
//             "error": 'Internal Server Error'
//         })
//     }
// })

module.exports = router;
