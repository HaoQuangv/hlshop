const express = require("express");
const router = express.Router();
require("dotenv").config();
const sql = require("mssql");
const database = require("../../config");

const checkAuth = require("../../middleware/check_auth");
const checkRoleAdmin = require("../../middleware/check_role_admin");

const firebase = require("../../firebase");

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
});

router.post(
  "/create-product",
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    let transaction = new sql.Transaction(database);
    try {
      const jsonData = request.body;
      const name = jsonData.productName;
      const slogan = jsonData.productSlogan;
      const description = jsonData.productDescription;
      const notes = jsonData.productNotes;
      const madeIn = jsonData.productMadeIn;
      const uses = jsonData.productUses;
      const ingredient = jsonData.productIngredient;
      const objectsOfUse = jsonData.productObjectsOfUse;
      const preserve = jsonData.productPreserve;
      const instructionsForUse = jsonData.productInstructionsForUse;
      const height = jsonData.productHeight;
      const width = jsonData.productWidth;
      const length = jsonData.productLength;
      const weight = jsonData.productWeight;
      const sellQuantity = 0;
      const createdDate = new Date();
      const idCategory = jsonData.productCategoryID;
      const idAccount = request.userData.uuid;
      const attributes = jsonData.attributes;
      const avatarMediaIDS = jsonData.avatarMediaIDS;
      const productSKUs = jsonData.productSKUs;
      await transaction
        .begin()
        .then(async () => {
          const id_product = await insertProduct(
            transaction,
            name,
            slogan,
            description,
            notes,
            madeIn,
            uses,
            ingredient,
            objectsOfUse,
            preserve,
            instructionsForUse,
            height,
            width,
            length,
            weight,
            sellQuantity,
            createdDate,
            idCategory,
            idAccount
          );

          for (let i = 0; i < avatarMediaIDS.length; i++) {
            const MediaID = avatarMediaIDS[i];
            await updateMedia0(transaction, id_product, MediaID.mediaID);
          }

          const array_attribute = await insertProductAttributeAndValue(
            transaction,
            attributes,
            id_product
          );

          await processProductSKU(
            transaction,
            productSKUs,
            id_product,
            array_attribute
          );
          await transaction.commit();
          response.status(200).json({
            status: 200,
            message: "Create product successfully",
            result: {
              productID: id_product,
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
        message: error,
      });
    }
  }
);
async function updateMedia0(transaction, id_product, MediaID) {
  try {
    const query = `
      UPDATE Media
      SET id_product = @id_product
      WHERE id = @MediaID
    `;
    const result = await transaction
      .request()
      .input("id_product", id_product)
      .input("MediaID", MediaID)
      .query(query);
  } catch (error) {
    throw "Error update media Product";
  }
}

async function updateMedia(
  transaction,
  id_product,
  MediaID,
  productAttributeValueID,
  title
) {
  try {
    const query = `
      UPDATE Media
      SET id_product = @id_product,
      productAttributeValueID = @productAttributeValueID,
      title = @title,
      description = @description
      WHERE id = @MediaID
    `;
    const result = await transaction
      .request()
      .input("id_product", id_product)
      .input("productAttributeValueID", productAttributeValueID)
      .input("title", title)
      .input("description", title)
      .input("MediaID", MediaID)
      .query(query);
  } catch (error) {
    throw "Error update media productAttributeValue";
  }
}

async function processProductSKU(
  transaction,
  productSKUs,
  id_product,
  array_attribute
) {
  try {
    if (array_attribute.length === 0) {
      await insertProductSKU(
        transaction,
        productSKUs[0],
        id_product,
        null,
        null
      );
    } else {
      if (array_attribute.length === 1) {
        for (
          let i = 0;
          i < array_attribute[0].productAttributeValueIDs.length;
          i++
        ) {
          const id_product_attribute1 = array_attribute[0].productAttributeID;
          const id_product_attribute_value1 =
            array_attribute[0].productAttributeValueIDs[i];
          await insertProductSKU(
            transaction,
            productSKUs[i],
            id_product,
            id_product_attribute_value1
          );
        }
      } else {
        if (array_attribute.length === 2) {
          for (
            let i = 0;
            i < array_attribute[0].productAttributeValueIDs.length;
            i++
          ) {
            const id_product_attribute1 = array_attribute[0].productAttributeID;
            const id_product_attribute_value1 =
              array_attribute[0].productAttributeValueIDs[i];
            for (
              let j = 0;
              j < array_attribute[1].productAttributeValueIDs.length;
              j++
            ) {
              const id_product_attribute2 =
                array_attribute[1].productAttributeID;
              const id_product_attribute_value2 =
                array_attribute[1].productAttributeValueIDs[j];
              await insertProductSKU(
                transaction,
                productSKUs[
                  i * array_attribute[1].productAttributeValueIDs.length + j
                ],
                id_product,
                id_product_attribute_value1,
                id_product_attribute_value2
              );
            }
          }
        }
      }
    }
    // duyet qua tung product attribute
  } catch (error) {
    throw error;
  }
}

async function insertProductSKU(
  transaction,
  productSKUs,
  id_product,
  id_product_attribute1,
  id_product_attribute2
) {
  try {
    const query = `
      INSERT INTO ProductSKU(quantity, price, priceBefore, enable, idProduct, idAttributeValue1, idAttributeValue2)
      OUTPUT inserted.id AS id_product_sku 
      SELECT 
        @quantity, @price, @priceBefore, @enable, @id_product, @id_product_attribute1, @id_product_attribute2
      `;
    const result = await transaction
      .request()
      .input("quantity", Number(productSKUs.totalStock))
      .input("price", Number(productSKUs.price))
      .input("priceBefore", Number(productSKUs.priceBefore))
      .input("enable", true)
      .input("id_product", id_product)
      .input(
        "id_product_attribute1",
        id_product_attribute1 ? id_product_attribute1 : null
      )
      .input(
        "id_product_attribute2",
        id_product_attribute2 ? id_product_attribute2 : null
      )
      .query(query);
    return result.recordset[0].id_product_sku;
  } catch (error) {
    console.log(error);
    throw "Error insert product sku: ";
  }
}

async function insertProductAttributeAndValue(
  transaction,
  attributes,
  id_product
) {
  try {
    const resultMap = {};
    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i];
      const id_product_attribute = await insertProductAttribute(
        transaction,
        attribute,
        id_product,
        i + 1
      );
      resultMap[id_product_attribute] = {
        productAttributeID: id_product_attribute,
        productAttributeValueIDs: [],
      };

      if (attribute.attributeValue && attribute.attributeValue.length > 0) {
        for (let j = 0; j < attribute.attributeValue.length; j++) {
          const attributeValue = attribute.attributeValue[j];
          const id_product_attribute_value = await insertProductAttributeValue(
            transaction,
            attributeValue,
            id_product_attribute
          );
          resultMap[id_product_attribute].productAttributeValueIDs.push(
            id_product_attribute_value
          );
          if (i === 0) {
            await updateMedia(
              transaction,
              id_product,
              attributeValue.mediaID,
              id_product_attribute_value,
              attributeValue.locAttributeValueName
            );
          }
        }
      }
    }
    const resultArray = Object.values(resultMap);
    return resultArray;
  } catch (error) {
    throw "Error insert product attribute and value: ";
  }
}

