# Tình huống biên và cách hệ thống xử lý

Cột "Kiểm chứng" ghi tên test tự động (PHPUnit, `backend/tests`) chứng minh hành vi. Dòng ghi "—" là hành vi có trong code nhưng chưa có test riêng.

## A. Đặt lịch
| # | Tình huống | Xử lý | Kiểm chứng |
|---|---|---|---|
| A1 | Khách bấm "Đặt lịch" nhiều lần / mạng chập chờn gửi lại | Cùng `Idempotency-Key` → trả lại kết quả cũ, không tạo lịch thứ 2 | `AppointmentControllerTest::test_resending_a_booking_with_the_same_idempotency_key_does_not_create_a_duplicate` |
| A2 | Hai request cùng key chạy song song | Request sau nhận `409` (Cache lock) | — |
| A3 | Tài khoản khác dùng trùng key | Không bị trả nhầm dữ liệu người khác (key gắn user id) | `..._same_idempotency_key_from_another_account_is_not_replayed` |
| A4 | Spam đặt lịch | 3 request/phút/tài khoản, 10/phút/IP → `429` | `..._booking_requests_are_rate_limited_per_account` |
| A5 | Giữ chỗ hàng loạt | Tối đa 3 lịch PENDING/CONFIRMED mỗi khách (cấu hình) | `..._customer_cannot_hold_more_active_appointments_than_the_limit` |
| A6 | Khung giờ đầy | Đếm lịch không CANCELLED/NO_SHOW so với `max_slots`, có khóa dòng | `..._rejects_the_sixth_booking_for_a_time_slot` |
| A7 | Cùng xe đặt 2 lịch cùng khung | Chặn | `..._rejects_duplicate_booking_for_same_vehicle_and_time` |
| A8 | Đặt bằng xe của người khác / xe đã xóa | Chặn | `..._customer_cannot_book_another_customers_vehicle`, `..._rejects_booking_with_soft_deleted_vehicle` |
| A9 | Gửi cả `vehicle_id` và `new_vehicle` | Chặn | `..._rejects_both_existing_and_new_vehicle_in_same_booking` |
| A10 | Đặt lỗi giữa chừng khi có xe mới | Transaction rollback, xe mới không bị lưu | `..._failed_booking_does_not_save_new_vehicle` |
| A11 | Giờ quá khứ, ngày lễ, ngoài giờ làm việc | `422` thông báo tiếng Việt | `..._invalid_time_format_returns_vietnamese_message` (định dạng); các nhánh còn lại — |
| A12 | Dời lịch sang khung đầy / xe đã có lịch / xe người khác | Chặn như đặt mới | `..._rescheduling_into_a_full_slot_is_rejected_like_booking`, `..._rescheduling_rejects_vehicle_already_booked_in_that_slot`, `..._rescheduling_to_another_customers_vehicle_is_rejected` |
| A13 | Khách không đến | Cố vấn đánh dấu NO_SHOW chỉ sau giờ hẹn + 30 phút; suất được giải phóng | `AppointmentLifecycleTest::test_no_show_is_only_allowed_after_the_grace_period`, `..._requires_a_confirmed_appointment`, `AppointmentControllerTest::test_rescheduling_ignores_no_show_when_counting_slots` |

## B. Xe & khách
| # | Tình huống | Xử lý | Kiểm chứng |
|---|---|---|---|
| B1 | Xóa xe đang có lịch hoặc đang sửa | `422`, giữ xe | `AppointmentLifecycleTest::test_customer_cannot_delete_a_vehicle_with_an_active_appointment_or_open_repair_order` |
| B2 | Khách vãng lai đã có hồ sơ tại gara rồi đăng ký online | Liên kết hồ sơ chỉ khi **email đã xác thực** trùng, không liên kết theo số điện thoại | `AuthTest::test_walkin_customer_is_linked_only_after_matching_email_is_verified`, `..._verifying_otp_does_not_link_walkin_customer_matched_only_by_phone` |

