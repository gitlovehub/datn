# Thiết kế cơ sở dữ liệu

Nguồn chuẩn của schema là **migration** trong `backend/database/migrations` (47 file). File `Database.sql` ở gốc repo là bản tham khảo cũ, chưa có các bảng/cột mới (xem [KNOWN_LIMITATIONS](KNOWN_LIMITATIONS.md)).

## 1. Nhóm bảng
| Nhóm | Bảng |
|---|---|
| Tài khoản & nhân sự | `accounts` (role: CUSTOMER/ADVISOR/ADMIN/TECHNICIAN, status), `employees`, `technician_profiles`, `technician_schedules`, `personal_access_tokens`, `email_verification_otps`, `password_reset_otps` |
| Khách & xe | `customers` (soft delete), `vehicles` (soft delete), `vehicle_brands`, `vehicle_models` |
| Danh mục | `services`, `parts`, `part_compatibilities`, `maintenance_packages`, `maintenance_package_services`, `maintenance_package_parts`, `inventories`, `inventory_transactions` |
| Lịch làm việc | `working_hours` (day_of_week unique, start/end, `max_slots`, is_active), `holidays` |
| Lịch hẹn | `appointments`, `appointment_services`, `appointment_packages` |
| Sửa chữa | `repair_orders`, `repair_order_status_history`, `assignments`, `inspections`, `inspection_items`, `inspection_recommendations`, `quotations`, `quotation_items`, `work_items`, `used_parts`, `quality_checks` |
| Tài chính | `invoices`, `invoice_items`, `payments` |
| Khác | `reviews`, `notifications` (có bảng, chưa dùng), `cache`, `jobs` |

## 2. Quan hệ chính
```
accounts 1─1 customers 1─n vehicles
accounts 1─1 employees 1─1 technician_profiles
customers 1─n appointments n─1 vehicles
appointments 1─0..1 repair_orders (appointment_id UNIQUE)
repair_orders 1─n status_history | assignments | inspections | quotations | work_items | used_parts | quality_checks
repair_orders 1─0..1 invoices (repair_order_id UNIQUE) 1─n payments
repair_orders 1─0..1 reviews (repair_order_id UNIQUE)
quotations 1─n quotation_items ; work_items n─1 services, n─1 technician_profiles (người thực hiện)
inspections n─1 technician_profiles (KTV thực hiện, nullable) ; n─1 employees (recorded_by_employee_id: người nhập)
```

## 3. Ràng buộc bảo vệ dữ liệu
| Ràng buộc | Mục đích |
|---|---|
| `repair_orders.appointment_id` UNIQUE | Một lịch hẹn chỉ sinh một phiếu |
| `invoices.repair_order_id` UNIQUE | Một phiếu một hóa đơn |
| `reviews.repair_order_id` UNIQUE | Một phiếu một đánh giá |
| `appointments.appointment_code`, `repair_orders.repair_order_code`, `invoices.invoice_code` UNIQUE | Mã chứng từ không trùng |
| `working_hours.day_of_week` UNIQUE | Mỗi thứ một cấu hình |
| Index `idx_appointments_datetime`, `idx_appointments_status`, `idx_repair_orders_status`, `idx_payments_invoice_status`, `quality_checks(repair_order_id, checked_at)` | Truy vấn đếm suất, lọc trạng thái, dashboard |
| Khóa ngoại trên mọi quan hệ | Không có bản ghi mồ côi |
| Soft delete `customers`, `vehicles` | Giữ lịch sử phiếu cũ khi xóa |

## 4. Cột bổ sung trên nhánh demo_v2
| Migration | Thay đổi |
|---|---|
| `2026_11_02_134250_allow_advisor_to_record_inspections` | `inspections.technician_id` nullable; thêm `inspections.recorded_by_employee_id` (FK employees) — tách **KTV thực hiện** và **người nhập** |
| `2026_11_03_135032_add_quality_checks_and_handover_details` | Bảng `quality_checks(id, repair_order_id, checked_by_employee_id, result PASSED/FAILED, note, checked_at)`; `repair_orders.handed_over_to_name`, `handed_over_to_phone`, `handover_note` (biên bản bàn giao) |

Cả hai migration chỉ **thêm** cột/bảng, không xóa dữ liệu. Áp dụng bằng `php artisan migrate`.

## 5. Tính toàn vẹn khi ghi đồng thời
- Đặt lịch: transaction + `lockForUpdate` trên dòng `working_hours` của ngày và dòng `customers` → hai request cùng lúc không vượt `max_slots` hay giới hạn lịch đang hoạt động.
- Lập phiếu từ lịch: khóa dòng lịch + UNIQUE `appointment_id`.
- Thu tiền: transaction khóa hóa đơn, kiểm tra số còn nợ trước khi ghi.
- Xuất kho: transaction + `lockForUpdate` dòng tồn kho, kiểm tra tồn rồi trừ, ghi `inventory_transactions`.
- Lập phiếu: khóa dòng xe để một xe không có hai phiếu mở.