async function insertProductAttributeValue(
  transaction,
  attributeValue,
  id_product_attribute
) {
  try {
    const query = `
      INSERT INTO ProductAttributeValue(valueName, productAttributeID)
      OUTPUT inserted.id AS id_product_attribute_value
      SELECT 
        @valueName, @id_product_attribute
      `;
    const result = await transaction
      .request()
      .input("valueName", attributeValue.locAttributeValueName)
      .input("id_product_attribute", id_product_attribute)
      .query(query);
    return result.recordset[0].id_product_attribute_value;
  } catch (error) {
    throw "Error insert product attribute value: ";
  }
}

async function insertProductAttribute(
  transaction,
  attribute,
  id_product,
  index
) {
  try {
    const query = `
      INSERT INTO ProductAttribute(name, description, type, id_product)
      OUTPUT inserted.id AS id_product_attribute
      SELECT 
        @name, @description, @type, @id_product
      `;
    const result = await transaction
      .request()
      .input("name", attribute.locAttributeName)
      .input("description", attribute.locAttributeName)
      .input("type", index)
      .input("id_product", id_product)
      .query(query);
    return result.recordset[0].id_product_attribute;
  } catch (error) {
    throw "Error insert product attribute: ";
  }
}

async function insertProduct(
  transaction,
  name,
  slogan,
  description,
  notes,
  madeIn,
  uses,
  ingredient,
  objectsOfUse,
  preserve,
  instructionsForUse,
  height,
  width,
  length,
  weight,
  sellQuantity,
  createdDate,
  idCategory,
  idAccount
) {
  try {
    const query = `
      INSERT INTO Product(name, slogan, description, notes, uses, madeIn, sellQuantity, createdDate, id_Category, id_User, ingredient, objectsOfUse, preserve, instructionsForUse, height, width, length, weight)
      OUTPUT inserted.id AS id_product
      SELECT 
        @name, @slogan, @description, @notes, @uses, @madeIn, @sellQuantity, @createdDate, Category.id, [User].id, @ingredient, @objectsOfUse, @preserve, @instructionsForUse, @height, @width, @length, @weight
      FROM [User], Category
      WHERE [User].id_account = @idAccount AND Category.id = @idCategory `;
    const result = await transaction
      .request()
      .input("name", name)
      .input("slogan", slogan)
      .input("description", description)
      .input("notes", notes)
      .input("uses", uses)
      .input("madeIn", madeIn)
      .input("ingredient", ingredient) //
      .input("objectsOfUse", objectsOfUse)
      .input("preserve", preserve)
      .input("instructionsForUse", instructionsForUse)
      .input("height", Number(height))
      .input("width", Number(width))
      .input("length", Number(length))
      .input("weight", Number(weight)) //
      .input("sellQuantity", Number(sellQuantity))
      .input("createdDate", createdDate)
      .input("idCategory", idCategory)
      .input("idAccount", idAccount)
      .query(query);
    return result.recordset[0].id_product;
  } catch (error) {
    console.log(error);
    throw "Error insert product: ";
  }
}

