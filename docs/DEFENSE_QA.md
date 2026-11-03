# Câu hỏi phản biện và trả lời

Mỗi câu trả lời chỉ dựa trên chức năng **đã có trong code** và test **đã chạy**. Chỗ chưa làm được nói rõ là chưa làm.

## A. Kiến trúc & bảo mật
**1. Vì sao tách FE React và BE Laravel?**
Hai bên chỉ giao tiếp qua REST API JSON, mọi quy tắc nghiệp vụ nằm ở BE (`RepairOrderService`). Có thể đổi giao diện hoặc thêm app di động mà không viết lại nghiệp vụ.

**2. Xác thực thế nào?**
Laravel Sanctum, Bearer token. Đăng nhập trả token; FE gửi `Authorization: Bearer`. Đăng xuất thu hồi token hiện tại (`AuthTest::test_logout_revokes_the_current_bearer_token`).

**3. Nếu người dùng sửa FE để hiện nút bị ẩn thì sao?**
Vô ích: BE chặn bằng middleware `role:` (trả 403) và kiểm tra quyền sở hữu. Ví dụ khách gọi `/api/technicians` → 403 (`AssignTechnicianFlowTest::test_customer_cannot_list_technicians`).

**4. Khách A có xem được phiếu/hóa đơn của khách B bằng cách đổi id trên URL không?**
Không. API `/me/...` lọc theo `customer_id` của tài khoản đang đăng nhập (`CustomerRepairOrderControllerTest::test_customer_cannot_view_another_customers_repair_order_or_invoice`).

**5. Khách có duyệt được báo giá bằng id hạng mục của báo giá khác không?**
Không, BE kiểm tra hạng mục thuộc đúng báo giá (`..._cannot_respond_using_an_item_from_another_quotation`).

**6. Đăng ký có xác thực email không?**
Có, phải nhập OTP gửi qua email mới nhận token (`AuthTest::test_customer_can_register_and_must_verify_email_before_receiving_a_token`).

**7. Tài khoản bị khóa có đăng nhập được không?**
Không (`AuthTest::test_inactive_account_cannot_log_in`).

**8. Khách từng sửa xe tại quầy (vãng lai), giờ đăng ký online thì có thấy lịch sử cũ?**
Có, nhưng chỉ liên kết khi **email đã xác thực** trùng; không liên kết theo số điện thoại để tránh chiếm hồ sơ người khác (`..._verifying_otp_does_not_link_walkin_customer_matched_only_by_phone`).

**9. Lỗi nghiệp vụ trả về FE thế nào?**
`InvalidStatusTransitionException` → HTTP 422 JSON có `message` tiếng Việt (`ExampleTest::test_invalid_status_transition_returns_a_json_422_response`).

**10. Bảo mật mật khẩu?**
Lưu hash (`Hash::make`), đổi mật khẩu phải nhập mật khẩu hiện tại (`..._can_change_password_with_validation`).

## B. Đặt lịch
**11. Làm sao không cho hai khách đặt quá số suất của một khung giờ?**
Trong transaction, khóa dòng `working_hours` của ngày (`lockForUpdate`), đếm lịch không CANCELLED/NO_SHOW rồi so với `max_slots` (`test_rejects_the_sixth_booking_for_a_time_slot`).

**12. Một người đặt hàng chục lịch để giữ chỗ thì sao?**
Mỗi khách tối đa 3 lịch PENDING/CONFIRMED (cấu hình `CARSERVICE_MAX_ACTIVE_APPOINTMENTS`), khóa dòng khách khi đếm (`..._cannot_hold_more_active_appointments_than_the_limit`).

**13. Bot gửi request đặt lịch liên tục?**
Rate limiter `booking`: 3 lần/phút/tài khoản và 10 lần/phút/IP, vượt trả 429 (`..._booking_requests_are_rate_limited_per_account`).

**14. Khách bấm "Đặt lịch" 2 lần do mạng chậm có tạo 2 lịch không?**
Không. FE gửi `Idempotency-Key`, giữ nguyên key khi bấm lại; BE trả lại kết quả cũ, header `Idempotent-Replayed: true` (`..._same_idempotency_key_does_not_create_a_duplicate`).

**15. Hai request cùng key đến cùng lúc?**
Request đến sau nhận 409 vì key đang bị khóa (`Cache::lock`). Hành vi này có trong code, chưa có test riêng.

**16. Kẻ xấu đoán được key của người khác thì sao?**
Key được băm cùng id tài khoản nên không đọc được kết quả của người khác (`..._same_idempotency_key_from_another_account_is_not_replayed`).

**17. Đặt giờ quá khứ / ngày lễ / ngoài giờ làm?**
Bị chặn với thông báo tiếng Việt: "Giờ hẹn phải ở tương lai", "Garage nghỉ lễ ngày này", "Ngoài giờ làm việc của garage".

**18. Một xe đặt hai lịch cùng giờ?**
Chặn (`test_rejects_duplicate_booking_for_same_vehicle_and_time`).

**19. Đổi lịch có bị lách được giới hạn không?**
Không, đổi lịch dùng cùng quy tắc đặt mới (`..._rescheduling_into_a_full_slot_is_rejected_like_booking`) và chỉ đổi khi PENDING.

