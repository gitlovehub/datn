<?php

/*
|--------------------------------------------------------------------------
| Quy tắc nghiệp vụ CarService
|--------------------------------------------------------------------------
| Giá trị mặc định dùng cho demo; quản trị viên chỉnh qua biến môi trường
| (.env) mà không cần sửa code.
*/

return [
    // Số lịch đang hoạt động (PENDING, CONFIRMED) tối đa trên một tài khoản khách.
    'max_active_appointments' => (int) env('CARSERVICE_MAX_ACTIVE_APPOINTMENTS', 3),

    // Số yêu cầu tạo lịch tối đa mỗi phút: theo tài khoản và theo địa chỉ IP.
    'booking_requests_per_minute' => (int) env('CARSERVICE_BOOKING_PER_MINUTE', 3),
    'booking_requests_per_minute_per_ip' => (int) env('CARSERVICE_BOOKING_PER_MINUTE_PER_IP', 10),

    // Số phút chờ khách đến muộn trước khi được đánh dấu không đến (NO_SHOW).
    'no_show_grace_minutes' => (int) env('CARSERVICE_NO_SHOW_GRACE_MINUTES', 30),

    // Thời gian giữ kết quả của một Idempotency-Key (giờ).
    'idempotency_ttl_hours' => (int) env('CARSERVICE_IDEMPOTENCY_TTL_HOURS', 24),
];
