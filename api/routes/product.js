const express = require("express");

const router = express.Router();
const database = require("../../config");

require("dotenv").config();

async function getProductDetail(idProduct) {
  try {
    const queryProduct = `
      SELECT 
      p.id AS productID,
      p.name AS productName,
      p.description AS productDescription,
      p.slogan AS productSlogan,
      p.notes AS productNotes,
      p.madeIn AS productMadeIn,
      p.uses AS productUses,
      p.ingredient AS productIngredient,
      p.objectsOfUse AS productObjectsOfUse,
      p.preserve AS productPreserve, 
      p.instructionsForUse AS productInstructionsForUse,
      p.height AS productHeight,
      p.width AS productWidth,
      p.length AS productLength,
      p.weight AS productWeight,  
      ps.id AS productSKUID,
      ps.price AS price,
      ps.priceBefore AS priceBefore,
      m.id AS mediaID,
      m.linkString AS linkString,
      m.title AS title,
      m.description AS description,
      c.id AS productCategoryID,
      c.name AS productCategoryName,
      c.image AS linkStringCate
      FROM Product as p 
      JOIN ProductSku as ps ON p.id = ps.idProduct 
      LEFT JOIN Media AS m ON p.id = m.id_product
      LEFT JOIN ProductAttributeValue AS pav ON ps.idAttributeValue1 = pav.id AND m.productAttributeValueID = pav.id
      LEFT JOIN Category as c ON p.id_Category = c.id
      WHERE p.id = @idProduct
    `;

    const result = await database
      .request()
      .input("idProduct", idProduct)
      .query(queryProduct);

    const resultMap = {};
    result.recordset.forEach((item) => {
      const { productID, productSKUID, mediaID } = item;
      if (!resultMap[productID]) {
        resultMap[productID] = {
          productID: productID,
          productName: item.productName,
          productDescription: item.productDescription,
          productSlogan: item.productSlogan,
          productNotes: item.productNotes,
          productMadeIn: item.productMadeIn,
          productUses: item.productUses,
          productIngredient: item.productIngredient,
          productObjectsOfUse: item.productObjectsOfUse,
          productPreserve: item.productPreserve,
          productInstructionsForUse: item.productInstructionsForUse,
          productHeight: item.productHeight,
          productWidth: item.productWidth,
          productLength: item.productLength,
          productWeight: item.productWeight,
          medias: [],
          seller: {
            sellerID: "75B9BA7C-0258-4830-9F08-66B74720229B",
            businessName: "HLSHOP",
            contactFullName: "Bùi Hào Quang",
            userType: 0,
            linkString:
              "https://storage.googleapis.com/hlsop-393ef.appspot.com/image.png?GoogleAccessId=firebase-adminsdk-5uq3u%40hlsop-393ef.iam.gserviceaccount.com&Expires=16730298000&Signature=mdOGFfym9%2FHsZgKS5l1NnpGX7yWhHahhEB7TXkPv9zbE8GbJ6Akf1HSNNpyLD7VRY5O%2BlWTuQWdv2wu6bFyXZmvlp%2FgR5AoNqamat8NqZ79QVIT0yyN36D6dVjliL2U61%2Fg2Cl6ZSYXnXudcC6TXFVhlbsCb7gua7tBCYbB1XDPC4EiAT47ztd256TmB%2B1jwMBz3w24hB7xt7nWwv6Pk3oc4XiyjeZAIjAsVYIiCwMTjg0lvkoC279wzfeEZapDkWwS8f4NgT8faJbaLrP4ZOTMl2EQYfomVdQwTjdxxt7avrRJyaRhd1yzV63afuEx6%2Ff71QmgY9Gxp7U%2F%2Fygjr3g%3D%3D",
          },
          productCategory: {
            productCategoryID: item.productCategoryID,
            productCategoryName: item.productCategoryName,
            linkString: item.linkStringCate,
          },
          productSKU: [],
        };
      }
      const mediaExist = resultMap[productID].medias.some(
        (media) => media.mediaID === mediaID
      );
      if (!mediaExist) {
        resultMap[productID].medias.push({
          mediaID: mediaID,
          linkString: item.linkString,
          title: item.title ? item.title : "",
          description: item.description ? item.description : "",
        });
      }

      // Kiểm tra xem productSKU có tồn tại trong productSKU hay không
      const skuExist = resultMap[productID].productSKU.some(
        (sku) =>
          sku.productSKUID === productSKUID ||
          sku.linkString === item.linkString
      );
      if (!skuExist) {
        resultMap[productID].productSKU.push({
          productSKUID: productSKUID,
          linkString: item.linkString,
          price: item.price.toString(),
          priceBefore: item.priceBefore.toString(),
        });
      }
    });

    const resultArray = Object.values(resultMap);
    return resultArray[0];
  } catch (error) {
    throw error;
  }
}
router.get("/get-detail", async (request, response) => {
  try {
    const idProduct = request.query.ProductID;
    const result = await getProductDetail(idProduct);
    response.status(200).json(result);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

async function getListProduct() {
  try {
    const queryProduct = `
              SELECT
              p.id AS productID,
              p.name AS productName,
              p.description AS productDescription,
              p.slogan AS productSlogan,
              p.notes AS productNotes,
              p.madeIn AS productMadeIn,
              p.sellQuantity AS sellQuantity,
              p.createdDate AS createdDate,
              ps.id AS productSKUID,
              ps.price AS price,
              ps.priceBefore AS priceBefore,
              m.id AS mediaID,
              m.linkString AS linkString,
              m.title AS title,
              m.description AS description
              FROM Product as p
              JOIN ProductSku as ps ON p.id = ps.idProduct
              JOIN Media as m ON p.id = m.id_product
              WHERE ps.quantity > 0 AND ps.enable = 1
              ORDER BY p.sellQuantity DESC
            `;
    const result = await database.request().query(queryProduct);

    const resultMap = {};
    result.recordset.forEach((item) => {
      const { productID, productSKUID, mediaID } = item;
      if (!resultMap[productID]) {
        resultMap[productID] = {
          productID: productID,
          productName: item.productName,
          productDescription: item.productDescription,
          productSlogan: item.productSlogan,
          productNotes: item.productNotes,
          productMadeIn: item.productMadeIn,
          sellQuantity: item.sellQuantity,
          createdDate: item.createdDate,
          medias: [
            {
              mediaID: mediaID,
              linkString: item.linkString,
              title: item.title ? item.title : "",
              description: item.description ? item.description : "",
            },
          ],
          productSKU: [
            {
              productSKUID: productSKUID,
              price: item.price,
              priceBefore: item.priceBefore,
            },
          ],
        };
      }
    });

    const resultArray = Object.values(resultMap);
    return resultArray;
  } catch (error) {
    throw error;
  }
}

router.get("/get-list-best-seller", async (request, response) => {
  try {
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;
    var search = request.query.search ? request.query.search.toLowerCase() : "";
    var sortBy = parseInt(request.query.sortBy);
    var minAmount = parseInt(request.query.minAmount);
    var maxAmount = parseInt(request.query.maxAmount);

    const resultArray = await getListProduct();

    resultArray.sort((a, b) => {
      return b.sellQuantity - a.sellQuantity;
    });

    const filteredResult = resultArray.filter((item) => {
      const productNameMatch = item.productName
        ? item.productName.toLowerCase().includes(search)
        : false;
      const productDescriptionMatch = item.productDescription
        ? item.productDescription.toLowerCase().includes(search)
        : false;
      const productSloganMatch = item.productSlogan
        ? item.productSlogan.toLowerCase().includes(search)
        : false;
      const productNotesMatch = item.productNotes
        ? item.productNotes.toLowerCase().includes(search)
        : false;
      const productMadeInMatch = item.productMadeIn
        ? item.productMadeIn.toLowerCase().includes(search)
        : false;
      const priceMatch =
        !isNaN(minAmount) && !isNaN(maxAmount)
          ? item.productSKU &&
            item.productSKU.length > 0 &&
            item.productSKU[0].price >= minAmount &&
            item.productSKU[0].price <= maxAmount
          : true;
      return (
        (productNameMatch ||
          productDescriptionMatch ||
          productSloganMatch ||
          productNotesMatch ||
          productMadeInMatch) &&
        priceMatch
      );
    });
    //sortBy: 0: Giá tăng dần, 1: Giá giảm dần, 2: mới nhất, 3: cũ nhất, 4: phổ biến nhất, 5: bán chạy nhất
    switch (sortBy) {
      case 0:
        filteredResult.sort((a, b) => {
          return a.productSKU[0].price - b.productSKU[0].price;
        });
        break;
      case 1:
        filteredResult.sort((a, b) => {
          return b.productSKU[0].price - a.productSKU[0].price;
        });
        break;
      case 2:
        filteredResult.sort((a, b) => {
          return new Date(b.createdDate) - new Date(a.createdDate);
        });
        break;
      case 3:
        filteredResult.sort((a, b) => {
          return new Date(a.createdDate) - new Date(b.createdDate);
        });
        break;

      case 4:
        filteredResult.sort((a, b) => {
          return (
            b.sellQuantity / b.productSKU[0].price -
            a.sellQuantity / a.productSKU[0].price
          );
        });
        break;
      case 5:
        filteredResult.sort((a, b) => {
          return b.sellQuantity - a.sellQuantity;
        });
        break;
      default:
        break;
    }
    // Phân trang
    const paginatedResult = filteredResult.slice(offset, offset + limit);

    response
      .status(200)
      .json({ result: paginatedResult, total: filteredResult.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ errorCode: "Internal Server Error" });
  }
});

router.get("/get-list-new", async (request, response) => {
  try {
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;
    var search = request.query.search ? request.query.search.toLowerCase() : "";
    var sortBy = parseInt(request.query.sortBy);
    var minAmount = parseInt(request.query.minAmount);
    var maxAmount = parseInt(request.query.maxAmount);

    const resultArray = await getListProduct();

    resultArray.sort((a, b) => {
      return new Date(b.createdDate) - new Date(a.createdDate);
    });

    const filteredResult = resultArray.filter((item) => {
      const productNameMatch = item.productName
        ? item.productName.toLowerCase().includes(search)
        : false;
      const productDescriptionMatch = item.productDescription
        ? item.productDescription.toLowerCase().includes(search)
        : false;
      const productSloganMatch = item.productSlogan
        ? item.productSlogan.toLowerCase().includes(search)
        : false;
      const productNotesMatch = item.productNotes
        ? item.productNotes.toLowerCase().includes(search)
        : false;
      const productMadeInMatch = item.productMadeIn
        ? item.productMadeIn.toLowerCase().includes(search)
        : false;
      const priceMatch =
        !isNaN(minAmount) && !isNaN(maxAmount) // Check if minAmount and maxAmount are valid numbers
          ? item.productSKU &&
            item.productSKU.length > 0 &&
            item.productSKU[0].price >= minAmount &&
            item.productSKU[0].price <= maxAmount
          : true;
      return (
        (productNameMatch ||
          productDescriptionMatch ||
          productSloganMatch ||
          productNotesMatch ||
          productMadeInMatch) &&
        priceMatch
      );
    });
    //sortBy: 0: Giá tăng dần, 1: Giá giảm dần, 2: mới nhất, 3: cũ nhất, 4: phổ biến nhất, 5: bán chạy nhất
    switch (sortBy) {
      case 0:
        filteredResult.sort((a, b) => {
          return a.productSKU[0].price - b.productSKU[0].price;
        });
        break;
      case 1:
        filteredResult.sort((a, b) => {
          return b.productSKU[0].price - a.productSKU[0].price;
        });
        break;
      case 2:
        filteredResult.sort((a, b) => {
          return new Date(b.createdDate) - new Date(a.createdDate);
        });
        break;
      case 3:
        filteredResult.sort((a, b) => {
          return new Date(a.createdDate) - new Date(b.createdDate);
        });
        break;

      case 4:
        filteredResult.sort((a, b) => {
          return (
            b.sellQuantity / b.productSKU[0].price -
            a.sellQuantity / a.productSKU[0].price
          );
        });
        break;
      case 5:
        filteredResult.sort((a, b) => {
          return b.sellQuantity - a.sellQuantity;
        });
        break;
      default:
        break;
    }
    // Phân trang
    const paginatedResult = filteredResult.slice(offset, offset + limit);

    response
      .status(200)
      .json({ result: paginatedResult, total: filteredResult.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ errorCode: "Internal Server Error" });
  }
});

router.get("/get-list-hot", async (request, response) => {
  try {
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;
    var sortBy = parseInt(request.query.sortBy);
    var search = request.query.search ? request.query.search.toLowerCase() : "";
    var minAmount = parseInt(request.query.minAmount);
    var maxAmount = parseInt(request.query.maxAmount);
    const resultArray = await getListProduct();

    resultArray.sort((a, b) => {
      const weightSellQuantity = 1; // Trọng số cho sellQuantity
      const weightPrice = 2; // Trọng số cho price
      const weightPriceBefore = -1; // Trọng số cho priceBefore (âm để giảm điểm nếu có giảm giá)

      const scoreA =
        a.sellQuantity * weightSellQuantity +
        a.price * weightPrice -
        a.priceBefore * weightPriceBefore;
      const scoreB =
        b.sellQuantity * weightSellQuantity +
        b.price * weightPrice -
        b.priceBefore * weightPriceBefore;

      return scoreB - scoreA; // Sắp xếp giảm dần theo điểm hotness
    });

    const filteredResult = resultArray.filter((item) => {
      const productNameMatch = item.productName
        ? item.productName.toLowerCase().includes(search)
        : false;
      const productDescriptionMatch = item.productDescription
        ? item.productDescription.toLowerCase().includes(search)
        : false;
      const productSloganMatch = item.productSlogan
        ? item.productSlogan.toLowerCase().includes(search)
        : false;
      const productNotesMatch = item.productNotes
        ? item.productNotes.toLowerCase().includes(search)
        : false;
      const productMadeInMatch = item.productMadeIn
        ? item.productMadeIn.toLowerCase().includes(search)
        : false;
      const priceMatch =
        !isNaN(minAmount) && !isNaN(maxAmount) // Check if minAmount and maxAmount are valid numbers
          ? item.productSKU &&
            item.productSKU.length > 0 &&
            item.productSKU[0].price >= minAmount &&
            item.productSKU[0].price <= maxAmount
          : true;
      return (
        (productNameMatch ||
          productDescriptionMatch ||
          productSloganMatch ||
          productNotesMatch ||
          productMadeInMatch) &&
        priceMatch
      );
    });

    //sortBy: 0: Giá tăng dần, 1: Giá giảm dần, 2: mới nhất, 3: cũ nhất, 4: phổ biến nhất, 5: bán chạy nhất
    switch (sortBy) {
      case 0:
        filteredResult.sort((a, b) => {
          return a.productSKU[0].price - b.productSKU[0].price;
        });
        break;
      case 1:
        filteredResult.sort((a, b) => {
          return b.productSKU[0].price - a.productSKU[0].price;
        });
        break;
      case 2:
        filteredResult.sort((a, b) => {
          return new Date(b.createdDate) - new Date(a.createdDate);
        });
        break;
      case 3:
        filteredResult.sort((a, b) => {
          return new Date(a.createdDate) - new Date(b.createdDate);
        });
        break;

      case 4:
        filteredResult.sort((a, b) => {
          return (
            b.sellQuantity / b.productSKU[0].price -
            a.sellQuantity / a.productSKU[0].price
          );
        });
        break;
      case 5:
        filteredResult.sort((a, b) => {
          return b.sellQuantity - a.sellQuantity;
        });
        break;
      default:
        break;
    }
    // Phân trang
    const paginatedResult = filteredResult.slice(offset, offset + limit);

    response
      .status(200)
      .json({ result: paginatedResult, total: filteredResult.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ errorCode: "Internal Server Error" });
  }
});

router.get("/get-list-good-price-today", async (request, response) => {
  try {
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;
    var search = request.query.search ? request.query.search.toLowerCase() : "";
    var sortBy = parseInt(request.query.sortBy);
    var minAmount = parseInt(request.query.minAmount);
    var maxAmount = parseInt(request.query.maxAmount);

    const resultArray = await getListProduct();

    resultArray.sort((a, b) => {
      const calculateDiscountRate = (product) =>
        (product.priceBefore - product.price) / product.priceBefore;

      const discountRateB = calculateDiscountRate(b.productSKU[0]);
      const discountRateA = calculateDiscountRate(a.productSKU[0]);

      return discountRateB - discountRateA;
    });

    const filteredResult = resultArray.filter((item) => {
      const productNameMatch = item.productName
        ? item.productName.toLowerCase().includes(search)
        : false;
      const productDescriptionMatch = item.productDescription
        ? item.productDescription.toLowerCase().includes(search)
        : false;
      const productSloganMatch = item.productSlogan
        ? item.productSlogan.toLowerCase().includes(search)
        : false;
      const productNotesMatch = item.productNotes
        ? item.productNotes.toLowerCase().includes(search)
        : false;
      const productMadeInMatch = item.productMadeIn
        ? item.productMadeIn.toLowerCase().includes(search)
        : false;
      const priceMatch =
        !isNaN(minAmount) && !isNaN(maxAmount) // Check if minAmount and maxAmount are valid numbers
          ? item.productSKU &&
            item.productSKU.length > 0 &&
            item.productSKU[0].price >= minAmount &&
            item.productSKU[0].price <= maxAmount
          : true;
      return (
        (productNameMatch ||
          productDescriptionMatch ||
          productSloganMatch ||
          productNotesMatch ||
          productMadeInMatch) &&
        priceMatch
      );
    });
    //sortBy: 0: Giá tăng dần, 1: Giá giảm dần, 2: mới nhất, 3: cũ nhất, 4: phổ biến nhất, 5: bán chạy nhất
    switch (sortBy) {
      case 0:
        filteredResult.sort((a, b) => {
          return a.productSKU[0].price - b.productSKU[0].price;
        });
        break;
      case 1:
        filteredResult.sort((a, b) => {
          return b.productSKU[0].price - a.productSKU[0].price;
        });
        break;
      case 2:
        filteredResult.sort((a, b) => {
          return new Date(b.createdDate) - new Date(a.createdDate);
        });
        break;
      case 3:
        filteredResult.sort((a, b) => {
          return new Date(a.createdDate) - new Date(b.createdDate);
        });
        break;

      case 4:
        filteredResult.sort((a, b) => {
          return (
            b.sellQuantity / b.productSKU[0].price -
            a.sellQuantity / a.productSKU[0].price
          );
        });
        break;
      case 5:
        filteredResult.sort((a, b) => {
          return b.sellQuantity - a.sellQuantity;
        });
        break;
      default:
        break;
    }
    // Phân trang
    const paginatedResult = filteredResult.slice(offset, offset + limit);

    response
      .status(200)
      .json({ result: paginatedResult, total: filteredResult.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ errorCode: "Internal Server Error" });
  }
});

async function getListProductSameCategory(idProduct, idCategory) {
  try {
    const queryProduct = `
      SELECT 
      p.id AS productID,
      p.name AS productName,
      p.description AS productDescription,
      p.slogan AS productSlogan,
      p.notes AS productNotes,
      p.madeIn AS productMadeIn,
      ps.id AS productSKUID,
      ps.price AS price,
      ps.priceBefore AS priceBefore,
      m.id AS mediaID,
      m.linkString AS linkString,
      m.title AS title,
      m.description AS description
      FROM Product as p
      JOIN ProductSku as ps ON p.id = ps.idProduct
      JOIN Media as m ON p.id = m.id_product
      WHERE p.id_Category = @idCategory
      ORDER BY p.sellQuantity DESC
    `;

    const result = await database
      .request()
      .input("idCategory", idCategory)
      .query(queryProduct);

    const resultMap = {};
    result.recordset.forEach((item) => {
      const { productID, productSKUID, mediaID } = item;
      if (!resultMap[productID]) {
        resultMap[productID] = {
          productID: productID,
          productName: item.productName,
          productDescription: item.productDescription,
          productSlogan: item.productSlogan,
          productNotes: item.productNotes,
          productMadeIn: item.productMadeIn,
          medias: [
            {
              mediaID: mediaID,
              linkString: item.linkString,
              title: item.title ? item.title : "",
              description: item.description ? item.description : "",
            },
          ],
          productSKU: [
            {
              productSKUID: productSKUID,
              price: item.price,
              priceBefore: item.priceBefore,
            },
          ],
        };
      }
    });

    const resultArray = Object.values(resultMap);
    return resultArray;
  } catch (error) {
    throw error;
  }
}
router.get("/get-list-same-category", async (request, response) => {
  try {
    var productID = request.query.productID;
    var productCategoryID = request.query.productCategoryID;
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;
    var search = request.query.search ? request.query.search.toLowerCase() : "";

    const resultArray = await getListProductSameCategory(
      productID,
      productCategoryID
    );
    const filteredResult1 = resultArray.filter((item) => {
      if (item.productID !== productID) {
        console.log(item.productID);
      }
      return item.productID !== productID;
    });
    // const filteredResult = filteredResult1.filter((item) => {
    //   const productNameMatch = item.productName
    //     ? item.productName.toLowerCase().includes(search)
    //     : false;
    //   const productDescriptionMatch = item.productDescription
    //     ? item.productDescription.toLowerCase().includes(search)
    //     : false;
    //   const productSloganMatch = item.productSlogan
    //     ? item.productSlogan.toLowerCase().includes(search)
    //     : false;
    //   const productNotesMatch = item.productNotes
    //     ? item.productNotes.toLowerCase().includes(search)
    //     : false;
    //   const productMadeInMatch = item.productMadeIn
    //     ? item.productMadeIn.toLowerCase().includes(search)
    //     : false;
    //   return (
    //     productNameMatch ||
    //     productDescriptionMatch ||
    //     productSloganMatch ||
    //     productNotesMatch ||
    //     productMadeInMatch
    //   );
    // });

    // // Phân trang
    // const paginatedResult = filteredResult.slice(offset, offset + limit);

    response
      .status(200)
      .json({ result: filteredResult1, total: filteredResult1.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ errorCode: "Internal Server Error" });
  }
});

router.get("/get-product-attribute", async (request, response) => {
  try {
    const productID = request.query.productID;
    const responseData = await getProductAttributes(productID);
    response.status(200).json(responseData);
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

async function getProductAttributes(productID) {
  const query = `
    SELECT
      pa.id AS attributeID,
      pa.name AS locAttributeName,
      pa.description AS locAttributeDescription,
      pav.id AS attributeValueID,
      pav.valueName AS locAttributeValueName,
      pav.valueName AS locAttributeValueDescription
    FROM ProductAttribute pa
    LEFT JOIN ProductAttributeValue pav ON pa.id = pav.productAttributeID
    WHERE pa.id_product = @productID
    ORDER BY pa.type, pav.id;
  `;

  const result = await database
    .request()
    .input("productID", productID)
    .query(query);

  const responseData = [];

  result.recordset.forEach((row) => {
    const existingAttribute = responseData.find(
      (attr) => attr.attributeID === row.attributeID
    );

    if (existingAttribute) {
      existingAttribute.attributeValue.push({
        attributeValueID: row.attributeValueID,
        locAttributeValueName: row.locAttributeValueName,
        locAttributeValueDescription: row.locAttributeValueDescription,
      });
    } else {
      responseData.push({
        attributeID: row.attributeID,
        locAttributeName: row.locAttributeName,
        locAttributeDescription: row.locAttributeDescription,
        attributeValue: [
          {
            attributeValueID: row.attributeValueID,
            locAttributeValueName: row.locAttributeValueName,
            locAttributeValueDescription: row.locAttributeValueDescription,
          },
        ],
      });
    }
  });

  return responseData;
}

router.get("/get-product-sku-by-product-id", async (request, response) => {
  try {
    const productID = request.query.productID;
    const skuss = await processSkus(productID);
    response.status(200).json({
      productID: productID,
      productSKU: skuss,
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

async function processSkus(productID) {
  try {
    const query = `
      SELECT 
      ps.id AS productSKUID,
      ps.quantity AS quantity,
      ps.price AS price,
      ps.priceBefore AS priceBefore,
      pav.id AS idAttributeValue1,
      pav.valueName AS locAttributeValueName1,
      pav2.id AS idAttributeValue2,
      pav2.valueName AS locAttributeValueName2,
      pa.name AS locAttributeName,
      pa.id AS attributeID,
      pa2.name AS locAttributeName2,
      pa2.id AS attributeID2,
      Media.id AS mediaID,
      Media.linkString AS linkString,
      Media.productAttributeValueID
      FROM ProductSku AS ps
      LEFT JOIN ProductAttributeValue AS pav ON ps.idAttributeValue1 = pav.id
      LEFT JOIN ProductAttributeValue AS pav2 ON ps.idAttributeValue2 = pav2.id
      LEFT JOIN ProductAttribute AS pa ON pav.productAttributeID = pa.id
      LEFT JOIN ProductAttribute AS pa2 ON pav2.productAttributeID = pa2.id
      JOIN Product ON ps.idProduct = Product.id 
      LEFT JOIN Media ON Product.id = Media.id_product
      WHERE idProduct = @productID AND ps.quantity > 0 AND ps.enable = 1
      `;
    const result = await database
      .request()
      .input("productID", productID)
      .query(query);
    const resultMap = {};
    const linkStringMap = {};
    result.recordset.forEach((item) => {
      const {
        productSKUID,
        mediaID,
        idAttributeValue1,
        idAttributeValue2,
        attributeID,
        attributeID2,
        ...rest
      } = item;
      if (!resultMap[productSKUID]) {
        resultMap[productSKUID] = {
          productSKUID: productSKUID,
          linkString: "",
          price: item.price,
          priceBefore: item.priceBefore,
          attribute: [],
        };
      }
      const linkStringExist =
        linkStringMap[mediaID] &&
        linkStringMap[mediaID].linkString === item.linkString;
      if (!linkStringExist) {
        if (mediaID) {
          linkStringMap[item.productAttributeValueID] = {
            mediaID: mediaID,
            linkString: item.linkString,
            productAttributeValueID: item.productAttributeValueID,
          };
        }
      }

      const attribute1Exit = resultMap[productSKUID].attribute.some(
        (attribute) => attribute.attributeValueID === idAttributeValue1
      );

      if (!attribute1Exit) {
        if (idAttributeValue1) {
          resultMap[productSKUID].attribute.push({
            localizedAttributeValueID: idAttributeValue1,
            locAttributeValueName: item.locAttributeValueName1,
            locAttributeValueDescription: item.locAttributeValueDescription1,
            attributeValueID: idAttributeValue1,
            locAttributeName: item.locAttributeName,
            attributeID: item.attributeID,
          });
        }
      }
      const attribute2Exit = resultMap[productSKUID].attribute.some(
        (attribute) =>
          attribute.attributeValueID === idAttributeValue2 &&
          attribute.attributeID === item.attributeID2
      );
      if (!attribute2Exit) {
        if (idAttributeValue2) {
          resultMap[productSKUID].attribute.push({
            localizedAttributeValueID: idAttributeValue2,
            locAttributeValueName: item.locAttributeValueName2,
            locAttributeValueDescription: item.locAttributeValueDescription2,
            attributeValueID: idAttributeValue2,
            locAttributeName: item.locAttributeName2,
            attributeID: item.attributeID2,
          });
        }
      }
    });
    for (const productSKUID in resultMap) {
      const attributes = resultMap[productSKUID].attribute;
      for (const attribute of attributes) {
        const { localizedAttributeValueID } = attribute; // Thêm dòng này để đảm bảo localizedAttributeValueID được định nghĩa.
        const linkStringMapItem = linkStringMap[localizedAttributeValueID];
        if (
          linkStringMapItem &&
          localizedAttributeValueID == linkStringMapItem.productAttributeValueID
        ) {
          resultMap[productSKUID].linkString = linkStringMapItem.linkString;
          break;
        }
      }
    }

    const resultArray = Object.values(resultMap);
    return resultArray;
  } catch (error) {
    console.log(error);
    throw "Error in processSkus";
  }
}

module.exports = router;
