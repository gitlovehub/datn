# CarService

**Website quản lý dịch vụ bảo dưỡng ô tô CarService**

CarService là hệ thống hỗ trợ quản lý quy trình đặt lịch, tiếp nhận xe, kiểm tra/chẩn đoán, lập báo giá, sửa chữa, quản lý phụ tùng, thanh toán và theo dõi lịch sử bảo dưỡng/sửa chữa ô tô.

---

## 1. Công nghệ sử dụng

### Frontend

- React
- TypeScript
- Vite
- npm

### Backend

- Laravel
- PHP
- Composer
- REST API

### Database

- MySQL

### Công cụ phát triển

- Visual Studio Code
- Git
- GitHub
- GitHub Desktop (không bắt buộc)
- Laragon (dành cho môi trường Backend trên Windows)

---

## 2. Cấu trúc dự án

```text
carservice/
│
├── frontend/           # Frontend React + TypeScript + Vite
├── backend/            # Backend Laravel
│
├── .gitattributes
├── .gitignore
└── README.md
```

Frontend và Backend được tách riêng.

- Thành viên Frontend có thể làm việc trong `frontend/`.
- Thành viên Backend có thể làm việc trong `backend/`.
- Không bắt buộc thành viên Frontend phải cài đặt môi trường Backend nếu chỉ phát triển giao diện.

---

# 3. Clone dự án

## Bước 1: Clone Repository

```bash
git clone <repository-url>
```

Sau đó:

```bash
cd carservice
```

## Bước 2: Chuyển sang branch develop

```bash
git checkout develop
```

## Bước 3: Cập nhật code mới nhất

```bash
git pull origin develop
```

---

# 4. Hướng dẫn chạy Frontend

> Phần này dành cho thành viên Frontend hoặc thành viên muốn chạy giao diện CarService.

## 4.1. Yêu cầu

Cần cài:

- Git
- Node.js
- npm

Kiểm tra Node.js:

```bash
node -v
```

Kiểm tra npm:

```bash
npm -v
```

> Thành viên chỉ làm Frontend KHÔNG bắt buộc cài Laragon, PHP, Composer hoặc MySQL.

---

## 4.2. Di chuyển vào Frontend

Từ thư mục gốc của dự án:

```bash
cd frontend
```

---

## 4.3. Cài đặt package

Lần đầu clone dự án về máy:

```bash
npm install
```

Lệnh này sẽ cài các package được khai báo trong `package.json`.

Thư mục `node_modules` sẽ được tạo tự động và không được commit lên GitHub.

---

## 4.4. Chạy Frontend

```bash
npm run dev
```

Vite sẽ hiển thị địa chỉ chạy Frontend.

Thông thường:

```text
http://localhost:5173
```

Mở địa chỉ trên bằng trình duyệt để sử dụng Frontend.

---

## 4.5. Dừng Frontend

Tại Terminal đang chạy Vite:

```text
Ctrl + C
```

---

# 5. Hướng dẫn chạy Backend

> Phần này dành cho thành viên Backend hoặc thành viên muốn chạy toàn bộ hệ thống CarService.

## 5.1. Yêu cầu

Cần cài:

- Git
- PHP
- Composer
- MySQL

Môi trường Backend hiện tại của nhóm trên Windows sử dụng:

- Laragon

Kiểm tra PHP:

```bash
php -v
```

Kiểm tra Composer:

```bash
composer -V
```

---

## 5.2. Khởi động môi trường Backend

Nếu sử dụng Laragon:

1. Mở Laragon.
2. Khởi động MySQL.
3. Đảm bảo PHP và MySQL hoạt động bình thường.

---

## 5.3. Di chuyển vào Backend

Từ thư mục gốc:

```bash
cd backend
```

---

## 5.4. Cài đặt package Laravel

Lần đầu clone dự án:

```bash
composer install
```

Lệnh này sẽ cài các dependency được khai báo trong `composer.json`.

Thư mục `vendor` được tạo tự động và không được commit lên GitHub.

---

## 5.5. Tạo file .env

File `.env` chứa cấu hình riêng của từng máy và KHÔNG được commit lên GitHub.

Tạo `.env` từ `.env.example`.

### Windows CMD

```bash
copy .env.example .env
```

Hoặc có thể copy thủ công:

```text
.env.example
```

thành:

```text
.env
```

---

## 5.6. Tạo Application Key

```bash
php artisan key:generate
```

---

# 6. Cấu hình Database

