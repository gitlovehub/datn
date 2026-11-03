# Máy trạng thái

Mọi chuyển trạng thái phiếu sửa chữa đi qua `RepairOrderService::transition()` kiểm tra bằng `RepairOrder::TRANSITIONS`; sai → `422` với thông báo tiếng Việt. Mỗi lần chuyển ghi `repair_order_status_history` (người thao tác, ghi chú, thời điểm).

## 1. Lịch hẹn (`appointments.status`)
| Từ | Sang | Ai | Điều kiện |
|---|---|---|---|
| (mới) | PENDING | Khách | Qua toàn bộ kiểm tra đặt lịch |
| PENDING | CONFIRMED | Cố vấn/Admin | — |
| PENDING, CONFIRMED | CANCELLED | Khách hoặc Cố vấn/Admin | Cố vấn không hủy được lịch CHECKED_IN/CANCELLED/NO_SHOW |
| CONFIRMED | CHECKED_IN | Cố vấn/Admin | Khách đến gara |
| CONFIRMED | NO_SHOW | Cố vấn/Admin | Đã quá giờ hẹn + 30 phút (`carservice.no_show_grace_minutes`) |

Lịch CANCELLED và NO_SHOW không chiếm suất khi đếm khung giờ. Khách chỉ sửa lịch khi PENDING.

## 2. Phiếu sửa chữa (`repair_orders.status`)
| Từ | Được sang |
|---|---|
| RECEIVED | INSPECTING, CLOSED |
| INSPECTING | QUOTING, WAITING_APPROVAL, CLOSED |
| QUOTING | WAITING_APPROVAL, CLOSED |
| WAITING_APPROVAL | IN_PROGRESS, CLOSED |
| IN_PROGRESS | WAITING_FOR_PARTS, COMPLETED, CLOSED |
| WAITING_FOR_PARTS | IN_PROGRESS, CLOSED |
| COMPLETED | HANDED_OVER |
| HANDED_OVER | — (kết thúc) |
| CLOSED | — (kết thúc) |

Điều kiện thêm (ngoài bảng):
- → INSPECTING: khi giao KTV hoặc ghi biên bản kiểm tra đầu tiên.
- → QUOTING: khi hoàn tất kiểm tra.
- → WAITING_APPROVAL: khi gửi báo giá.
- → IN_PROGRESS (start-repair): báo giá mới nhất APPROVED hoặc PARTIALLY_APPROVED.
- → COMPLETED: không còn hạng mục PENDING/IN_PROGRESS **và** QC gần nhất PASSED, thời điểm QC ≥ thời điểm hoàn tất hạng mục cuối.
- → HANDED_OVER: hóa đơn PAID, có tên người nhận xe.
- → CLOSED: lý do thuộc danh sách cho phép + ghi chú. Khi COMPLETED/CLOSED, phân công KTV còn mở được đóng (COMPLETED/CANCELLED).

## 3. Báo giá (`quotations.status`)
| Từ | Sang | Điều kiện |
|---|---|---|
| (mới) | DRAFT | Phiếu INSPECTING/QUOTING/WAITING_APPROVAL; bản mới nhất chưa được duyệt |
| DRAFT | SENT | Cố vấn gửi |
| SENT | APPROVED / PARTIALLY_APPROVED / REJECTED | Khách trả lời hết các hạng mục (trả lời một phần vẫn SENT) |
| DRAFT, SENT, REJECTED | CANCELLED | Tự động khi lập phiên bản mới |

APPROVED / PARTIALLY_APPROVED không bị thay thế.

## 4. Hạng mục công việc (`work_items.status`)
PENDING → IN_PROGRESS → COMPLETED; có thể CANCELLED (trạng thái cuối, không mở lại). Chỉ cập nhật được khi phiếu đang IN_PROGRESS hoặc WAITING_FOR_PARTS. QC FAILED đưa hạng mục được chọn về PENDING. Không đổi KTV khi hạng mục COMPLETED/CANCELLED.

## 5. Kiểm tra chất lượng (`quality_checks.result`)
PASSED | FAILED (FAILED bắt buộc `note`). Lưu thành bản ghi lịch sử, không ghi đè.

## 6. Hóa đơn (`invoices.status`) và thanh toán (`payments.status`)
- Hóa đơn: UNPAID → PARTIALLY_PAID → PAID theo tổng thanh toán SUCCESS.
- Thanh toán tiền mặt (DIRECT) được ghi SUCCESS ngay. Mã QR (PENDING → SUCCESS/FAILED) có trong code nhưng API tạo thanh toán hiện chỉ nhận DIRECT.

## 7. Phân công KTV (`assignments.status`)
ASSIGNED → IN_PROGRESS → COMPLETED; CANCELLED khi đóng phiếu.
