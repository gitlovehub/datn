# CarService Backend

Backend được xây dựng bằng Laravel. Tài liệu này hướng dẫn cài đặt dự án và
sử dụng chức năng đăng nhập, xác thực và phân quyền API.

## Cài đặt

Tại thư mục `backend`, cài các gói phụ thuộc, tạo file môi trường nếu chưa có,
cấu hình kết nối cơ sở dữ liệu trong `.env`, sau đó chạy migration:

```bash
composer install
php artisan migrate
```

Ứng dụng không tạo tài khoản đăng nhập mặc định khi chạy seeder. Hãy tạo tài
khoản quản trị bằng một quy trình an toàn, ví dụ qua Tinker:

```bash
php artisan tinker
```

```php
\App\Models\Account::create([
    'email' => 'advisor@example.com',
    'password_hash' => \Illuminate\Support\Facades\Hash::make('thay-bang-mat-khau-manh'),
    'role' => \App\Models\Account::ROLE_ADVISOR,
    'status' => \App\Models\Account::STATUS_ACTIVE,
]);
```

Không sử dụng mật khẩu ví dụ này trong môi trường thật.

## Cấu hình frontend

Trong file `.env` của backend, thiết lập danh sách domain frontend được phép
dùng xác thực session và gửi yêu cầu có thông tin xác thực. Ví dụ với Vite
chạy tại `http://localhost:5173`:

```dotenv
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:5173,127.0.0.1,127.0.0.1:5173,127.0.0.1:8000,::1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Khi triển khai, thay các giá trị ví dụ bằng domain và cổng thực tế. Origin phải
khớp với địa chỉ frontend, bao gồm giao thức và cổng nếu có.

## API xác thực

| Phương thức | Endpoint | Chức năng | Xác thực |
| --- | --- | --- | --- |
| `POST` | `/api/register` | Đăng ký tài khoản khách hàng; giới hạn 5 lần mỗi phút | Không |
| `POST` | `/api/login` | Đăng nhập; giới hạn 5 lần mỗi phút | Không |
| `GET` | `/api/me` | Lấy thông tin tài khoản đang đăng nhập | Có |
| `POST` | `/api/logout` | Đăng xuất và thu hồi token hiện tại | Có |

Chỉ tài khoản có trạng thái `ACTIVE` mới đăng nhập được. Vai trò hợp lệ gồm
`CUSTOMER`, `ADVISOR`, `TECHNICIAN` và `ADMIN`.

### Dùng với ứng dụng SPA

Sanctum xác thực SPA cùng hệ thống bằng cookie session. Trước khi đăng nhập,
frontend cần:

1. Gửi `GET /sanctum/csrf-cookie`.
2. Gửi yêu cầu đăng nhập và các yêu cầu tiếp theo kèm cookie; với Axios, bật
   `withCredentials: true` và `withXSRFToken: true`.

Đăng nhập thành công bằng session trả về thông tin tài khoản và
`"token": null`. Khi đăng xuất, session hiện tại sẽ bị hủy.

### Dùng với ứng dụng di động hoặc Postman

Gửi email và mật khẩu đến `POST /api/login`. Có thể gửi thêm `device_name` để
đặt tên cho token:

```json
{
  "email": "advisor@example.com",
  "password": "mat-khau-cua-tai-khoan",
  "device_name": "postman"
}
```

Gửi token nhận được trong các yêu cầu cần đăng nhập bằng header:

```text
Authorization: Bearer <token>
```

Gọi `POST /api/logout` với token này để thu hồi token của thiết bị hiện tại.

## API danh mục dịch vụ và gói bảo dưỡng

Base URL khi chạy Laravel cục bộ thường là `http://127.0.0.1:8000`. Các endpoint
dành cho khách không yêu cầu đăng nhập; endpoint bắt đầu bằng
`/api/admin/` yêu cầu token Sanctum của tài khoản `ADMIN`.

### Dịch vụ

