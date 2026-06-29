# 🏪 Shop Management System (Hệ thống Quản lý Bán hàng)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Electron Version](https://img.shields.io/badge/Electron-v35-47848f.svg)](https://electronjs.org/)
[![React Version](https://img.shields.io/badge/React-v18-61dafb.svg)](https://react.dev/)

**Shop Management System** là một phần mềm desktop quản lý bán hàng chuyên nghiệp, được thiết kế đặc biệt dành cho các mô hình kinh doanh bán lẻ, vật liệu xây dựng, nông sản hoặc tạp hóa. Hệ thống hoạt động hoàn toàn **offline**, đảm bảo tính bảo mật và tốc độ truy xuất dữ liệu tối ưu, đồng thời hỗ trợ đồng bộ hóa dữ liệu lên Google Drive để đảm bảo an toàn thông tin.

---

## 🌟 Các Tính năng Nổi bật

### 1. Quản lý Tổng quan (Dashboard)
- Hiển thị trực quan các chỉ số kinh doanh trong ngày: **Doanh thu, Lợi nhuận, Nợ mới, Số lượng hóa đơn**.
- Biểu đồ thống kê doanh thu và lợi nhuận trong 7 ngày gần nhất.
- Báo cáo chi tiết từng ngày trong quá khứ (Day Detail Report) tích hợp tra cứu hóa đơn trực tiếp.
- Thống kê danh sách khách hàng đang có công nợ cao nhất.

### 2. Quản lý Sản phẩm (Inventory Management)
- Thêm, sửa, xóa thông tin sản phẩm và phân loại theo danh mục.
- Cấu hình đa dạng mức giá: **Giá bán lẻ**, **Giá bán sỉ** và **Giá vốn** (để tính toán lợi nhuận chính xác).
- Lưu trữ và tra cứu lịch sử thay đổi giá của từng sản phẩm.

### 3. Quản lý Khách hàng & Công nợ (CRM & Debt Management)
- Lưu trữ thông tin chi tiết khách hàng (Tên, Số điện thoại, Địa chỉ, Mã số thuế).
- Theo dõi toàn bộ lịch sử mua hàng và lịch sử thanh toán của từng khách hàng.
- **Hệ thống công nợ thông minh:** Ghi nhận nợ tự động từ hóa đơn, hỗ trợ trả nợ nhiều lần (tiền mặt/chuyển khoản).
- Cho phép tạo hóa đơn nhanh trực tiếp từ trang hồ sơ khách hàng.

### 4. Quản lý Hóa đơn (Invoicing)
- Giao diện bán hàng (POS) trực quan, hỗ trợ tìm kiếm khách hàng và sản phẩm nhanh chóng.
- Tự động áp dụng giá bán sỉ/bán lẻ theo phân loại khách hàng.
- Hỗ trợ chiết khấu (theo phần trăm hoặc số tiền trực tiếp).
- **Xuất PDF & In ấn:** Tạo hóa đơn khổ A5 chuyên nghiệp với đầy đủ thông tin cửa hàng, chi tiết đơn hàng, và dư nợ hiện tại của khách.

### 5. Quản lý Dữ liệu & Lưu trữ Đám mây (Data & Cloud Sync)
- Dữ liệu được mã hóa và lưu trữ cục bộ qua SQLite, không yêu cầu kết nối Internet khi vận hành.
- **Google Drive Sync:** Tự động đồng bộ file cơ sở dữ liệu lên Google Drive theo chu kỳ (3 ngày/lần) hoặc sao lưu thủ công bằng một click.
- Hỗ trợ nhập (Restore) và xuất (Export) cơ sở dữ liệu để chuyển đổi thiết bị dễ dàng.

---

## ⚙️ Yêu cầu Hệ thống

- **Hệ điều hành:** Windows 10/11 (64-bit)
- **RAM:** Tối thiểu 1GB (Khuyến nghị 2GB)
- **Dung lượng ổ cứng:** Tối thiểu 200MB không gian trống
- Không yêu cầu cài đặt thêm các phần mềm cơ sở dữ liệu bên ngoài.

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy (Dành cho Lập trình viên)

### Yêu cầu môi trường
- [Node.js](https://nodejs.org/) v18.x hoặc mới hơn.
- npm v8.x hoặc mới hơn.

### Các bước cài đặt

```bash
# 1. Sao chép mã nguồn về máy
git clone https://github.com/Vinhphu159874123/store_managment.git
cd Shop_management

# 2. Cài đặt các thư viện phụ thuộc
npm install

# 3. Khởi chạy ứng dụng ở chế độ phát triển (Development)
npm run dev
```

Ứng dụng Electron sẽ tự động biên dịch và mở lên trong khoảng 5-10 giây.

---

## 📦 Hướng dẫn Đóng gói (Build) phần mềm

Để triển khai phần mềm cho người dùng cuối, bạn có thể tạo file cài đặt `.exe`:

```bash
npm run build:win
```

File cài đặt sẽ được tạo ra tại thư mục `dist/`. Người dùng chỉ cần chạy file `.exe` này để cài đặt phần mềm lên hệ thống Windows như một ứng dụng bình thường.

---

## 🗂️ Cấu trúc Mã nguồn (Project Structure)

Dự án được xây dựng dựa trên kiến trúc của Electron và Vite:

```text
Shop_management/
├── scripts/                   # Các kịch bản tiện ích (test, fix data...)
├── src/
│   ├── main/                  # Tiến trình chính của Electron (Main Process)
│   │   ├── database/          # Xử lý SQLite, tự động khởi tạo bảng (connection.ts)
│   │   ├── ipc/               # Lớp trung gian giao tiếp IPC (Customers, Invoices, Google Drive Backup...)
│   │   └── index.ts           # Điểm neo khởi động ứng dụng
│   ├── preload/               # Bridge bảo mật kết nối Main và Renderer (Context Isolation)
│   └── renderer/              # Giao diện người dùng (Renderer Process - React)
│       ├── src/
│       │   ├── assets/        # CSS, Fonts, Images
│       │   ├── components/    # Các UI Components dùng chung (Modal, Layout, PDF Template...)
│       │   ├── locales/       # File ngôn ngữ (i18n: vi.json, en.json)
│       │   ├── pages/         # Cấu trúc giao diện các trang (Dashboard, Invoices, Products...)
│       │   ├── stores/        # Quản lý trạng thái toàn cục (Zustand)
│       │   └── utils/         # Hàm định dạng dữ liệu (tiền tệ, ngày tháng)
├── electron-builder.yml       # Cấu hình đóng gói Electron Builder
├── electron.vite.config.ts    # Cấu hình Vite cho môi trường Electron
└── package.json               # Quản lý dependencies và scripts
```

---

## 🛠️ Ngăn xếp Công nghệ (Tech Stack)

| Hạng mục | Công nghệ sử dụng |
|---|---|
| **Core Framework** | [Electron](https://electronjs.org/) v35 |
| **Giao diện (UI)** | [React](https://react.dev/) v18, TypeScript, Vanilla CSS |
| **Công cụ Build** | [electron-vite](https://electron-vite.org/), Vite v6 |
| **Cơ sở dữ liệu** | [sql.js](https://sql.js.org/) (SQLite Runtime In-memory/File buffer) |
| **Quản lý State** | Zustand |
| **Đa ngôn ngữ** | react-i18next |
| **Hệ thống Routing**| React Router v7 |
| **Biểu tượng (Icon)** | Lucide React |
| **Kết xuất PDF** | @react-pdf/renderer |

---

## 💾 Lưu trữ Dữ liệu & Bảo mật

1. **Lưu trữ Cục bộ:** 
   Toàn bộ cơ sở dữ liệu được lưu dưới định dạng file SQLite tại đường dẫn an toàn của hệ điều hành:
   `C:\Users\<Tên_Người_Dùng>\AppData\Roaming\shop-management\shop-management.db`

2. **Cơ chế Sao lưu (Backup):**
   Người dùng có thể chủ động cấu hình sao lưu trong thẻ **Cài đặt**. Dữ liệu có thể được sao lưu trực tiếp vào thư mục an toàn của ứng dụng hoặc đồng bộ lên hệ thống **Google Drive**.

---

## 📄 Giấy phép (License)

Dự án được phân phối dưới giấy phép [MIT License](https://opensource.org/licenses/MIT). 
Bạn hoàn toàn có quyền sử dụng, sao chép, sửa đổi, hợp nhất, xuất bản, phân phối, cấp phép lại và bán các bản sao của phần mềm này.