**20. Khách không đến thì xử lý sao?**
Cố vấn đánh dấu NO_SHOW, chỉ được sau giờ hẹn + 30 phút để không đánh nhầm khách đến muộn; lịch NO_SHOW không chiếm suất (`AppointmentLifecycleTest`).

**21. Sao không tự động đánh dấu NO_SHOW?**
Chưa làm tác vụ định kỳ; hiện là thao tác của cố vấn (KNOWN_LIMITATIONS L11).

**22. Khách xóa xe khi xe đang trong gara?**
Bị chặn 422 nếu xe có lịch PENDING/CONFIRMED hoặc phiếu chưa bàn giao/đóng (`..._cannot_delete_a_vehicle_with_an_active_appointment_or_open_repair_order`). Xóa hợp lệ là xóa mềm để giữ lịch sử.

## C. Tiếp nhận, kiểm tra
**23. Vì sao bỏ màn hình KTV?**
Thực tế nhiều gara nhỏ KTV không thao tác máy; cố vấn ghi nhận thay. Nhưng vẫn lưu **ai thực hiện**: chọn KTV trong danh sách, lưu riêng với người nhập (`recorded_by_employee_id`).

**24. KTV không đăng nhập thì sao biết ai sửa xe?**
Mỗi biên bản kiểm tra có `technician_id` (người làm) và `recorded_by_employee_id` (người nhập); mỗi hạng mục có `technician_id`; đổi người ghi lịch sử "A → B (lý do)" (`test_advisor_assigns_and_reassigns_the_technician_of_a_work_item`).

**25. KTV bị khóa tài khoản đăng nhập có còn được giao việc?**
Có, vì lọc theo trạng thái làm việc của nhân viên chứ không theo tài khoản; KTV nghỉ việc (nhân viên INACTIVE) bị loại (`test_advisor_lists_working_technicians_even_without_login`).

**26. Lập 2 phiếu cho 1 lịch được không?**
Không: UNIQUE `appointment_id`, khóa dòng lịch, thêm idempotency (`ReceiveVehicleFlowTest`).

**27. Lập phiếu khi khách chưa đến?**
Không, lịch phải CHECKED_IN (`test_appointment_must_be_checked_in_before_receiving`).

**28. Khách vãng lai không đặt lịch?**
Được lập phiếu không cần lịch, nhưng một xe không thể có hai phiếu đang mở (`test_walk_in_vehicle_cannot_have_two_open_repair_orders`).

**29. KTV (nếu dùng API) có thao tác phiếu của người khác?**
Không, chỉ phiếu được giao (`test_unassigned_technician_cannot_record_or_complete_inspection`, `test_technician_can_only_view_assigned_repair_orders`).

## D. Báo giá
**30. Cố vấn có tự nâng giá được không?**
Không nhập giá thì BE lấy giá danh mục (`test_quotation_uses_catalog_price_and_name_when_omitted`). Có nhập thì giá được lưu trên báo giá và khách thấy rõ trước khi duyệt.

**31. Khách chỉ đồng ý một phần?**
Duyệt từng hạng mục; báo giá thành PARTIALLY_APPROVED, chỉ tạo công việc cho phần được duyệt (`test_customer_partial_approval_creates_work_items_only_for_approved_services`).

**32. Báo giá lại thì bản cũ ra sao?**
Bản DRAFT/SENT/REJECTED cũ chuyển CANCELLED trong cùng transaction; chỉ còn một bản hiệu lực (`test_new_quotation_version_supersedes_the_previous_one`).

**33. Có lập bản mới đè lên bản khách đã duyệt không?**
Không, BE chặn để không thay đổi điều khách đã đồng ý (`test_approved_quotation_cannot_be_silently_replaced`).

**34. Phát hiện hỏng thêm khi đang sửa?**
Chưa có báo giá phát sinh; đây là hạn chế đã ghi (L5).

**35. Bắt đầu sửa khi khách chưa duyệt?**
Không (`test_repair_cannot_start_before_customer_approves`).

## E. Sửa chữa, kho, QC
**36. Phụ tùng ngoài báo giá có được dùng?**
Không, BE yêu cầu phụ tùng nằm trong báo giá đã duyệt.

**37. Hết hàng trong kho?**
Ghi phụ tùng vượt tồn bị chặn, không trừ kho; có thể chuyển phiếu sang WAITING_FOR_PARTS (`test_using_part_beyond_stock_is_rejected_without_changes`).

**38. Hai người cùng xuất kho một phụ tùng cùng lúc?**
Transaction + `lockForUpdate` dòng tồn kho trước khi kiểm tra và trừ.

**39. Kho có giữ chỗ khi khách duyệt báo giá?**
Chưa; tồn chỉ giảm khi ghi phụ tùng thực dùng (L3).

**40. Hoàn thành phiếu khi còn việc chưa xong?**
Không (`test_order_completes_only_after_all_work_items_are_done`).

