# Luồng nghiệp vụ

Mỗi bước ghi rõ **ai làm**, **API**, **điều kiện chặn ở Backend**.

## Luồng chính (thành công)

| # | Bước | Người làm | API | Điều kiện BE kiểm tra |
|---|---|---|---|---|
| 1 | Đặt lịch | Khách | `POST /api/appointments` (+ header `Idempotency-Key`) | Giờ ở tương lai; không phải ngày lễ; trong giờ làm việc; khung giờ chưa đầy (`max_slots`); xe chưa có lịch cùng khung giờ; xe thuộc khách; khách chưa có quá `max_active_appointments` (mặc định 3) lịch PENDING/CONFIRMED; giới hạn tần suất 3 lần/phút/tài khoản, 10 lần/phút/IP |
| 2 | Xác nhận lịch | Cố vấn | `POST /api/advisor/appointments/{id}/confirm` | Lịch đang PENDING |
| 3 | Khách đến – tiếp nhận | Cố vấn | `POST /api/advisor/appointments/{id}/check-in` | Lịch đang CONFIRMED |
| 4 | Lập phiếu sửa chữa | Cố vấn | `POST /api/repair-orders` (+ `Idempotency-Key`) | Nếu đi từ lịch hẹn: lịch phải CHECKED_IN, chưa có phiếu, khách/xe khớp lịch. Khách vãng lai (không lịch): xe thuộc khách và không có phiếu khác đang mở |
| 5 | Kiểm tra – chẩn đoán | Cố vấn nhập (chọn KTV thực hiện) | `POST /api/repair-orders/{id}/inspections`, `.../recommendations`, `.../inspections/complete` | Mỗi phiếu 1 biên bản kiểm tra; KTV (nếu tự gọi API) phải được giao phiếu; hoàn tất → QUOTING |
| 6 | Lập báo giá | Cố vấn | `POST /api/repair-orders/{id}/quotations` | Phiếu INSPECTING/QUOTING/WAITING_APPROVAL; giá lấy từ danh mục nếu không nhập; bản mới hủy bản DRAFT/SENT/REJECTED cũ; **không** thay bản đã duyệt |
| 7 | Gửi báo giá | Cố vấn | `POST /api/quotations/{id}/send` | Báo giá DRAFT → SENT; phiếu → WAITING_APPROVAL |
| 8 | Duyệt báo giá | Khách (hoặc cố vấn ghi hộ) | `POST /api/me/quotations/{id}/respond` / `POST /api/quotations/{id}/respond` | Báo giá SENT; hạng mục thuộc đúng báo giá; kết quả APPROVED / PARTIALLY_APPROVED / REJECTED |
| 9 | Bắt đầu sửa | Cố vấn | `POST /api/repair-orders/{id}/start-repair` | Có báo giá APPROVED/PARTIALLY_APPROVED; tạo hạng mục công việc chỉ cho phần được duyệt |
| 10 | Phân công & cập nhật hạng mục | Cố vấn | `PATCH /api/work-items/{id}/technician`, `PATCH /api/work-items/{id}/status` | Phiếu IN_PROGRESS/WAITING_FOR_PARTS; hạng mục chưa kết thúc; đổi người ghi lịch sử |
| 11 | Ghi phụ tùng thực dùng | Cố vấn | `POST /api/repair-orders/{id}/used-parts` | Phiếu IN_PROGRESS; phụ tùng có trong báo giá đã duyệt; đủ tồn kho → trừ kho + ghi giao dịch kho |
| 12 | (Tùy chọn) Chờ phụ tùng | Cố vấn | `POST .../waiting-for-parts`, `POST .../resume` | IN_PROGRESS ⇄ WAITING_FOR_PARTS |
| 13 | Kiểm tra chất lượng | Cố vấn | `POST /api/repair-orders/{id}/review` | Phiếu IN_PROGRESS, mọi hạng mục xong; FAILED bắt buộc ghi lỗi, hạng mục chọn sửa lại về PENDING |
| 14 | Hoàn thành phiếu | Cố vấn | `POST /api/repair-orders/{id}/complete` | Không còn hạng mục dở; QC gần nhất PASSED và sau lần hoàn tất hạng mục cuối |
| 15 | Lập hóa đơn | Cố vấn | `POST /api/repair-orders/{id}/invoice` | Phiếu COMPLETED; mỗi phiếu 1 hóa đơn |
| 16 | Thu tiền mặt | Cố vấn | `POST /api/invoices/{id}/payments` (+ `Idempotency-Key`) | Chỉ DIRECT; không vượt số còn nợ; hóa đơn chưa PAID; gửi lại cùng key không ghi 2 lần |
| 17 | Bàn giao xe | Cố vấn | `POST /api/repair-orders/{id}/hand-over` | Hóa đơn PAID; bắt buộc tên người nhận (có thể là người nhận hộ) |
| 18 | Đánh giá | Khách | `POST /api/me/reviews` | Phiếu của chính khách, đã HANDED_OVER; mỗi phiếu 1 đánh giá |

## Luồng rẽ nhánh
- **Khách hủy lịch**: `POST /api/appointments/{id}/cancel` khi PENDING/CONFIRMED.
- **Khách sửa lịch**: `PATCH /api/appointments/{id}` chỉ khi PENDING, kiểm tra lại khung giờ như đặt mới.
- **Không đến**: cố vấn `POST /api/advisor/appointments/{id}/no-show` khi CONFIRMED và đã quá giờ hẹn + `no_show_grace_minutes` (30 phút).
- **QC không đạt**: hạng mục chọn quay về PENDING → sửa lại → QC lần mới.
- **Báo giá lại**: khi khách từ chối hoặc cần sửa báo giá chưa duyệt → lập phiên bản mới, bản cũ CANCELLED.
- **Đóng phiếu sớm**: `POST /api/repair-orders/{id}/close` với lý do (CUSTOMER_REQUEST, PART_UNAVAILABLE, CUSTOMER_DECLINED_QUOTE, OTHER) + ghi chú; giải phóng phân công KTV.

## Sơ đồ tóm tắt
```
Khách đặt lịch ─► PENDING ─confirm─► CONFIRMED ─check-in─► CHECKED_IN ─► Phiếu RECEIVED
   │                 └─cancel─► CANCELLED      └─quá giờ+30'─► NO_SHOW
Phiếu: RECEIVED → INSPECTING → QUOTING → WAITING_APPROVAL → IN_PROGRESS ⇄ WAITING_FOR_PARTS
       → [QC PASSED] → COMPLETED → [Hóa đơn PAID] → HANDED_OVER → Đánh giá
       (mọi trạng thái trước COMPLETED có thể → CLOSED)
```
