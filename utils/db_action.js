const database = require("../config");

async function getImageListBySKU(productID, sku) {
  const resultImageList = [];
  if (sku.idAttributeValue1 === null) {
    const queryImage =
      "SELECT id AS mediaID, linkString AS linkString, title AS title, description AS description FROM Media WHERE id_product = @idProduct AND isDefault = 1";
    const imageResult = await database
      .request()
      .input("idProduct", productID)
      .query(queryImage);
    resultImageList.push(imageResult.recordset[0]);
    return resultImageList;
  } else {
    const queryImage =
      "SELECT id AS mediaID, linkString AS linkString, title AS title, description AS description FROM Media WHERE productAttributeValueID = @productAttributeValueID";
    const imageResult = await database
      .request()
      .input("productAttributeValueID", sku.idAttributeValue1)
      .query(queryImage);
    resultImageList.push(imageResult.recordset[0]);
    return resultImageList;
  }
}

async function getAttributes(productID, sku) {
  const attributes = [];

  if (sku.idAttributeValue1 !== null) {
    const attribute1 = await processAttribute(
      productID,
      sku.idAttributeValue1,
      sku
    );
    attributes.push(attribute1);

    if (sku.idAttributeValue2 !== null) {
      const attribute2 = await processAttribute(
        productID,
        sku.idAttributeValue2,
        sku
      );
      attributes.push(attribute2);
    }
  }

  return attributes;
}

async function processAttribute(productID, attributeValueID, sku) {
  const queryAttributeValue =
    "SELECT * FROM ProductAttributeValue WHERE id = @id";
  const resultAttributeValue = await database
    .request()
    .input("id", attributeValueID)
    .query(queryAttributeValue);

  const queryattributes = "SELECT * FROM ProductAttribute WHERE id = @id ";
  const attributesResult = await database
    .request()
    .input("id", resultAttributeValue.recordset[0].productAttributeID)
    .query(queryattributes);

  var attribute = {
    productSKUConditionID: sku.productSKUID,
    productSKUID: sku.productSKUID,
    attributeID: attributesResult.recordset[0].id,
    locAttributeName: attributesResult.recordset[0].name,
    locAttributeDescription: attributesResult.recordset[0].description,
    attributeValueID: resultAttributeValue.recordset[0].id,
    locAttributeValueName: resultAttributeValue.recordset[0].valueName,
    locAttributeValueDescription: resultAttributeValue.recordset[0].valueName,
  };
  return attribute;
}

module.exports = {
  getAttributes,
  getImageListBySKU,
};
