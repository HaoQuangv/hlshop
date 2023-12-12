const express = require("express");
var cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const path = require("path");
const app = express();
app.use(cors());

const port = 80;

//import file
const accountRouter = require("./api/routes/account");
const categoryRouter = require("./api/routes/category");
const userRouter = require("./api/routes/user");
const addressRouter = require("./api/routes/address");
const productRouter = require("./api/routes/product");
const cartRouter = require("./api/routes/cart");
const cityRouter = require("./api/routes/city");
const districtRouter = require("./api/routes/district");
const wardRouter = require("./api/routes/ward");
const orderRouter = require("./api/routes/order");
const feeShipRouter = require("./api/routes/feeship");
const subcribeRouter = require("./api/routes/subcribe");
//import file admin
const adminAccountRouter = require("./admin/routes/account");
const adminCategoryRouter = require("./admin/routes/category");
const adminProductRouter = require("./admin/routes/product");
const adminOrderRouter = require("./admin/routes/order");
const adminUserRouter = require("./admin/routes/user");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//use method from file
app.use("/api/hlshop/auth", accountRouter);
app.use("/api/hlshop/users", userRouter);
app.use("/api/hlshop/product-category", categoryRouter);
app.use("/api/hlshop/receiver-address", addressRouter);
app.use("/api/hlshop/product", productRouter);
app.use("/api/hlshop/cart", cartRouter);
app.use("/api/hlshop/cities", cityRouter);
app.use("/api/hlshop/district", districtRouter);
app.use("/api/hlshop/order", orderRouter);
app.use("/api/hlshop/ward", wardRouter);
app.use("/api/hlshop/feeship", feeShipRouter);
app.use("/api/hlshop/subcribe", subcribeRouter);

//use method from file admin
app.use("/api/hlshop/admin/auth", adminAccountRouter);
app.use("/api/hlshop/admin/product-category", adminCategoryRouter);
app.use("/api/hlshop/admin/product", adminProductRouter);
app.use("/api/hlshop/admin/order", adminOrderRouter);
app.use("/api/hlshop/admin/users", adminUserRouter);
// app.get("/", function (request, response) {
//   response.send("Hello word, this is hlshop");
// });

const router = require("express").Router();
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger-output.json");

router.use("/api-docs", swaggerUi.serve);
router.get("/api-docs", swaggerUi.setup(swaggerDocument));

app.use("/", router);
app.listen(port, () => console.log(`Server is running on port ${port}`));

module.exports = app;
