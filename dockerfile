# Sử dụng một hình ảnh Node.js chứa phiên bản bạn muốn
FROM node:18-alpine

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép package.json và package-lock.json vào thư mục làm việc
COPY package*.json ./

# Cài đặt các phụ thuộc
RUN npm install --force

# Sao chép tất cả các tệp từ thư mục nguồn vào thư mục làm việc
COPY . .
# Chạy ứng dụng trên port 80
CMD ["node", "index.js"]
EXPOSE 80
