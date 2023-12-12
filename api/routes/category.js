const express = require("express");

const router = express.Router();
const database = require("../../config");

router.get("/get-list", async (request, response) => {
  try {
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;

    const query = ` SELECT 
      id AS productCategoryID,
      name AS productCategoryName,
      image AS linkString
      FROM Category
      ORDER BY name
      `;
    const result = await database.request().query(query);
    const resultMap = {};
    result.recordset.forEach((item) => {
      const { productCategoryID, ...rest } = item;
      if (!resultMap[productCategoryID]) {
        resultMap[productCategoryID] = {
          productCategoryID: productCategoryID,
          ...rest,
        };
      }
    });
    const resultArray = Object.values(resultMap);
    const paginatedResult = resultArray.slice(offset, offset + limit);
    response.status(200).json({
      result: paginatedResult,
      total: resultArray.length,
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

async function getListProductByCategory(idCategory) {
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

//Lấy những sản phẩm của 1 categoty cụ thể
router.get("/detail", async (request, response) => {
  try {
    var idCategory = request.query.productCategoryID;
    var offset = parseInt(request.query.offset) || 0;
    var limit = parseInt(request.query.limit) || 10;
    var search = request.query.search ? request.query.search.toLowerCase() : "";
    var sortBy = parseInt(request.query.sortBy);
    var minAmount = parseInt(request.query.minAmount);
    var maxAmount = parseInt(request.query.maxAmount);

    const resultArray = await getListProductByCategory(idCategory);

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
module.exports = router;
