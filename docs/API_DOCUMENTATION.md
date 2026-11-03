# Tài liệu API

- Base URL: `/api`. Định dạng JSON. Gửi `Accept: application/json`.
- Xác thực: `Authorization: Bearer <token>` (lấy từ `POST /api/login`). Thiếu/sai token → `401`.
- Sai vai trò → `403`. Dữ liệu không hợp lệ → `422` `{ message, errors }`. Chuyển trạng thái sai → `422` `{ message }`.
- Quá tần suất → `429`. Trùng `Idempotency-Key` đang xử lý → `409`.
- Danh sách đầy đủ 95 route: `php artisan route:list --path=api`.

## Header chống gửi trùng (Idempotency-Key)
Áp dụng: `POST /appointments`, `POST /repair-orders`, `POST /invoices/{id}/payments`.
- Giá trị: 8–100 ký tự `[A-Za-z0-9_-]`, FE sinh bằng `newIdempotencyKey()`, **giữ nguyên khi bấm lại** sau lỗi mạng.
- Cùng tài khoản + cùng method/path + cùng key trong 24 giờ (`carservice.idempotency_ttl_hours`) → trả lại đúng response cũ, header `Idempotent-Replayed: true`, không ghi thêm.
- Chỉ lưu response 2xx; key từ tài khoản khác không bị dùng chung.

## 1. Xác thực (công khai)
| Method | Path | Body chính | Ghi chú |
|---|---|---|---|
| POST | `/register` | full_name, email, phone, password, accept_terms | Gửi OTP email, chưa cấp token |
| POST | `/verify-email-otp` | email, otp | Kích hoạt, cấp token |
| POST | `/resend-email-otp` | email | |
| POST | `/login` | email, password | Trả `token`, `user` |
| POST | `/forgot-password`, `/reset-password` | email / email, otp, password | |
| GET/PATCH/POST | `/me`, `/me/profile`, `/me/change-password`, `/logout` | | Cần token |

## 2. Khách hàng (role CUSTOMER)
| Method | Path | Mô tả |
|---|---|---|
| GET/POST | `/me/vehicles` | Xe của tôi |
| GET/PATCH/DELETE | `/me/vehicles/{id}` | DELETE trả `422` nếu xe có lịch PENDING/CONFIRMED hoặc phiếu chưa bàn giao/đóng |
| GET/PATCH | `/me/customer` | Hồ sơ khách |
| GET | `/appointments` | Lịch của tôi (lọc `status`) |
| POST | `/appointments` | Đặt lịch. Body: `appointment_date`, `appointment_time` (HH:mm), `request_type`, `vehicle_id` **hoặc** `new_vehicle{brand, model, vehicle_type, license_plate?}`, `service_ids[]?`, `package_ids[]?`, `symptom_description?`, `note?`. Middleware `throttle:booking`, `idempotent` |
| GET/PATCH | `/appointments/{id}` | Sửa khi PENDING |
| POST | `/appointments/{id}/cancel` | Hủy khi PENDING/CONFIRMED |
| GET | `/me/repair-orders`, `/me/repair-orders/{id}`, `/me/repair-orders/{id}/invoice` | Tiến độ, báo giá, hóa đơn của tôi |
| POST | `/me/quotations/{id}/respond` | Body `responses: [{item_id, is_approved}]` (item thuộc đúng báo giá) |
| GET/POST | `/me/reviews` | Body `repair_order_id, overall_rating(1-5), advisor_rating?, technician_rating?, comment?` |

## 3. Cố vấn + Admin
| Method | Path | Mô tả |
|---|---|---|
| GET | `/advisor/appointments` | Lọc `status`, `date`, `search`, `page`, `per_page` |
| GET | `/advisor/appointments/{id}` | |
| POST | `/advisor/appointments/{id}/confirm` · `/check-in` · `/cancel` · `/no-show` | Xem [STATE_TRANSITIONS](STATE_TRANSITIONS.md) |
| GET | `/dashboard/summary?days=30` | Số liệu tổng hợp (mục 6) |
| GET/POST/GET/PATCH | `/customers`, `/customers/{id}` | |
| CRUD | `/vehicles`, `GET /customers/{id}/vehicles` | |

