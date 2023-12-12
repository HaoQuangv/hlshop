const express = require("express");
const router = express.Router();
require("dotenv").config();

const checkAuth = require("../../middleware/check_auth");
const checkRoleAdmin = require("../../middleware/check_role_admin");

const database = require("../../config");
router.get(
  "/get-profile",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const queryUser = "SELECT * FROM [User] WHERE id_account = @idAccount";
      const userResult = await database
        .request()
        .input("idAccount", request.userData.uuid)
        .query(queryUser);

      const queryAccount = "SELECT * FROM Account WHERE id = @idAccount";
      const resultAccount = await database
        .request()
        .input("idAccount", request.userData.uuid)
        .query(queryAccount);

      const queryEmail =
        "SELECT id AS emailID, emailAddress, emailLabel, isDefault, isVerify FROM Email WHERE idUser = @idUser";
      const resultEmail = await database
        .request()
        .input("idUser", userResult.recordset[0].id)
        .query(queryEmail);

      const queryPhone =
        "SELECT id AS phoneID, phoneNo, extendNumber, phoneLabel, phoneArea, countryArea, isDefault, isVerify FROM Phone WHERE idUser = @idUser";
      const resultPhone = await database
        .request()
        .input("idUser", userResult.recordset[0].id)
        .query(queryPhone);

      const responseData = {
        userID: request.userData.uuid,
        userLoginID: resultAccount.recordset[0].userLogin,
        contactFullName: userResult.recordset[0].contactFullName,
        slogan: userResult.recordset[0].slogan,
        gender: userResult.recordset[0].gender,
        pID: userResult.recordset[0].pID,
        createdDate: userResult.recordset[0].createdDate,
        accountType: resultAccount.recordset[0].role,
        accountStatus: resultAccount.recordset[0].isVerify,
        userType: resultAccount.recordset[0].role,
        emails: resultEmail.recordset,
        phones: resultPhone.recordset,
        urls: [
          {
            urlID: "1010a4e3-2b79-4cf6-9e7a-716cdacc464f",
            urlString: "google.com",
            isDefault: 0,
          },
          {
            urlID: "61441d2c-aa96-4790-b139-0eee81b8cf31",
            urlString: "haha",
            isDefault: 0,
          },
        ],
        userAvatar: userResult.recordset[0].userAvatar,
        userCover: userResult.recordset[0].userCover,
      };

      response.status(200).json(responseData);
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);
module.exports = router;