| Phương thức | Endpoint | Chức năng | Quyền |
| --- | --- | --- | --- |
| `GET` | `/api/services` | Danh sách dịch vụ đang `ACTIVE` | Công khai |
| `GET` | `/api/services/{id}` | Chi tiết dịch vụ đang `ACTIVE` | Công khai |
| `GET` | `/api/admin/services` | Danh sách quản trị, phân trang | `ADMIN` |
| `POST` | `/api/admin/services` | Thêm dịch vụ | `ADMIN` |
| `GET` | `/api/admin/services/{id}` | Chi tiết, kể cả dịch vụ `INACTIVE` | `ADMIN` |
| `PUT`, `PATCH` | `/api/admin/services/{id}` | Cập nhật dịch vụ | `ADMIN` |
| `DELETE` | `/api/admin/services/{id}` | Ẩn dịch vụ (`status = INACTIVE`) | `ADMIN` |

Danh sách công khai hỗ trợ `category` và `search`, ví dụ:
`GET /api/services?category=B%E1%BA%A3o+d%C6%B0%E1%BB%A1ng&search=d%E1%BA%A7u`.
Giá trị category `Tất cả` được xem như không lọc. API công khai không trả dịch
vụ đã ẩn; yêu cầu chi tiết dịch vụ đã ẩn trả về `404`.

Admin có thể lọc danh sách bằng `status`, `category`, `search` và `page`.
Danh sách admin trả dữ liệu phân trang trong `data.data`; các response quản trị
đều có dạng `{ "success": true, "message": "...", "data": ... }`.

Ví dụ body `POST /api/admin/services`:

```json
{
  "name": "Thay dầu động cơ",
  "category": "Bảo dưỡng",
  "description": "Thay dầu và kiểm tra động cơ.",
  "base_price": 500000,
  "estimated_minutes": 45,
  "status": "ACTIVE"
}
```

`name` là bắt buộc, tối đa 150 ký tự và không trùng; `base_price` là số không
âm; `estimated_minutes` nếu có phải là số nguyên dương. `category` và
`description` có thể bỏ trống. `status` chỉ nhận `ACTIVE` hoặc `INACTIVE` và
mặc định là `ACTIVE`.

Ví dụ dữ liệu dịch vụ trả về từ endpoint công khai:

```json
{
  "id": 1,
  "name": "Thay dầu động cơ",
  "category": "Bảo dưỡng",
  "description": "Thay dầu và kiểm tra động cơ.",
  "base_price": "500000.00",
  "estimated_minutes": 45,
  "status": "ACTIVE"
}
```

### Gói bảo dưỡng

| Phương thức | Endpoint | Chức năng | Quyền |
| --- | --- | --- | --- |
| `GET` | `/api/maintenance-packages` | Danh sách gói đang `ACTIVE` | Công khai |
| `GET` | `/api/maintenance-packages/{id}` | Chi tiết gói đang `ACTIVE` | Công khai |
| `GET` | `/api/admin/maintenance-packages` | Danh sách quản trị, phân trang | `ADMIN` |
| `POST` | `/api/admin/maintenance-packages` | Thêm gói và cấu phần tùy chọn | `ADMIN` |
| `GET` | `/api/admin/maintenance-packages/{id}` | Chi tiết gói | `ADMIN` |
| `PUT`, `PATCH` | `/api/admin/maintenance-packages/{id}` | Cập nhật gói/cấu phần | `ADMIN` |
| `DELETE` | `/api/admin/maintenance-packages/{id}` | Ẩn gói (`status = INACTIVE`) | `ADMIN` |
| `PUT` | `/api/admin/maintenance-packages/{id}/services` | Thay toàn bộ danh sách dịch vụ trong gói | `ADMIN` |
| `PUT` | `/api/admin/maintenance-packages/{id}/parts` | Thay toàn bộ danh sách phụ tùng trong gói | `ADMIN` |