## C. Tiếp nhận & kiểm tra
| # | Tình huống | Xử lý | Kiểm chứng |
|---|---|---|---|
| C1 | Lập phiếu 2 lần cho 1 lịch (bấm đúp) | UNIQUE `appointment_id` + idempotency | `ReceiveVehicleFlowTest::test_advisor_creates_one_repair_order_for_checked_in_appointment` |
| C2 | Lập phiếu khi khách chưa đến | Lịch phải CHECKED_IN | `..._appointment_must_be_checked_in_before_receiving` |
| C3 | Xe/khách không khớp lịch | Chặn | `..._vehicle_must_match_appointment_and_customer` |
| C4 | Xe vãng lai đang có phiếu mở | Chặn phiếu thứ 2 | `..._walk_in_vehicle_cannot_have_two_open_repair_orders` |
| C5 | KTV không có tài khoản/không đăng nhập | Cố vấn nhập, chọn "KTV thực hiện"; lưu riêng người nhập | `InspectionControllerTest::test_advisor_records_which_technician_performed_the_inspection` |
| C6 | KTV tài khoản bị khóa vẫn đi làm | Vẫn có trong danh sách chọn; KTV nghỉ việc (nhân viên INACTIVE) bị loại | `AssignTechnicianFlowTest::test_advisor_lists_working_technicians_even_without_login` |
| C7 | Ghi kiểm tra 2 lần | Chặn | `InspectionControllerTest::test_cannot_create_duplicate_inspection_for_same_repair_order` |

## D. Báo giá
| # | Tình huống | Xử lý | Kiểm chứng |
|---|---|---|---|
| D1 | Cố vấn sửa giá tùy ý | Không nhập giá → lấy giá danh mục | `RepairFlowTest::test_quotation_uses_catalog_price_and_name_when_omitted` |
| D2 | Khách duyệt một phần | Chỉ tạo hạng mục cho phần duyệt | `..._customer_partial_approval_creates_work_items_only_for_approved_services` |
| D3 | Cần báo giá lại | Phiên bản mới, bản cũ CANCELLED, khách chỉ thấy 1 bản hiệu lực | `..._new_quotation_version_supersedes_the_previous_one` |
| D4 | Lập bản mới đè bản khách đã duyệt | Chặn | `..._approved_quotation_cannot_be_silently_replaced` |
| D5 | Khách gửi id hạng mục của báo giá khác | Chặn | `CustomerRepairOrderControllerTest::test_customer_cannot_respond_using_an_item_from_another_quotation` |
| D6 | Sửa trước khi khách duyệt | Chặn | `RepairFlowTest::test_repair_cannot_start_before_customer_approves` |

## E. Sửa chữa, QC
| # | Tình huống | Xử lý | Kiểm chứng |
|---|---|---|---|
| E1 | Dùng phụ tùng ngoài báo giá / vượt tồn | Chặn, không trừ kho | `..._technician_uses_approved_part_and_stock_is_exported`, `..._using_part_beyond_stock_is_rejected_without_changes` |
| E2 | Hoàn thành khi còn hạng mục dở | Chặn | `..._order_completes_only_after_all_work_items_are_done` |
| E3 | Hoàn thành không qua QC | Chặn | như trên |
| E4 | QC không đạt | Bắt buộc ghi lỗi, hạng mục sửa lại về PENDING, cần QC mới | `..._failed_quality_check_reopens_work_and_blocks_completion_until_rechecked` |
| E5 | Sửa thêm sau khi QC đạt | QC cũ hết hiệu lực | `..._work_finished_after_a_passed_check_needs_a_new_check` |
| E6 | Đổi KTV giữa chừng | Ghi lịch sử "A → B (lý do)" | `..._advisor_assigns_and_reassigns_the_technician_of_a_work_item` |
| E7 | Sửa hạng mục sau khi phiếu hoàn thành/đóng; mở lại hạng mục đã hủy | Chặn | `..._work_items_are_frozen_once_the_order_is_completed`, `..._cancelled_work_item_cannot_be_reopened` |
| E8 | Giao KTV cho phiếu đã đóng; đóng phiếu còn KTV | Chặn / tự giải phóng phân công | `AssignTechnicianFlowTest::test_cannot_assign_technician_to_finished_order`, `..._closing_order_releases_its_technician` |

## F. Thanh toán & bàn giao
| # | Tình huống | Xử lý | Kiểm chứng |
|---|---|---|---|
| F1 | Bấm "Thu tiền" 2 lần | Cùng key → ghi 1 lần | `RepairFlowTest::test_retrying_a_cash_payment_with_the_same_key_records_it_once` |
| F2 | Thu quá số nợ / phương thức khác tiền mặt | Chặn | `..._only_cash_payment_is_accepted_and_overpayment_is_rejected` |
| F3 | Bàn giao khi chưa trả đủ | Chặn | `..._cash_payment_then_hand_over_then_customer_review` |
| F4 | Người khác nhận xe hộ | Bắt buộc ghi tên (+ SĐT) người nhận vào biên bản | như trên |
| F5 | Đánh giá trước khi nhận xe / đánh giá 2 lần | Chặn (điều kiện HANDED_OVER, UNIQUE) | như trên |

## G. Phân quyền
Xem [ROLE_PERMISSION_MATRIX](ROLE_PERMISSION_MATRIX.md#kiểm-thử-phân-quyền-đã-có).