## 4. Cố vấn (một số API KTV cũng gọi được trên phiếu được giao)
| Method | Path | Body / Ghi chú |
|---|---|---|
| GET | `/repair-orders?status=` | Phân trang 20 |
| GET | `/repair-orders/{id}` | Kèm lịch sử, kiểm tra, báo giá, hạng mục, phụ tùng, hóa đơn, QC |
| POST | `/repair-orders` | `appointment_id?`, `customer_id`, `vehicle_id`, `mileage_received?`, `initial_condition?`, `note?`. `idempotent` |
| GET | `/technicians` | KTV đang làm việc (nhân viên ACTIVE) kèm `active_assignments_count` |
| POST | `/repair-orders/{id}/assign-technician` | `technician_id`, `note?` |
| POST | `/repair-orders/{id}/inspections` | `condition_description`, `diagnosis`, `items[{item_name, status PASSED/WARNING/FAILED, condition_description?, note?}]` (hoặc `inspection_items`), `recommendations[]?`, `technician_id?` (KTV thực hiện) |
| POST | `/repair-orders/{id}/inspections/recommendations` | `item_type SERVICE/PART`, `service_id`/`part_id`, `quantity`, `note` |
| POST | `/repair-orders/{id}/inspections/complete` | → QUOTING |
| GET | `/parts` | Phụ tùng ACTIVE kèm tồn kho |
| POST | `/repair-orders/{id}/quotations` | `items[{item_type, service_id/part_id, quantity, unit_price?, description?}]`, `discount_amount?`, `valid_until?` |
| POST | `/quotations/{id}/send` · `/quotations/{id}/respond` | |
| POST | `/repair-orders/{id}/start-repair` | |
| PATCH | `/work-items/{id}/status` | `status` PENDING/IN_PROGRESS/COMPLETED/CANCELLED |
| PATCH | `/work-items/{id}/technician` | `technician_id`, `reason?` |
| POST | `/repair-orders/{id}/used-parts` | `part_id`, `quantity`, `work_item_id?`, `unit_price?` |
| POST | `/repair-orders/{id}/waiting-for-parts` · `/resume` | `note?` |
| POST | `/repair-orders/{id}/review` | `result PASSED/FAILED`, `note` (bắt buộc khi FAILED), `rework_item_ids[]` — trả `201` |
| POST | `/repair-orders/{id}/complete` | `note?` |
| POST | `/repair-orders/{id}/close` | `close_reason`, `note` |
| GET/POST | `/repair-orders/{id}/invoice` | Lập hóa đơn từ hạng mục đã duyệt + phụ tùng thực dùng |
| POST | `/invoices/{id}/payments` | `amount`, `payment_method?` (chỉ `DIRECT`). `idempotent` |
| POST | `/repair-orders/{id}/hand-over` | `receiver_name` (bắt buộc), `receiver_phone?`, `note?` |

## 5. Admin
| Method | Path | Mô tả |
|---|---|---|
| CRUD | `/admin/services` | DELETE = chuyển INACTIVE |
| CRUD | `/admin/maintenance-packages` + `PUT .../services`, `PUT .../parts` | Giá gói tính từ dịch vụ + phụ tùng |
| GET/PUT | `/admin/working-hours`, `/admin/working-hours/{id}` | Giờ mở/đóng, `max_slots` |
| DELETE | `/customers/{id}` | Xóa mềm |

## 6. `GET /dashboard/summary`
```json
{
  "period_days": 30,
  "appointments": { "today": 2, "today_checked_in": 2, "today_waiting_arrival": 0, "pending": 0, "today_capacity": 5 },
  "repair_orders": { "in_garage": 0, "waiting_diagnosis": 0, "waiting_quotation": 0, "waiting_approval": 0,
                     "in_progress": 0, "waiting_parts": 0, "waiting_payment": 0, "ready_for_pickup": 0 },
  "period": { "appointments": 4, "cancel_rate": 0, "no_show_rate": 0, "revenue": 1800000, "handed_over": 2 },
  "inventory": { "low_stock": 1 },
  "recent_orders": [{ "id": 2, "repair_order_code": "RO-…", "status": "HANDED_OVER", "customer": {…}, "vehicle": {…} }],
  "definitions": { "period.revenue": "Tổng tiền các khoản thanh toán SUCCESS có thời điểm thu trong kỳ.", "…": "…" }
}
```
Mọi số được truy vấn trực tiếp từ DB tại thời điểm gọi; `definitions` ghi cách tính từng chỉ số.

## 7. Công khai khác
`GET /services`, `/services/{id}`, `/maintenance-packages`, `/maintenance-packages/{id}`, `/working-hours`; `POST /chatbot` (giới hạn 20 lần/phút).