`GET /api/maintenance-packages?model_id={vehicle_model_id}` trả về gói dùng
chung (`vehicle_model_id = null`) cùng các gói dành cho model xe được chỉ định.
Không truyền `model_id` để lấy tất cả gói đang hoạt động. Gói công khai trả về
các `services`, `parts` cùng `pivot.quantity`; các trường `price` và
`estimated_price` được tính từ giá dịch vụ/phụ tùng hiện tại nhân số lượng,
không được lưu thành giá cố định. `mileage_km` là tên tương thích với
`mileage_milestone`. Gói đã ẩn không xuất hiện trong API công khai và chi tiết
của gói đó trả về `404`.

Ví dụ body tạo gói. `vehicle_model_id` có thể là `null` để áp dụng chung;
`services` và `parts` là các mảng tùy chọn:

```json
{
  "vehicle_model_id": 1,
  "name": "Bảo dưỡng 10.000 km",
  "mileage_milestone": 10000,
  "month_milestone": 6,
  "description": "Bảo dưỡng định kỳ.",
  "services": [
    { "service_id": 1, "quantity": 1 },
    { "service_id": 2, "quantity": 1 }
  ],
  "parts": [
    { "part_id": 1, "quantity": 1 }
  ]
}
```

`name` là bắt buộc; model xe, dịch vụ và phụ tùng phải tồn tại. Các mốc km/tháng
nếu có và số lượng phải là số nguyên dương. Không được lặp lại cùng một ID dịch
vụ hoặc phụ tùng trong mảng. Khi cập nhật, chỉ các mảng được gửi mới bị thay
thế; gửi mảng rỗng để xóa hết cấu phần tương ứng. Hai endpoint `PUT .../services`
và `PUT .../parts` cũng thay toàn bộ danh sách nhận được; body lần lượt có dạng
`{"services":[{"service_id":1,"quantity":1}]}` và
`{"parts":[{"part_id":1,"quantity":1}]}`.

### Chạy thử bằng Postman

1. Khởi chạy backend bằng `php artisan serve` trong thư mục `backend`.
2. Tạo Environment với `base_url` là `http://127.0.0.1:8000` và
   `admin_token` là token Sanctum của tài khoản quản trị.
3. Gửi `GET {{base_url}}/api/services` và
   `GET {{base_url}}/api/maintenance-packages` để kiểm tra danh sách công khai.
   Gọi tiếp endpoint `/{id}` với ID lấy từ danh sách để kiểm tra chi tiết.
4. Tạo các request quản trị trong bảng endpoint ở trên. Thêm header
   `Authorization` với token Sanctum của admin (có thể cấu hình trong tab
   Authorization của Postman), cùng header `Accept: application/json`; request
   có body dùng `Content-Type: application/json`.
5. Kiểm tra các thao tác tạo, sửa và ẩn; sau `DELETE`, xác nhận bản ghi vẫn
   tồn tại với `status: INACTIVE` nhưng không còn trong API công khai. Gửi dữ
   liệu sai (ví dụ giá âm hoặc quantity bằng 0) để xác nhận API trả `422` cùng
   lỗi validation.

Response validation theo định dạng Laravel gồm `message` và `errors`; truy cập
không có token trả `401`, sai vai trò trả `403`, bản ghi không tồn tại hoặc đã
ẩn khỏi API công khai trả `404`.

## Phân quyền theo vai trò

Đặt `auth:sanctum` trên các route cần đăng nhập. Thêm middleware `role` để giới
hạn vai trò được phép truy cập:

```php
Route::middleware(['auth:sanctum', 'role:ADVISOR,ADMIN'])->group(function () {
    // Khai báo các route chỉ dành cho cố vấn và quản trị viên tại đây.
});
```

Các vai trò middleware hỗ trợ: `CUSTOMER`, `ADVISOR`, `TECHNICIAN`, `ADMIN`.
Nếu người dùng chưa đăng nhập, API trả về `401`; nếu tài khoản bị khóa hoặc
không có vai trò phù hợp, API trả về `403`.
