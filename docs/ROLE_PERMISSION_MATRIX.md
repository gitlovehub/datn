# Ma trận phân quyền

Quyền được **thực thi ở Backend** bằng middleware `role:` trong `backend/routes/api.php` (`App\Http\Middleware\EnsureRole`, trả `403`). Ngoài vai trò, các API của khách luôn lọc theo `customer_id` của tài khoản đăng nhập (khách khác → `404`/`403`). FE chỉ ẩn nút cho gọn.

Ký hiệu: ✅ được phép · ❌ bị chặn (403) · 🔸 được phép có điều kiện

| Chức năng | API | Khách | Cố vấn | Admin | KTV |
|---|---|---|---|---|---|
| Đăng ký, đăng nhập, OTP, quên mật khẩu | `/register`, `/login`, `/verify-email-otp`, ... | công khai | công khai | công khai | công khai |
| Xem/sửa hồ sơ, đổi mật khẩu, đăng xuất | `/me`, `/me/profile`, `/me/change-password`, `/logout` | ✅ | ✅ | ✅ | ✅ |
| Xem dịch vụ, gói bảo dưỡng, giờ làm việc | `/services`, `/maintenance-packages`, `/working-hours` | công khai | công khai | công khai | công khai |
| Xe của tôi (CRUD) | `/me/vehicles` | 🔸 chỉ xe mình; không xóa xe đang có lịch/phiếu mở | ❌ | ❌ | ❌ |
| Đặt / sửa / hủy lịch của mình | `/appointments` | 🔸 chỉ lịch mình; sửa khi PENDING; hủy khi PENDING/CONFIRMED | ❌ | ❌ | ❌ |
| Xem phiếu, báo giá, hóa đơn của mình | `/me/repair-orders...` | 🔸 chỉ của mình | ❌ | ❌ | ❌ |
| Duyệt báo giá | `/me/quotations/{id}/respond` | 🔸 báo giá của mình, đang SENT | ❌ | ❌ | ❌ |
| Đánh giá | `/me/reviews` | 🔸 phiếu của mình đã HANDED_OVER | ❌ | ❌ | ❌ |
| Quản lý lịch hẹn (xác nhận, tiếp nhận, hủy, không đến) | `/advisor/appointments/...` | ❌ | ✅ | ✅ | ❌ |
| Bảng điều hành số liệu | `/dashboard/summary` | ❌ | ✅ | ✅ | ❌ |
| Khách hàng: xem, thêm, sửa | `/customers` | ❌ | ✅ | ✅ | ❌ |
| Khách hàng: xóa | `DELETE /customers/{id}` | ❌ | ❌ | ✅ | ❌ |
| Xe khách hàng CRUD | `/vehicles`, `/customers/{id}/vehicles` | ❌ | ✅ | ✅ | ❌ |
| Xem danh sách / chi tiết phiếu | `GET /repair-orders` | ❌ | ✅ | ❌ | 🔸 chỉ phiếu được giao |
| Lập phiếu, giao KTV, sửa chữa, QC, hoàn thành, đóng, bàn giao | `POST /repair-orders...` | ❌ | ✅ | ❌ | ❌ |
| Ghi kiểm tra / đề xuất / hoàn tất kiểm tra | `/repair-orders/{id}/inspections...` | ❌ | ✅ | ❌ | 🔸 chỉ phiếu được giao |
| Cập nhật trạng thái hạng mục, ghi phụ tùng dùng | `/work-items/{id}/status`, `/used-parts` | ❌ | ✅ | ❌ | 🔸 |
| Đổi KTV thực hiện hạng mục, xem danh sách KTV | `/work-items/{id}/technician`, `/technicians` | ❌ | ✅ | ❌ | ❌ |
| Danh mục phụ tùng (kèm tồn kho) | `GET /parts` | ❌ | ✅ | ❌ | ✅ |
| Báo giá: lập, gửi, ghi phản hồi hộ | `/repair-orders/{id}/quotations`, `/quotations/{id}/send|respond` | ❌ | ✅ | ❌ | ❌ |
| Hóa đơn, thu tiền | `/repair-orders/{id}/invoice`, `/invoices/{id}/payments` | ❌ | ✅ | ❌ | ❌ |
| Quản trị dịch vụ, gói bảo dưỡng, giờ làm việc | `/admin/...` | ❌ | ❌ | ✅ | ❌ |

## Kiểm thử phân quyền đã có
- `AuthTest::test_role_middleware_allows_advisors_and_rejects_customers`
- `AdminServiceControllerTest::test_service_admin_routes_require_an_admin_account`, `AdminMaintenancePackageControllerTest::test_admin_package_routes_require_an_admin_account`
- `CustomerRepairOrderControllerTest::test_customer_cannot_view_another_customers_repair_order_or_invoice`, `..._cannot_respond_using_an_item_from_another_quotation`
- `ExampleTest::test_technician_can_only_view_assigned_repair_orders`, `InspectionControllerTest::test_unassigned_technician_cannot_record_or_complete_inspection`, `..._customer_cannot_call_technician_inspection_endpoints`
- `AssignTechnicianFlowTest::test_customer_cannot_list_technicians`, `DashboardSummaryTest::test_customer_cannot_read_summary`
- `AppointmentControllerTest::test_customer_cannot_book_another_customers_vehicle`, `..._same_idempotency_key_from_another_account_is_not_replayed`

## Ghi chú
- Admin **không** có quyền thao tác phiếu sửa chữa (chỉ xem số liệu tổng hợp và phiếu gần đây qua `/dashboard/summary`). Đây là lựa chọn tách vai trò: admin quản trị danh mục, cố vấn vận hành.
- Tài khoản KTV vẫn tồn tại và được API kiểm soát, nhưng `demo_v2` không có màn hình KTV.
