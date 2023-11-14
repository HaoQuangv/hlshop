const express = require("express");
const router = express.Router();

const database = require("../../config");
const checkAuth = require("../../middleware/check_auth");
const checkRole = require("../../middleware/check_role_user");

router.post("/create", checkAuth, checkRole, async (request, response) => {
  try {
    // request.body
    //{
    //    "receiverAddressID":"string",
    //    "paymentMethod":0,
    //    "carts":[
    //       {
    //          "cartID":"String",
    //          "cartID":"String",
    //       }
    //    ]
    // }

    const { receiverAddressID, paymentMethod, carts } = request.body;
    // Kiểm tra dữ liệu đầu vào

    //kiểm tra receiverAddressID co tồn tại không

    //kiểm tra paymentMethod có tồn tại không   0: COD, 1: Momo

    //kiem tra carts co ton tai khong

    //neu k co loi gi thi tao order

    //tao order

    //xoa cart

    response.status(200).json({
      status: 200,
      message: "Create Order Success",
      result: {
        orderIDs: "[774aa65d-2bcd-4481-b2df-fb7e787eb790]",
      },
    });
  } catch (error) {
    // Xử lý lỗi cụ thể
    if (error.code === "EREQUEST") {
      return response.status(500).json({
        error: "",
      });
    }

    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-list", checkAuth, checkRole, async (request, response) => {
  try {
    response.status(200).json();
  } catch (error) {
    // Xử lý lỗi cụ thể
    if (error.code === "EREQUEST") {
      return response.status(500).json({
        error: "",
      });
    }

    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/get-detail", checkAuth, checkRole, async (request, response) => {
  try {
    response.status(200).json();
  } catch (error) {
    // Xử lý lỗi cụ thể
    if (error.code === "EREQUEST") {
      return response.status(500).json({
        error: "",
      });
    }

    response.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get(
  "/get-order-status-tracking",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      response.status(200).json();
    } catch (error) {
      // Xử lý lỗi cụ thể
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          error: "",
        });
      }

      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.get(
  "/get-count-list",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      response.status(200).json();
    } catch (error) {
      // Xử lý lỗi cụ thể
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          error: "",
        });
      }

      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

router.post(
  "/test-update-order-status",
  checkAuth,
  checkRole,
  async (request, response) => {
    try {
      response.status(200).json();
    } catch (error) {
      // Xử lý lỗi cụ thể
      if (error.code === "EREQUEST") {
        return response.status(500).json({
          error: "",
        });
      }

      response.status(500).json({
        error: "Internal Server Error",
      });
    }
  }
);

module.exports = router;