**41. QC là gì, bắt buộc không?**
Bắt buộc. Cố vấn ghi kết quả PASSED/FAILED vào bảng `quality_checks`. Chỉ hoàn thành phiếu khi QC gần nhất PASSED.

**42. QC không đạt thì sao?**
Bắt buộc ghi lỗi, chọn hạng mục sửa lại → quay về PENDING; phải QC lại mới hoàn thành (`test_failed_quality_check_reopens_work_and_blocks_completion_until_rechecked`).

**43. QC đạt rồi lại sửa thêm thì QC cũ còn giá trị?**
Không. BE so thời điểm QC với thời điểm hoàn tất hạng mục cuối; sửa sau QC phải QC lại (`test_work_finished_after_a_passed_check_needs_a_new_check`).

**44. Sửa trạng thái hạng mục khi phiếu đã hoàn thành?**
Bị chặn; hạng mục chỉ cập nhật khi phiếu IN_PROGRESS/WAITING_FOR_PARTS; hạng mục đã hủy không mở lại (`test_work_items_are_frozen_once_the_order_is_completed`).

**45. Lịch sử phiếu lưu thế nào?**
Mỗi lần đổi trạng thái ghi `repair_order_status_history` với người thao tác, ghi chú, thời gian; chi tiết phiếu trả mới nhất trước.

**46. Đóng phiếu giữa chừng?**
Cần lý do trong danh sách cho phép + ghi chú; phân công KTV đang mở được giải phóng (`test_closing_order_releases_its_technician`).

## F. Thanh toán, bàn giao, đánh giá
**47. Vì sao chỉ tiền mặt?**
Đúng phạm vi đã thống nhất: tiền mặt do cố vấn xác nhận. API từ chối phương thức khác (`test_only_cash_payment_is_accepted_and_overpayment_is_rejected`).

**48. Thu tiền 2 lần do bấm đúp?**
`Idempotency-Key` → ghi 1 lần (`test_retrying_a_cash_payment_with_the_same_key_records_it_once`).

**49. Thu vượt số nợ?**
Chặn; khóa dòng hóa đơn khi kiểm tra. Thu nhiều lần được, hóa đơn chuyển PARTIALLY_PAID → PAID.

**50. Giao xe khi chưa trả đủ?**
Không, cần hóa đơn PAID.

**51. Người khác đến nhận xe hộ?**
Biên bản bàn giao bắt buộc ghi tên (và SĐT) người nhận; FE có danh sách kiểm tra khi người nhận khác chủ xe.

**52. Thu nhầm thì hoàn tiền thế nào?**
Chưa có chức năng hoàn tiền (L4).

**53. Đánh giá giả / đánh giá nhiều lần?**
Chỉ đánh giá phiếu của chính mình đã HANDED_OVER; UNIQUE `repair_order_id` nên mỗi phiếu một đánh giá.

## G. Dashboard & dữ liệu
**54. Số trên dashboard có phải số giả?**
Không. `GET /dashboard/summary` đếm trực tiếp từ DB mỗi lần gọi; test tạo dữ liệu thật rồi đối chiếu (`DashboardSummaryTest::test_summary_counts_real_records`).

**55. Doanh thu tính thế nào?**
Tổng `payments.amount` có status SUCCESS và `paid_at` trong N ngày (mặc định 30). Thanh toán FAILED không tính (test có ca này).

**56. "Chờ bàn giao" khác "Chờ thanh toán" thế nào?**
Cùng là phiếu COMPLETED; "chờ bàn giao" là hóa đơn đã PAID, "chờ thanh toán" là chưa PAID hoặc chưa lập.

**57. Tỉ lệ hủy có chính xác?**
Bằng số lịch tạo trong kỳ đang CANCELLED / tổng lịch tạo trong kỳ. Tính theo ngày tạo, không theo ngày hẹn (đã ghi T6).

**58. Trang Admin "Tài khoản", "Kho", "Báo cáo" có chạy với DB?**
Chưa, đang là dữ liệu mẫu trên FE (L1). Số liệu admin thật hiện có ở bảng điều hành.

## H. Kiểm thử & quy trình
**59. Đã kiểm thử những gì?**
131 test PHPUnit pass (611 assertion) bao phủ luồng chính, rẽ nhánh và phân quyền; FE build pass, 8/10 script FE pass; kiểm tra giao diện 100 lượt (25 trang × 2 kích thước × 2 chủ đề). Chi tiết ở TEST_REPORT.

**60. Hai script FE fail là gì?**
Kiểm tra tĩnh tìm chuỗi giao diện cũ (`Chăm sóc xe.` và class `at-tracking-timeline`) đã thay đổi; không phải lỗi chức năng. Chưa sửa kỳ vọng vì cần thống nhất nội dung.

**61. Có xóa dữ liệu khi nâng cấp DB?**
Không, migration mới chỉ thêm bảng/cột; chạy `php artisan migrate`, không dùng `migrate:fresh`.

**62. Khi viết tài liệu có phát hiện lỗi?**
Có hai: (1) có thể sửa trạng thái hạng mục của phiếu đã hoàn thành; (2) header tràn ngang trên điện thoại. Cả hai đã sửa kèm test/đo lại (`89642e9`, `62d4109`).
