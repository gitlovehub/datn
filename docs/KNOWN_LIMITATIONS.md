# Hạn chế đã biết (chưa triển khai)

Liệt kê trung thực những gì **chưa có** trên `demo_v2`, để không trình bày như đã làm.

## 1. Chức năng chưa có
| # | Hạn chế | Ảnh hưởng | Hướng làm tiếp |
|---|---|---|---|
| L1 | **Admin: Tài khoản / Nhân sự, Kho phụ tùng, Báo cáo** là màn hình FE dùng dữ liệu mẫu trong mã (`initialAccounts`, `initialParts`), **chưa có API** | Thao tác trên các trang này không lưu DB | Viết API CRUD tài khoản/nhân viên, nhập kho, báo cáo theo kỳ |
| L2 | Không quản lý tài nguyên gara (cầu nâng, khoang, chỗ đỗ) | Sức chứa chỉ tính theo `max_slots` mỗi khung giờ | Bảng `bays`, gán phiếu vào khoang |
| L3 | Kho: chưa có giữ chỗ phụ tùng khi duyệt báo giá, chưa có nhập kho/trả hàng qua API | Tồn kho chỉ giảm khi ghi phụ tùng thực dùng | Giao dịch RESERVE/RELEASE, phiếu nhập |
| L4 | Chưa có hoàn tiền / hủy thanh toán | Thu sai phải xử lý ngoài hệ thống | Payment REFUND có lý do, người duyệt |
| L5 | Chưa có báo giá phát sinh khi đang sửa (phát hiện lỗi mới giữa chừng) | Phải đóng phiếu hoặc xử lý ngoài; báo giá đã duyệt không được lập đè | Báo giá bổ sung gắn phiếu IN_PROGRESS |
| L6 | Chưa có nhật ký kiểm toán chung (đăng nhập, sửa danh mục, sửa khách) | Chỉ phiếu sửa chữa có lịch sử trạng thái | Bảng `audit_logs` |
| L7 | Chưa gửi thông báo (email/SMS/push) khi đổi trạng thái; bảng `notifications` có nhưng chưa dùng | Khách phải tự mở web xem tiến độ | Queue job gửi email |
| L8 | Thanh toán QR/VNPay chưa mở (API chỉ nhận DIRECT) — đúng phạm vi đã thống nhất "tiền mặt xác nhận" | — | Tích hợp cổng thanh toán |
| L9 | Không có màn hình KTV (đã bỏ có chủ đích); KTV chỉ là "người thực hiện" do cố vấn ghi | KTV không tự cập nhật tiến độ | Có thể mở lại khu vực KTV, API đã sẵn phân quyền |
| L10 | Admin không xem/thao tác phiếu sửa chữa chi tiết (chỉ thấy số liệu + 5 phiếu gần nhất) | — | Mở `GET /repair-orders` cho ADMIN chỉ đọc |
| L11 | Lịch NO_SHOW đánh dấu thủ công, chưa có tác vụ tự động | Cố vấn phải bấm | Scheduler chạy định kỳ |

## 2. Kỹ thuật
| # | Hạn chế |
|---|---|
| T1 | `Database.sql` ở gốc repo chưa cập nhật bảng/cột mới (`quality_checks`, cột bàn giao, `recorded_by_employee_id`, trạng thái NO_SHOW). Nguồn chuẩn là migration. |
| T2 | ESLint FE còn 38 vấn đề có từ trước (chủ yếu `react-hooks/set-state-in-effect`, 3 lỗi ở `Booking.tsx`). |
| T3 | 2 script FE fail do kiểm tra chuỗi giao diện cũ: `test:atelier`, `test:tracking-booking`. Chưa sửa kỳ vọng vì cần thống nhất nội dung giao diện mong muốn. |
| T4 | E2E trình duyệt toàn luồng chưa tự động hóa trong repo (đã chạy thủ công bằng script Playwright ngoài repo). |
| T5 | Idempotency và rate limit dùng cache mặc định; nhiều server cần cache dùng chung (Redis) để khóa đúng. |
| T6 | Tỉ lệ hủy / không đến trên dashboard tính theo lịch **tạo** trong kỳ, không theo ngày hẹn. |
| T7 | Bundle FE > 500 kB (cảnh báo Vite), chưa tách chunk. |

## 3. Môi trường
- Không push được trực tiếp lên GitHub từ môi trường làm việc (403); mã được bàn giao bằng file `git bundle`.