> Phần này dành cho Backend hoặc thành viên cần chạy toàn bộ hệ thống.

Database của dự án:

```text
carservice_db
```

## 6.1. Khởi động MySQL

Nhóm hiện sử dụng MySQL thông qua Laragon trên Windows.

Khởi động MySQL trước khi chạy Laravel.

---

## 6.2. Tạo Database

Tạo database:

```text
carservice_db
```

Có thể tạo bằng phpMyAdmin hoặc công cụ quản lý MySQL khác.

---

## 6.3. Cấu hình .env

Mở:

```text
backend/.env
```

Cấu hình Database:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=carservice_db
DB_USERNAME=root
DB_PASSWORD=
```

Cấu hình trên đang áp dụng cho môi trường Laragon mặc định của nhóm.

Nếu MySQL trên máy thành viên sử dụng username/password khác thì tự điều chỉnh `DB_USERNAME` và `DB_PASSWORD` cho phù hợp.

Không đưa thông tin đăng nhập Database cá nhân lên GitHub.

---

## 6.4. Chạy Migration

Trong thư mục `backend`:

```bash
php artisan migrate
```

Migration sẽ tạo các bảng cần thiết trong Database.

---

# 7. Chạy Backend Laravel

Trong thư mục:

```text
backend/
```

chạy:

```bash
php artisan serve
```

Thông thường Backend sẽ chạy tại:

```text
http://127.0.0.1:8000
```

---

## Dừng Backend

Tại Terminal đang chạy Laravel:

```text
Ctrl + C
```

---

# 8. Chạy toàn bộ hệ thống

Nếu muốn chạy cả Frontend và Backend trên cùng máy, cần mở ít nhất 2 Terminal.

## Terminal 1 - Backend

```bash
cd backend
php artisan serve
```

Backend:

```text
http://127.0.0.1:8000
```

## Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

Frontend thường chạy tại:

```text
http://localhost:5173
```

Sau đó truy cập Frontend bằng trình duyệt.

```text
Browser
   │
   ▼
React Frontend
   │
   │ REST API
   ▼
Laravel Backend
   │
   ▼
MySQL Database
```

---

# 9. Quy trình Git của nhóm

Nhóm sử dụng mô hình:

```text
main
  │
  └── develop
        │
        ├── feature/...
        ├── feature/...
        └── fix/...
```

## main

Dùng cho phiên bản ổn định của dự án.

Không code trực tiếp trên `main`.

---

## develop

Là branch tích hợp chính trong quá trình phát triển.

Các chức năng sau khi hoàn thành và được kiểm tra sẽ được Merge vào `develop`.

Thành viên không nên code chức năng trực tiếp trên `develop`.

---

## feature/*

Dùng để phát triển chức năng mới.

Ví dụ:

```text
feature/login
feature/customer-vehicle
feature/customer-appointment
feature/repair-order
feature/quotation
```

---

## fix/*

Dùng để sửa lỗi.

Ví dụ:

```text
fix/login-validation
fix/appointment-time
```

---

# 10. Quy trình làm một chức năng

## Bước 1: Về branch develop

```bash
git checkout develop
```

## Bước 2: Lấy code mới nhất

```bash
git pull origin develop
```

## Bước 3: Tạo branch mới

Ví dụ:

```bash
git checkout -b feature/customer-appointment
```

## Bước 4: Code chức năng

Chỉ sửa các file cần thiết cho chức năng đang thực hiện.

## Bước 5: Kiểm tra thay đổi

```bash
git status
```

## Bước 6: Add file

```bash
git add .
```

## Bước 7: Commit

```bash
git commit -m "feat: implement customer appointment"
```

## Bước 8: Push branch lên GitHub

```bash
git push origin feature/customer-appointment
```

## Bước 9: Tạo Pull Request

Trên GitHub tạo Pull Request:

```text
feature/customer-appointment
            ↓
         develop
