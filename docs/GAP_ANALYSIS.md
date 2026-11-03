# Phân tích khoảng trống (trước → sau)

Đối chiếu yêu cầu trong master prompt với code trước đợt này (nhánh `demo_v2` tại commit `1947d38`) và sau đợt này.
Trạng thái: ✅ đã đáp ứng · 🟡 đáp ứng một phần · ❌ chưa làm.

| # | Yêu cầu | Trước | Sau | Bằng chứng |
|---|---|---|---|---|
| G1 | Chặn request trái quyền ở Backend (không chỉ ẩn nút) | ✅ middleware `role:` + lọc theo chủ sở hữu | ✅ thêm chặn cho API mới (`/technicians`, `/dashboard/summary`, `/work-items/{id}/technician`) | ROLE_PERMISSION_MATRIX |
| G2 | Chống spam đặt lịch | 🟡 chỉ giới hạn suất/khung giờ | ✅ giới hạn lịch đang hoạt động, rate limit tài khoản + IP | `fe30dac` |
| G3 | Idempotency (bấm đúp, mạng chập chờn) | ❌ | ✅ đặt lịch, lập phiếu, thu tiền | `EnsureIdempotentRequest` |
| G4 | Vòng đời lịch hẹn đủ trạng thái | 🟡 thiếu "không đến" | ✅ NO_SHOW có thời gian ân hạn | `389e89a` |
| G5 | Không xóa dữ liệu đang được dùng | 🟡 xe xóa mềm nhưng xóa được khi đang sửa | ✅ chặn xóa xe có lịch/phiếu mở | `389e89a` |
| G6 | Máy trạng thái phiếu chặt chẽ | ✅ `TRANSITIONS` | ✅ thêm khóa hạng mục khi phiếu kết thúc | `89642e9` |
| G7 | Truy vết KTV không cần đăng nhập | ❌ inspection bắt buộc technician có tài khoản; bỏ màn KTV thì mất thông tin người sửa | ✅ KTV thực hiện + người nhập; KTV theo hạng mục, lịch sử đổi người | `542bf65` |
| G8 | QC trước khi hoàn thành | ❌ | ✅ bắt buộc, lưu lịch sử QC, sửa lại khi không đạt | `0340bd3` |
| G9 | Biên bản bàn giao | 🟡 chỉ thời điểm | ✅ người nhận, SĐT, ghi chú, người nhận hộ | `0340bd3` |
| G10 | Báo giá có phiên bản | 🟡 lập nhiều bản song song | ✅ bản mới hủy bản cũ, không đè bản đã duyệt | `b4541f9` |
| G11 | Dashboard từ dữ liệu thật, có định nghĩa chỉ số | ❌ ô "—", "Chờ API" | ✅ `/dashboard/summary` + `definitions` | `61f596a` |
| G12 | Thanh toán tiền mặt có xác nhận, không thu vượt | ✅ | ✅ + idempotency | `bf5b1a7`, `fe30dac` |
| G13 | Admin quản lý tài khoản/nhân sự/kho/báo cáo bằng API | ❌ FE dữ liệu mẫu | ❌ chưa làm | KNOWN_LIMITATIONS L1 |
| G14 | Tài nguyên gara, giữ chỗ kho, hoàn tiền, báo giá phát sinh, audit log, thông báo | ❌ | ❌ chưa làm | KNOWN_LIMITATIONS L2–L7 |
| G15 | Giao diện dễ đọc sáng/tối, trên điện thoại | 🟡 | ✅ sửa thanh toán tối, header di động, nút đồng bộ | `258af49`, `62d4109` |
| G16 | Kiểm thử | 🟡 ~100 test | ✅ 131 test BE pass; 8/10 script FE pass | TEST_REPORT |
| G17 | Tài liệu bảo vệ | ❌ | ✅ thư mục `docs/` | file này |

## Lý do chưa làm G13–G14
Đây là các module mới cần thống nhất nghiệp vụ (quy trình nhập kho, ai duyệt hoàn tiền, mẫu thông báo...). Theo nguyên tắc của master prompt, các quyết định nghiệp vụ chưa thống nhất không tự ý triển khai; đã ghi rõ trong KNOWN_LIMITATIONS để làm tiếp.
