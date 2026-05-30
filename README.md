# 🎬 TCineBook — Hệ thống Đặt vé Xem phim

Monorepo chứa toàn bộ frontend (client + admin) và backend cho hệ thống đặt vé xem phim trực tuyến.

## 📁 Cấu trúc Dự án

```
Booking-Movie-Ticket/
├── frontend/
│   ├── client/          ← Vite App — Giao diện khách hàng (port 5173)
│   └── admin/           ← Vite App — Dashboard quản trị (port 5174)
├── backend/             ← Express API — REST API server (port 5000)
├── package.json         ← npm workspaces root
└── .env                 ← Biến môi trường chung
```

## 🚀 Bắt đầu

### Cài đặt dependencies (một lần duy nhất từ root)
```bash
npm install
```

### Chạy riêng từng ứng dụng
```bash
# Client — khách hàng
npm run dev:client        # → http://localhost:5173

# Admin — quản trị
npm run dev:admin         # → http://localhost:5174

# Backend — API server
npm run dev:backend       # → http://localhost:5000
```

### Build production
```bash
npm run build:client      # Build client → frontend/client/dist/
npm run build:admin       # Build admin  → frontend/admin/dist/
```

## 🛠 Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Client** | React 19, Vite 7, Tailwind CSS v4 |
| **Admin** | React 19, Vite 7, Tailwind CSS v4, ApexCharts |
| **Backend** | Express 4, Mongoose 8, JWT, bcryptjs |
| **Database** | MongoDB Atlas |

## 📦 npm Workspaces

Dự án sử dụng **npm workspaces** để quản lý dependencies:
- Dependencies chung (`react`, `vite`, `tailwindcss`...) chỉ cài **1 lần** tại root `node_modules/`
- Mỗi workspace có `package.json` riêng chỉ chứa dependencies đặc thù
- Chạy lệnh cho workspace cụ thể: `npm run <script> --workspace=<path>`