```

Không Merge trực tiếp vào `main`.

Code cần được kiểm tra trước khi Merge vào `develop`.

---

# 11. Quy ước đặt tên Branch

Sử dụng chữ thường và dấu `-`.

### Chức năng mới

```text
feature/ten-chuc-nang
```

Ví dụ:

```text
feature/login
feature/customer-vehicle
feature/customer-appointment
feature/repair-order
```

### Sửa lỗi

```text
fix/ten-loi
```

Ví dụ:

```text
fix/login-validation
```

---

# 12. Quy ước Commit

Nhóm sử dụng các prefix sau:

| Prefix | Ý nghĩa |
|---|---|
| `feat` | Thêm chức năng mới |
| `fix` | Sửa lỗi |
| `docs` | Thay đổi tài liệu |
| `refactor` | Cấu trúc/cải tiến lại code |
| `test` | Thêm hoặc sửa kiểm thử |
| `chore` | Cấu hình hoặc công việc phụ |

Ví dụ:

```text
feat: add appointment booking
```

```text
fix: fix login validation
```

```text
docs: update project setup guide
```

```text
refactor: refactor appointment service
```

---

# 13. Quy tắc làm việc với Git

Trước khi bắt đầu chức năng mới:

```bash
git checkout develop
git pull origin develop
```

Sau đó mới tạo branch riêng.

Không:

- Code trực tiếp trên `main`.
- Tự ý Merge code chưa được kiểm tra.
- Commit file `.env`.
- Commit `node_modules`.
- Commit `vendor`.
- Commit password, API Key hoặc thông tin nhạy cảm.

Nếu có Conflict (xung đột code), không tự ý xóa code của thành viên khác khi chưa hiểu nguyên nhân.

---

# 14. Các file/thư mục không đưa lên GitHub

Không commit:

```text
frontend/node_modules/
frontend/dist/

backend/vendor/
backend/.env
```

Các file cấu hình mẫu như:

```text
backend/.env.example
```

được phép commit để thành viên khác biết cấu hình cần thiết.

---

# 15. Database và Migration

Database sử dụng:

```text
MySQL
```

Tên Database local:

```text
carservice_db
```

Khi cấu trúc Database chính thức được triển khai bằng Laravel Migration, thành viên cần cập nhật code mới nhất trước khi migrate:

```bash
git pull origin develop
```

Sau đó:

```bash
cd backend
php artisan migrate
```

Không tự ý thay đổi cấu trúc Database đã thống nhất mà không thông báo với nhóm.

---

# 16. Quy tắc phối hợp Frontend và Backend

Frontend và Backend được phát triển tách biệt nhưng phải tuân theo API đã thống nhất.

Luồng cơ bản:

```text
Frontend React
      │
      │ HTTP / REST API
      ▼
Backend Laravel
      │
      ▼
MySQL
```

Frontend không truy cập trực tiếp MySQL.

Mọi dữ liệu nghiệp vụ phải thông qua Backend/API.

Khi thay đổi:

- API endpoint
- Request
- Response
- Validation
- Tên field
- Cấu trúc dữ liệu

thành viên Backend cần thông báo cho thành viên Frontend liên quan.

---

# 17. Xử lý lỗi thường gặp

## Frontend thiếu package

```bash
cd frontend
npm install
```

---

## Backend thiếu package

```bash
cd backend
composer install
```

---

## Laravel chưa có APP_KEY

```bash
php artisan key:generate
```

---

## Database chưa có bảng

Kiểm tra MySQL đã chạy và `.env` đã đúng.

Sau đó:

```bash
php artisan migrate
```

---

## Code local chưa cập nhật

```bash
git checkout develop
git pull origin develop
```

---

# 18. Quy tắc chung của dự án

- Frontend sử dụng React + TypeScript + Vite.
- Backend sử dụng Laravel.
- Database sử dụng MySQL.
- Frontend không bắt buộc cài Laragon nếu chỉ phát triển giao diện.
- Backend của nhóm sử dụng Laragon trên Windows để hỗ trợ môi trường PHP/MySQL.
- Không commit `.env`.
- Không đưa mật khẩu/API Key lên GitHub.
- Mỗi chức năng nên có branch riêng.
- Code phải được kiểm tra trước khi Merge vào `develop`.
- Không tự ý thay đổi nghiệp vụ hoặc Database đã được nhóm thống nhất.

---

# 19. Thành viên

Dự án CarService được thực hiện bởi nhóm gồm **7 thành viên**.

Các thành viên phối hợp phát triển:

- Frontend
- Backend
- Database
- Testing
- Documentation

---

# 20. Ghi chú

README này được sử dụng làm hướng dẫn chung để thành viên có thể:

1. Clone dự án.
2. Cài đặt môi trường phù hợp với vai trò.
3. Chạy Frontend.
4. Chạy Backend.
5. Kết nối Database.
6. Làm việc đúng quy trình Git của nhóm.

Khi cấu hình hoặc quy trình của dự án thay đổi, README cần được cập nhật tương ứng.