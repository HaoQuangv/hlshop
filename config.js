const sql = require("mssql");

const config = {
  user: "hlshop", // Tên người dùng SQL Server trên Azure
  password: "group01@", // Mật khẩu SQL Server trên Azure
  server: "hlshop.database.windows.net", // Tên máy chủ SQL Server trên Azure
  database: "hlshopv1", // Tên cơ sở dữ liệu SQL Server trên Azure
  options: {
    encrypt: true, // Sử dụng mã hóa SSL (bắt buộc khi sử dụng Azure)
  },
};

// Tạo kết nối đến cơ sở dữ liệu SQL Server trên Azure
const pool = new sql.ConnectionPool(config);
const connection = pool
  .connect()
  .then(() => {
    console.log("Đã kết nối với cơ sở dữ liệu SQL Server trên Azure...");
  })
  .catch((err) => {
    console.error("Lỗi kết nối: " + err.stack);
  });

module.exports = pool;