router.post(
  "/upload-image",
  upload.single("file"),
  checkAuth,
  checkRoleAdmin,
  async (request, response) => {
    try {
      const uniqueFileName = Date.now() + "-" + request.file.originalname;
      const blob = firebase.bucket.file(uniqueFileName);
      const blobWriter = blob.createWriteStream({
        metadata: {
          contentType: request.file.mimetype,
        },
      });
      blobWriter.on("error", (err) => {
        response.status(500).json({
          error: err.message,
        });
      });

      blobWriter.on("finish", async () => {
        try {
          const signedUrls = await blob.getSignedUrl({
            action: "read",
            expires: "03-01-2030",
          });
          const publicUrl = signedUrls[0];
          const query = `
            INSERT INTO Media(linkString, title, description, createdDate)
            OUTPUT inserted.id AS id_media
            SELECT @url AS linkString, @title AS title, @description AS description, @createdDate AS createdDate
          `;
          const result = await database
            .request()
            .input("url", publicUrl)
            .input("title", uniqueFileName)
            .input("description", uniqueFileName)
            .input("createdDate", new Date())
            .query(query);
          response.status(201).json({
            Message: "Upload successful!",
            url: publicUrl,
            mediaID: result.recordset[0].id_media,
          });
        } catch (err) {
          response.status(500).json({
            error: err.message,
          });
        }
      });

      blobWriter.end(request.file.buffer);
    } catch (error) {
      console.log(error);
      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

module.exports = router;
