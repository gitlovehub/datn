# Nhật ký triển khai (nhánh `demo` → `demo_v2`)

Mỗi commit đặt tiêu đề theo luồng nghiệp vụ. Danh sách đầy đủ: `git log --oneline origin/main..demo_v2`.

## Giai đoạn 1 — Hoàn thiện luồng (nhánh `demo`)
| Commit | Nội dung |
|---|---|
| c82cc0a | Tiếp nhận xe: chặn tạo phiếu sai trạng thái lịch, trùng phiếu, sai xe |
| e53a773, 0c47eb3 | Phân công KTV: API danh sách KTV, chặn giao trùng/giao phiếu đã kết thúc, giải phóng KTV khi phiếu xong/đóng |
| 7aae9c6 | Kiểm tra & chẩn đoán: chỉ KTV được giao thao tác; API danh mục phụ tùng |
| 2293a34 | Báo giá lấy đơn giá/mô tả từ danh mục khi bỏ trống |
| 28b72ac | Phụ tùng thực dùng = xuất kho |
| bf5b1a7, a94cc6e | Thanh toán tiền mặt (DIRECT) do cố vấn xác nhận; đánh giá sau bàn giao; chi tiết phiếu kèm dòng hóa đơn |
| ddb68e6, b7c1e88 | Dữ liệu demo toàn luồng; seeder chạy lại không nhân đôi |
| 60434f9, 7924a4b | Đổi lịch áp dụng cùng quy tắc với đặt lịch; thông báo lỗi tiếng Việt |
| 32f7f99 … 045cbb0 | Màn hình FE cho từng luồng (phân công, chẩn đoán, báo giá, sửa chữa, thanh toán, đánh giá, điều hướng) |

## Giai đoạn 2 — Bỏ màn hình KTV, đồng bộ giao diện (`demo_v2`)
| Commit | Nội dung |
|---|---|
| 0c0b27b, 9d7ea91, f41c532 | Cố vấn tự ghi kết quả kiểm tra trên trang phiếu; gỡ khu vực `/technician` |
| 30a8f3b | Hệ thống nút `cs-btn` (hover, nhấn, focus, khóa) |
| 1947d38 | Sửa lỗi CSS reset làm nút/ô nhập bỏ qua cỡ chữ; cỡ chữ tối thiểu 12px |

## Giai đoạn 3 — Bổ sung theo phân tích khoảng trống (master prompt)
| Commit | Nội dung | Khoảng trống xử lý |
|---|---|---|
| fe30dac | Giới hạn lịch đang hoạt động, rate limit đặt lịch, `Idempotency-Key` cho đặt lịch/lập phiếu/thu tiền | Chống spam, chống ghi trùng |
| 389e89a | Trạng thái NO_SHOW; chặn xóa xe đang có lịch/đang ở gara | Vòng đời lịch hẹn, toàn vẹn dữ liệu |
| 542bf65 | Lưu KTV thực hiện riêng với người nhập; KTV không cần đăng nhập; phân công KTV theo hạng mục | Truy vết người sửa xe |
| 0340bd3 | Bảng `quality_checks`, QC bắt buộc trước khi hoàn thành; biên bản bàn giao (người nhận, SĐT, ghi chú) | QC, bàn giao |
| b4541f9 | Phiên bản báo giá: bản mới thay bản cũ, không đè bản đã duyệt | Báo giá rõ ràng |
| 61f596a | `GET /dashboard/summary` + bảng điều hành dùng số liệu thật kèm định nghĩa chỉ số | Dashboard không hardcode |
| 258af49 | Trang Thanh toán chế độ tối; nút bảng cố vấn/thẻ xe khách đồng bộ `cs-btn-sm` | UI |
| 89642e9 | Khóa hạng mục khi phiếu hoàn thành/đóng; hạng mục hủy không mở lại | Lỗ hổng máy trạng thái phát hiện khi viết tài liệu |
| 62d4109 | Header trang công khai không tràn ngang trên điện thoại | Lỗi phát hiện khi kiểm tra giao diện |

## Migration mới cần chạy
```bash
cd backend && php artisan migrate
```
- `2026_11_02_134250_allow_advisor_to_record_inspections`
- `2026_11_03_135032_add_quality_checks_and_handover_details`

Cả hai chỉ thêm cột/bảng, không xóa dữ liệu.

## Thay đổi hành vi API cần lưu ý cho FE/Postman
- `POST /repair-orders/{id}/hand-over` **bắt buộc** `receiver_name`.
- `POST /repair-orders/{id}/complete` cần gọi `POST /repair-orders/{id}/review` với `result=PASSED` trước.
- `POST /appointments` có thể trả `429` (quá tần suất) và `422` (quá số lịch đang hoạt động).
- `PATCH /work-items/{id}/status` trả `422` khi phiếu không ở IN_PROGRESS/WAITING_FOR_PARTS.
