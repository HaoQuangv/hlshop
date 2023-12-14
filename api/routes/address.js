const express = require("express");
const router = express.Router();

const database = require("../../config");
const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");

const { checkAddressValidated } = require("../../utils/address_check");
const e = require("express");

router.post("/add", checkAuth, checkRole, async (request, response) => {
  try {
    const receiverContactName = request.body.receiverContactName;
    const receiverPhone = request.body.receiverPhone;
    const receiverEmail = request.body.receiverEmail;
    const cityName = request.body.cityName;
    const cityID = request.body.cityID;
    const districtName = request.body.districtName;
    const districtID = request.body.districtID;
    const wardName = request.body.wardName;
    const wardID = request.body.wardID;
    const addressDetail = request.body.addressDetail;
    const addressLabel = Number(request.body.addressLabel);
    var isDefault = 0;

    await checkAddressValidated(cityID, districtID, wardID);

    const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
    const userResult = await database
      .request()
      .input("idAccount", request.userData.uuid)
      .query(queryUser);

    const query = "SELECT * FROM AddressReceive WHERE id_user = @id";
    const result = await database
      .request()
      .input("id", userResult.recordset[0].id)
      .query(query);
    if (result.recordset.length === 0) {
      isDefault = 1;
    }

    const queryAddress =
      "INSERT INTO AddressReceive(receiverPhone, receiverContactName, receiverEmail, isDefault, cityName, districtName, addressDetail, addressLabel, id_user, cityID, districtID, createdDate, wardName, wardID) VALUES (@receiverPhone, @receiverContactName, @receiverEmail, @isDefault, @cityName, @districtName, @addressDetail, @addressLabel, @userID, @cityID, @districtID, @createdDate, @wardName, @wardID)";
    const addressResult = await database
      .request()
      .input("receiverPhone", receiverPhone)
      .input("receiverContactName", receiverContactName)
      .input("receiverEmail", receiverEmail)
      .input("isDefault", isDefault)
      .input("cityName", cityName)
      .input("cityID", cityID)
      .input("districtName", districtName)
      .input("districtID", districtID)
      .input("addressDetail", addressDetail)
      .input("addressLabel", addressLabel)
      .input("userID", userResult.recordset[0].id)
      .input("createdDate", new Date())
      .input("wardName", wardName)
      .input("wardID", wardID)
      .query(queryAddress);

    response.status(200).json({
      status: 200,
      message: "Add Receiver Address Success",
    });
  } catch (error) {
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/update", checkAuth, checkRole, async (request, response) => {
  try {
    const receiverAddressID = request.body.receiverAddressID;
    const receiverContactName = request.body.receiverContactName;
    const receiverPhone = request.body.receiverPhone;
    const receiverEmail = request.body.receiverEmail;
    const cityName = request.body.cityName;
    const cityID = request.body.cityID;
    const districtName = request.body.districtName;
    const districtID = request.body.districtID;
    const wardName = request.body.wardName;
    const wardID = request.body.wardID;
    const addressDetail = request.body.addressDetail;
    const addressLabel = request.body.addressLabel;

    await checkAddressValidated(cityID, districtID, wardID);

    const query = "SELECT * FROM AddressReceive WHERE id = @addressID";
    const result = await database
      .request()
      .input("addressID", receiverAddressID)
      .query(query);

    if (result.recordset.length === 0) {
      response.status(400).json({
        errorCode: "MSG0071",
        message: "Receiver Address is not existing",
      });
    } else {
      const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
      const userResult = await database
        .request()
        .input("idAccount", request.userData.uuid)
        .query(queryUser);
      if (userResult.recordset[0].id == result.recordset[0].id_user) {
        const queryAddress =
          "UPDATE AddressReceive SET receiverPhone = @receiverPhone, receiverEmail = @receiverEmail, receiverContactName = @receiverContactName, cityName = @cityName, districtName = @districtName, addressDetail = @addressDetail, addressLabel = @addressLabel, cityID = @cityID, districtID = @districtID, createdDate = @createdDate, wardName = @wardName, wardID = @wardID WHERE id = @addressID";
        const addressResult = await database
          .request()
          .input("receiverPhone", receiverPhone)
          .input("receiverEmail", receiverEmail)
          .input("receiverContactName", receiverContactName)
          .input("cityName", cityName)
          .input("cityID", cityID)
          .input("districtName", districtName)
          .input("districtID", districtID)
          .input("addressDetail", addressDetail)
          .input("addressLabel", addressLabel)
          .input("addressID", receiverAddressID)
          .input("wardName", wardName)
          .input("wardID", wardID)
          .input("createdDate", new Date())
          .query(queryAddress);

        response.status(200).json({
          status: 200,
          message: "Update Receiver Address Success",
        });
      } else {
        response.status(500).json({
          errorCode: "Receiver Address is not existing",
          message: "Receiver Address is not existing",
        });
      }
    }
  } catch (error) {
    response.status(500).json({
      errorCode: "Internal Server Error",
    });
  }
});

router.post("/delete", checkAuth, checkRole, async (request, response) => {
  try {
    const receiverAddressID = request.body.receiverAddressID;
    const query = "SELECT * FROM AddressReceive WHERE id = @addressID";
    const result = await database
      .request()
      .input("addressID", receiverAddressID)
      .query(query);

    if (result.recordset.length === 0) {
      response.status(400).json({
        errorCode: "Receiver Address is not existing",
        message: "Receiver Address is not existing",
      });
    } else {
      const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
      const userResult = await database
        .request()
        .input("idAccount", request.userData.uuid)
        .query(queryUser);

      if (userResult.recordset[0].id == result.recordset[0].id_user) {
        if (result.recordset[0].isDefault === 1) {
          const queryAddressList =
            "SELECT id FROM AddressReceive WHERE id_user = @userID ORDER BY isDefault DESC, createdDate DESC";
          const resultAddressList = await database
            .request()
            .input("userID", userResult.recordset[0].id)
            .query(queryAddressList);

          if (resultAddressList.recordset.length > 1) {
            const queryAddress =
              "UPDATE AddressReceive SET isDefault = @isDefault, createdDate = @createdDate WHERE id = @addressID";
            const addressResult = await database
              .request()
              .input("isDefault", 1)
              .input("createdDate", new Date())
              .input("addressID", resultAddressList.recordset[1].id)
              .query(queryAddress);
          }
        }
        const queryAddress = "DELETE FROM AddressReceive WHERE id = @addressID";
        const addressResult = await database
          .request()
          .input("addressID", receiverAddressID)
          .query(queryAddress);

        response.status(200).json({
          status: 200,
          message: "Delete Receiver Address Success",
        });
      } else {
        response.status(500).json({
          errorCode: "Receiver Address is not existing",
          message: "Receiver Address is not existing",
        });
      }
    }
  } catch (error) {
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.post("/add-default", checkAuth, checkRole, async (request, response) => {
  try {
    const receiverAddressID = request.body.receiverAddressID;

    const Addressquery = "SELECT * FROM AddressReceive WHERE id = @addressID";
    const AddressResult = await database
      .request()
      .input("addressID", receiverAddressID)
      .query(Addressquery);
    const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
    const userResult = await database
      .request()
      .input("idAccount", request.userData.uuid)
      .query(queryUser);
    const queryAddressList =
      "SELECT id FROM AddressReceive WHERE id_user = @userID AND isDefault = 1 ORDER BY isDefault DESC, createdDate DESC";
    const resultAddressList = await database
      .request()
      .input("userID", userResult.recordset[0].id)
      .query(queryAddressList);

    if (
      resultAddressList.recordset.length === 0 ||
      AddressResult.recordset.length === 0
    ) {
      response.status(400).json({
        errorCode: "MSG0071",
        message: "Receiver Address is not existing",
      });
    } else {
      if (AddressResult.recordset[0].isDefault === 1) {
        response.status(200).json({
          status: 200,
          message: "Add Receiver Address Default Success",
        });
      } else {
        for (var i = 0; i < resultAddressList.recordset.length; i++) {
          const queryUnDefault =
            "UPDATE AddressReceive SET isDefault = 0 WHERE id = @addressID";
          const resultUnDefault = await database
            .request()
            .input("addressID", resultAddressList.recordset[i].id)
            .query(queryUnDefault);
        }
        const querySetDefault =
          "UPDATE AddressReceive SET isDefault = 1 WHERE id = @addressID";
        const resultSetDefault = await database
          .request()
          .input("addressID", receiverAddressID)
          .query(querySetDefault);
        response.status(200).json({
          status: 200,
          message: "Add Receiver Address Default Success",
        });
      }
    }
  } catch (error) {
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-list", checkAuth, checkRole, async (request, response) => {
  try {
    var offset = request.query.offset;
    var limit = request.query.limit;

    if (offset == null || offset < 1) {
      offset = 1;
    }

    if (limit == null) {
      limit = 10;
    }

    offset = (offset - 1) * limit;
    const queryUser = "SELECT id FROM [User] WHERE id_account = @idAccount";
    const userResult = await database
      .request()
      .input("idAccount", request.userData.uuid)
      .query(queryUser);

    const query =
      "SELECT id AS receiverAddressID, receiverContactName, receiverPhone, receiverEmail, addressLabel, id_user AS userID, isDefault, cityName, districtName, cityID, districtID, addressDetail, wardName, wardID FROM AddressReceive WHERE id_user = @userID ORDER BY isDefault DESC, createdDate DESC OFFSET @page ROWS FETCH NEXT @pageSize ROWS ONLY";
    const result = await database
      .request()
      .input("page", parseInt(offset))
      .input("pageSize", parseInt(limit))
      .input("userID", userResult.recordset[0].id)
      .query(query);

    response.status(200).json({
      receiverAddresses: result.recordset,
    });
  } catch (error) {
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

module.exports = router;
