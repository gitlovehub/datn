# Tổng quan hệ thống CarService (WD_004)

> Tài liệu mô tả **đúng trạng thái code trên nhánh `demo_v2`** (cập nhật 03/11/2026). Phần chưa làm được liệt kê trong [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md).

## 1. Mục tiêu
Phần mềm quản lý gara ô tô: khách đặt lịch online → cố vấn dịch vụ tiếp nhận xe, kiểm tra, báo giá → khách duyệt → sửa chữa → nghiệm thu (QC) → hóa đơn, thu tiền mặt → bàn giao xe → khách đánh giá.

## 2. Kiến trúc
| Lớp | Công nghệ | Thư mục |
|---|---|---|
| Frontend (SPA) | React 19 + TypeScript, Vite, Tailwind CSS v4, React Router | `frontend/` |
| Backend (REST API) | Laravel 13 (PHP 8.5), Laravel Sanctum (Bearer token) | `backend/` |
| CSDL | MySQL (production), SQLite (test) — schema bằng migration | `backend/database/migrations` |
| Kiểm thử | PHPUnit feature/unit test; script Node kiểm tra FE | `backend/tests`, `frontend/tests` |

- FE gọi API qua `frontend/src/services/api.ts` (`fetchApi`), gắn header `Authorization: Bearer <token>`.
- Mọi quy tắc nghiệp vụ nằm ở Backend (`app/Services/RepairOrderService.php`, các Controller). FE chỉ ẩn/hiện nút cho dễ dùng; **request trái quyền bị chặn ở BE** bằng middleware `role:` (`App\Http\Middleware\EnsureRole`) và kiểm tra quyền sở hữu dữ liệu.
- Lỗi chuyển trạng thái sai trả `422` JSON (`InvalidStatusTransitionException`).

## 3. Vai trò
| Vai trò | Có giao diện | Ghi chú |
|---|---|---|
| Khách hàng (CUSTOMER) | Có | Đặt lịch, quản lý xe, xem tiến độ, duyệt báo giá, xem hóa đơn, đánh giá |
| Cố vấn dịch vụ (ADVISOR) | Có | Điều phối toàn bộ luồng sửa chữa; nhập hộ kết quả kiểm tra và ghi nhận KTV thực hiện |
| Quản trị (ADMIN) | Có | Danh mục dịch vụ, gói bảo dưỡng, giờ làm việc, lịch hẹn, khách hàng, bảng điều hành |
| Kỹ thuật viên (TECHNICIAN) | **Không** (đã bỏ màn hình trên `demo_v2`) | Vẫn có hồ sơ để cố vấn chọn "người thực hiện"; không bắt buộc đăng nhập |

## 4. Các module chính
1. Xác thực: đăng ký + OTP email, đăng nhập, quên mật khẩu, hồ sơ, đổi mật khẩu.
2. Lịch hẹn: đặt / sửa / hủy (khách), xác nhận / tiếp nhận / hủy / đánh dấu không đến (cố vấn).
3. Phiếu sửa chữa (Repair Order): máy trạng thái 9 trạng thái, lịch sử trạng thái.
4. Kiểm tra – chẩn đoán, đề xuất dịch vụ/phụ tùng.
5. Báo giá có phiên bản; khách duyệt từng hạng mục.
6. Hạng mục công việc, phân công KTV theo hạng mục, xuất kho phụ tùng thực dùng.
7. Kiểm tra chất lượng (QC) bắt buộc trước khi hoàn thành.
8. Hóa đơn, thanh toán tiền mặt (DIRECT), biên bản bàn giao.
9. Đánh giá dịch vụ.
10. Bảng điều hành số liệu thật (`GET /api/dashboard/summary`).
11. Quản trị danh mục: dịch vụ, gói bảo dưỡng, giờ làm việc.

## 5. Chạy dự án
```bash
cd backend && composer install && php artisan migrate && php artisan db:seed && php artisan serve
cd frontend && npm install && npm run dev
```
Không chạy `migrate:fresh` trên dữ liệu thật. Tham số cấu hình nghiệp vụ: `backend/config/carservice.php` (đọc từ `.env`, có mặc định).

## 6. Tài liệu liên quan
[BUSINESS_FLOW](BUSINESS_FLOW.md) · [ROLE_PERMISSION_MATRIX](ROLE_PERMISSION_MATRIX.md) · [STATE_TRANSITIONS](STATE_TRANSITIONS.md) · [DATABASE_DESIGN](DATABASE_DESIGN.md) · [API_DOCUMENTATION](API_DOCUMENTATION.md) · [EDGE_CASES](EDGE_CASES.md) · [TEST_REPORT](TEST_REPORT.md) · [DEFENSE_QA](DEFENSE_QA.md) · [CHANGELOG_IMPLEMENTATION](CHANGELOG_IMPLEMENTATION.md) · [KNOWN_LIMITATIONS](KNOWN_LIMITATIONS.md) · [GAP_ANALYSIS](GAP_ANALYSIS.md)
