# Báo cáo kiểm thử

Chạy ngày **03/11/2026** trên nhánh `demo_v2` (sau commit `62d4109`). Kết quả dưới đây là đầu ra thật của lệnh, không ước lượng.

## 1. Backend — PHPUnit
```bash
cd backend && php artisan test --compact
```
**Kết quả: 131/131 test pass, 611 assertion, ~4 giây** (SQLite in-memory, `RefreshDatabase`).

| File test | Số test | Phạm vi |
|---|---|---|
| Feature/AuthTest | 25 | Đăng ký + OTP, đăng nhập, khóa tài khoản, token, role middleware, CORS, liên kết khách vãng lai, hồ sơ, đổi mật khẩu |
| Feature/AppointmentControllerTest | 18 | Đặt/dời lịch, khung giờ đầy, trùng xe, xe người khác, giới hạn lịch, rate limit, idempotency |
| Feature/AppointmentLifecycleTest | 3 | NO_SHOW, chặn xóa xe đang hoạt động |
| Feature/ReceiveVehicleFlowTest | 4 | Lập phiếu từ lịch / xe vãng lai |
| Feature/AssignTechnicianFlowTest | 5 | Danh sách KTV, giao KTV, giải phóng KTV |
| Feature/InspectionControllerTest | 12 | Kiểm tra, đề xuất, hoàn tất, KTV thực hiện vs người nhập, phân quyền |
| Feature/RepairFlowTest | 17 | Báo giá, duyệt một phần, phiên bản báo giá, xuất kho, QC, hoàn thành, khóa hạng mục, thu tiền, idempotency, bàn giao, đánh giá |
| Feature/CustomerRepairOrderControllerTest | 6 | Khách chỉ thấy dữ liệu của mình, duyệt báo giá |
| Feature/DashboardSummaryTest | 2 | Số liệu bảng điều hành, chặn khách |
| Feature/AdminServiceControllerTest, AdminMaintenancePackageControllerTest | 9 | CRUD danh mục, quyền admin |
| Feature/ServiceControllerTest, MaintenancePackageControllerTest | 6 | API công khai |
| Feature/DatabaseSeederTest, RealDataSeederTest | 2 | Seeder chạy lại không nhân đôi |
| Feature/ExampleTest, Unit/* | còn lại | 422 JSON khi sai trạng thái, model ↔ bảng, máy trạng thái |

Format code: `vendor/bin/pint --dirty --format agent` → passed.

## 2. Frontend
| Lệnh | Kết quả |
|---|---|
| `npm run build` (tsc + vite) | ✅ Thành công |
| `npx eslint .` | ⚠️ 38 vấn đề (34 lỗi, 4 cảnh báo), **đều có từ trước**; các file sửa trong đợt này không thêm lỗi mới (đã sửa bớt 1 lỗi ở `WorkspaceDashboard.tsx`) |
| `npm run test:base` / `test:workspace` / `test:nav` / `test:contrast` / `test:customer` / `test:tailwind` / `test:workflow` / `test:ui-demo` | ✅ 8 script pass |
| `npm run test:atelier` | ❌ Fail: kiểm tra chuỗi cũ `/Chăm sóc xe\./` trên trang chủ đã đổi nội dung |
| `npm run test:tracking-booking` | ❌ Fail: kiểm tra class cũ `at-tracking-timeline` không còn trong mã nguồn |

Hai script fail là kiểm tra tĩnh theo **chuỗi giao diện cũ**, đã fail trước đợt này; chưa sửa để không đổi kỳ vọng kiểm thử mà chưa thống nhất (xem KNOWN_LIMITATIONS).

## 3. Kiểm tra giao diện bằng trình duyệt (Playwright, dữ liệu demo)
- 25 trang × 2 kích thước (1280×900, 390×844) × 2 chủ đề (sáng/tối) = 100 lượt: không có lỗi console.
- Phát hiện và đã sửa: header 5 trang công khai tràn ngang 42px ở 390px (commit `62d4109`); đo lại ở 320/360/390px, chưa đăng nhập và đã đăng nhập: không còn tràn.
- Bảng điều hành cố vấn/admin hiển thị số liệu từ `/dashboard/summary` (đối chiếu dữ liệu demo: doanh thu 1,8 triệu, 1 mã phụ tùng dưới mức cảnh báo, 2 phiếu đã bàn giao).
- Trang Thanh toán ở chế độ tối: đã sửa nền sáng chữ sáng ở ô tiền mặt và bảng hạng mục.
- E2E luồng thành công (đặt lịch → bàn giao → đánh giá) đã chạy qua giao diện ở đợt trước; sau thay đổi QC/bàn giao, phần FE mới được kiểm tra bằng tsc/eslint và ảnh chụp, **chưa chạy lại E2E tự động toàn luồng**.

## 4. Cách tự kiểm lại
```bash
cd backend && php artisan test --compact
cd frontend && npm run build && npm run test:workflow && npm run test:ui-demo
```
