# 🏪 Quản lý bán hàng - Cửa hàng Thi

Phần mềm desktop quản lý bán hàng, hóa đơn và công nợ cho cửa hàng vật liệu xây dựng / nông sản. Chạy hoàn toàn **offline** trên máy tính, không cần internet.

---

## ✨ Tính năng

| Module | Chức năng |
|---|---|
| **Tổng quan** | Doanh thu hôm nay, số hóa đơn, tổng nợ, biểu đồ 7 ngày, khách nợ nhiều nhất |
| **Sản phẩm** | Thêm/sửa/xóa sản phẩm, phân loại danh mục, giá bán lẻ / bán sỉ / giá vốn, lịch sử thay đổi giá |
| **Khách hàng** | Quản lý khách hàng, xem lịch sử mua hàng, lịch sử thanh toán, tổng công nợ |
| **Hóa đơn** | Tạo hóa đơn nhanh, chọn khách hàng, thêm sản phẩm, tính giảm giá, ghi nhận thanh toán |
| **Công nợ** | Theo dõi nợ theo từng hóa đơn, ghi nhận thanh toán bổ sung (tiền mặt / chuyển khoản) |
| **Xuất PDF** | In hóa đơn A5 có đầy đủ thông tin cửa hàng, sản phẩm, tổng tiền, nợ còn lại |
| **Cài đặt** | Thông tin cửa hàng, ngôn ngữ (VI/EN), sao lưu và phục hồi dữ liệu |

---

## 🖥️ Yêu cầu hệ thống

- Windows 10/11 (64-bit)
- RAM: tối thiểu 512MB
- Dung lượng: khoảng 150MB

---

## 🚀 Cài đặt & Chạy thử (Development)

### Yêu cầu

- [Node.js](https://nodejs.org/) v18 trở lên
- npm v8 trở lên

### Các bước

```bash
# 1. Clone hoặc tải về source code
cd Shop_management

# 2. Cài đặt dependencies
npm install

# 3. Chạy ở chế độ phát triển
npm run dev
```

Ứng dụng Electron sẽ tự mở sau khi build xong (~5–10 giây lần đầu).

---

## 📦 Build file cài đặt (.exe)

```bash
# Build file cài đặt Windows
npm run build:win
```

File `.exe` sẽ được tạo trong thư mục `dist/`. Chạy file đó để cài đặt phần mềm như bình thường.

---

## 🗂️ Cấu trúc thư mục

```
Shop_management/
├── src/
│   ├── main/                  # Electron Main Process
│   │   ├── database/
│   │   │   └── connection.ts  # SQLite (sql.js), tạo bảng, query helpers
│   │   └── ipc/               # IPC handlers (products, customers, invoices...)
│   ├── preload/
│   │   └── index.ts           # Bridge API giữa Main và Renderer
│   └── renderer/
│       └── src/
│           ├── pages/         # Các trang: Dashboard, Products, Customers, Invoices...
│           ├── components/    # Layout, UI components, PDF template
│           ├── stores/        # Zustand state (toast notifications)
│           ├── utils/         # Format tiền, ngày tháng
│           └── locales/       # Ngôn ngữ VI / EN
├── electron.vite.config.ts    # Cấu hình build Electron + Vite
├── electron-builder.yml       # Cấu hình đóng gói .exe
└── package.json
```

---

## 🛠️ Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Desktop framework | [Electron](https://electronjs.org/) v35 |
| UI framework | [React](https://react.dev/) v18 + TypeScript |
| Build tool | [electron-vite](https://electron-vite.org/) + Vite v6 |
| Database | [sql.js](https://sql.js.org/) (SQLite chạy trong Node, không cần cài thêm) |
| Routing | React Router v7 |
| Icons | [Lucide React](https://lucide.dev/) |
| PDF | [@react-pdf/renderer](https://react-pdf.org/) |
| i18n | react-i18next (Tiếng Việt / English) |
| State | Zustand |
| Styling | Vanilla CSS (Light theme) |

---

## 💾 Dữ liệu được lưu ở đâu?

Dữ liệu lưu trong file SQLite tại:

```
C:\Users\<Tên máy>\AppData\Roaming\shop-management\shop-management.db
```

---

## 🔒 Sao lưu & Phục hồi

Vào **Cài đặt → Sao lưu dữ liệu**:

- **Tạo bản sao lưu**: copy file `.db` vào thư mục `backups/` với timestamp
- **Phục hồi**: chọn file `.db` đã sao lưu để khôi phục

> ⚠️ Sau khi phục hồi, khởi động lại ứng dụng để áp dụng.

---

## 📄 Format hóa đơn

Số hóa đơn theo định dạng: `HD-YYYYMMDD-XXXX`

Ví dụ: `HD-20260626-0001`

---

## 📝 License

MIT — Sử dụng tự do cho mục đích cá nhân và thương mại.
