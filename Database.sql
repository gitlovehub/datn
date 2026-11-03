CREATE DATABASE IF NOT EXISTS `carservice_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `carservice_db`;


-- ============================================================================
-- CARSERVICE DATABASE V6 - TÀI LIỆU NGUỒN CHUẨN CHO NHÓM
-- ============================================================================
-- PHẠM VI HỆ THỐNG
-- - Website quản lý dịch vụ bảo dưỡng / sửa chữa Ô TÔ cho MỘT garage.
-- - KHÔNG có chi nhánh. Mọi dữ liệu tồn kho, lịch làm việc và vận hành thuộc garage này.
-- - 4 actor nghiệp vụ duy nhất: CUSTOMER (Khách hàng), ADVISOR (Cố vấn),
--   TECHNICIAN (Kỹ thuật viên), ADMIN (Quản trị viên).
-- - `employees` KHÔNG phải actor thứ 5. Đây là hồ sơ nhân sự dùng chung cho
--   ADVISOR / TECHNICIAN / ADMIN. Actor được xác định bằng `accounts.role`.
-- - CUSTOMER có hồ sơ trong `customers`; khách walk-in có thể có customer nhưng
--   `account_id = NULL`, tức chưa cần tài khoản online.
-- - TECHNICIAN ngoài `employees` còn có `technician_profiles` để lưu chuyên môn,
--   cấp độ và khả năng nhận việc.
--
-- LUỒNG NGHIỆP VỤ CHUẨN
-- 1) Khách đặt lịch: chọn xe + nhu cầu/dịch vụ/gói dự kiến + ngày/giờ.
--    Appointment chỉ giữ lịch TIẾP NHẬN; tuyệt đối KHÔNG đặt/giữ/trừ tồn phụ tùng.
-- 2) Khách đến garage: Cố vấn tiếp nhận, tạo Repair Order (Phiếu sửa chữa).
--    Walk-in được hỗ trợ: appointment_id = NULL.
-- 3) Cố vấn phân công KTV. KTV kiểm tra/checklist/chẩn đoán và đề xuất SERVICE/PART.
-- 4) Sau inspection, Cố vấn lập Quotation. Khách có thể duyệt toàn bộ, duyệt một
--    phần, hoặc từ chối. Chỉ hạng mục được duyệt mới được triển khai.
-- 5) KTV thực hiện công việc đã duyệt. Phụ tùng chỉ xuất kho khi THỰC TẾ sử dụng.
-- 6) Nếu thiếu phụ tùng sau tiếp nhận: Repair Order = WAITING_FOR_PARTS.
--    Nếu khách không muốn chờ: đóng phiếu (CLOSED) + close_reason; KHÔNG xóa phiếu.
-- 7) Hoàn thành -> Invoice -> Payment. Hai phương thức: DIRECT hoặc QR trên website.
--    QR chỉ lưu mã/tham chiếu giao dịch; không lưu ảnh QR trong DB.
-- 8) Bàn giao xe, lưu lịch sử; Review chỉ được tạo sau khi phiếu hoàn tất/bàn giao.
--
-- QUY TẮC GÓI BẢO DƯỠNG
-- - maintenance_package_services / maintenance_package_parts mô tả CẤU THÀNH DỰ KIẾN
--   của gói, phục vụ tư vấn/hiển thị. Việc khách chọn package ở Appointment KHÔNG
--   đồng nghĩa phụ tùng đã được đặt trước, giữ kho, xuất kho hay chắc chắn sẽ sử dụng.
-- - Phụ tùng/dịch vụ thực tế phải đi qua Inspection -> Recommendation -> Quotation
--   -> Customer approval -> Work/Used Parts.
--
-- QUY TẮC BÁO GIÁ
-- - quotations.status:
--   DRAFT              : đang soạn
--   SENT               : đã gửi khách
--   APPROVED           : tất cả hạng mục cần phản hồi đã được duyệt
--   PARTIALLY_APPROVED : khách chỉ duyệt một phần hạng mục
--   REJECTED           : khách từ chối toàn bộ
--   CANCELLED          : báo giá không còn hiệu lực
-- - quotation_items.is_approved: NULL=chưa phản hồi, TRUE=đồng ý, FALSE=từ chối.
-- - Backend chỉ tạo/cho thực hiện Work Item từ các quotation_item được duyệt.
--
-- NGUYÊN TẮC TRIỂN KHAI
-- - Database lưu dữ liệu; các ràng buộc liên bảng phức tạp phải kiểm tra ở Backend.
-- - Không tin giá/tổng tiền từ client; backend tính lại từ item/danh mục tại thời điểm lập.
-- - Không tự thêm actor/chi nhánh/quy trình đặt phụ tùng nếu chưa thay đổi nghiệp vụ.
-- - Khi tài liệu khác mâu thuẫn với DB V6, nhóm phải rà soát và thống nhất trước khi code.
-- ============================================================================

-- ============================================================
-- 1. TÀI KHOẢN - KHÁCH HÀNG - NHÂN SỰ NỘI BỘ
-- ============================================================

CREATE TABLE `accounts` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(30) NOT NULL COMMENT 'CUSTOMER, ADVISOR, TECHNICIAN, ADMIN',
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, LOCKED, INACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `customers` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `account_id` BIGINT UNIQUE NULL COMMENT 'NULL cho khách walk-in/chưa có tài khoản',
  `full_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(150) NULL,
  `address` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_customers_account`
    FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`)
);

-- Hồ sơ nhân sự nội bộ cho ADVISOR / TECHNICIAN / ADMIN.
-- Vai trò thực tế lấy từ accounts.role; không tạo actor EMPLOYEE riêng.
CREATE TABLE `employees` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `account_id` BIGINT NOT NULL UNIQUE,
  `full_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, INACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_employees_account`
    FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`)
);

CREATE TABLE `technician_profiles` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `employee_id` BIGINT NOT NULL UNIQUE,
  `specialty` VARCHAR(150) NULL COMMENT 'Ví dụ: Động cơ, Điện-điều hòa, Gầm-phanh-lốp',
  `level` VARCHAR(20) NOT NULL DEFAULT 'JUNIOR' COMMENT 'JUNIOR, SENIOR, EXPERT',
  `is_available` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_technician_profiles_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
);

-- ============================================================
-- 2. DANH MỤC Ô TÔ
-- ============================================================

CREATE TABLE `vehicle_brands` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, INACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `vehicle_models` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `brand_id` BIGINT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `body_type` VARCHAR(50) NULL COMMENT 'SEDAN, SUV, HATCHBACK, MPV, PICKUP, OTHER',
  `year_from` INT NULL,
  `year_to` INT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, INACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_vehicle_model` (`brand_id`, `name`, `year_from`, `year_to`),
  CONSTRAINT `fk_vehicle_models_brand`
    FOREIGN KEY (`brand_id`) REFERENCES `vehicle_brands` (`id`)
);

CREATE TABLE `vehicles` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `customer_id` BIGINT NOT NULL,
  `model_id` BIGINT NOT NULL,
  `variant` VARCHAR(100) NULL COMMENT 'Ví dụ: 1.5G CVT, 1.8V',
  `year` INT NULL,
  `license_plate` VARCHAR(20) NULL UNIQUE COMMENT 'Cho phép NULL với xe mới/chưa có biển',
  `vin` VARCHAR(50) NULL UNIQUE,
  `mileage` INT NULL,
  `note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_vehicles_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_vehicles_model`
    FOREIGN KEY (`model_id`) REFERENCES `vehicle_models` (`id`)
);

-- ============================================================
-- 3. DANH MỤC DỊCH VỤ - PHỤ TÙNG - TƯƠNG THÍCH
-- ============================================================

CREATE TABLE `services` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `base_price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `estimated_minutes` INT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, INACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `parts` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `sku` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `unit` VARCHAR(30) NOT NULL,
  `cost_price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `sell_price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, INACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `part_compatibilities` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `part_id` BIGINT NOT NULL,
  `vehicle_model_id` BIGINT NOT NULL,
  `year_from` INT NULL,
  `year_to` INT NULL,
  `note` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_part_compatibility`
    (`part_id`, `vehicle_model_id`, `year_from`, `year_to`),
  CONSTRAINT `fk_part_compatibilities_part`
    FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`),
  CONSTRAINT `fk_part_compatibilities_model`
    FOREIGN KEY (`vehicle_model_id`) REFERENCES `vehicle_models` (`id`)
);

-- ============================================================
-- 4. GÓI BẢO DƯỠNG ĐỊNH KỲ
-- ============================================================

CREATE TABLE `maintenance_packages` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `vehicle_model_id` BIGINT NULL COMMENT 'NULL nếu gói dùng chung',
  `name` VARCHAR(150) NOT NULL,
  `mileage_milestone` INT NULL COMMENT 'Ví dụ 10000 km',
  `month_milestone` INT NULL COMMENT 'Ví dụ 6 tháng',
  `description` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, INACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_maintenance_packages_model`
    FOREIGN KEY (`vehicle_model_id`) REFERENCES `vehicle_models` (`id`)
);

CREATE TABLE `maintenance_package_services` (
  `package_id` BIGINT NOT NULL,
  `service_id` BIGINT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`package_id`, `service_id`),
  CONSTRAINT `fk_package_services_package`
    FOREIGN KEY (`package_id`) REFERENCES `maintenance_packages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_package_services_service`
    FOREIGN KEY (`service_id`) REFERENCES `services` (`id`)
);

-- Cấu thành phụ tùng DỰ KIẾN của gói; KHÔNG reserve/giữ/trừ kho khi khách chọn gói.
CREATE TABLE `maintenance_package_parts` (
  `package_id` BIGINT NOT NULL,
  `part_id` BIGINT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`package_id`, `part_id`),
  CONSTRAINT `fk_package_parts_package`
    FOREIGN KEY (`package_id`) REFERENCES `maintenance_packages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_package_parts_part`
    FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`)
);

-- ============================================================
-- 5. LỊCH LÀM VIỆC - NGÀY NGHỈ - LỊCH KỸ THUẬT VIÊN
-- ============================================================

CREATE TABLE `working_hours` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `day_of_week` TINYINT NOT NULL COMMENT '0=Chủ nhật ... 6=Thứ 7',
  `open_time` TIME NOT NULL,
  `close_time` TIME NOT NULL,
  `max_slots` INT NOT NULL DEFAULT 5 COMMENT 'Số lịch tối đa đồng thời',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY `uk_working_day` (`day_of_week`)
);

CREATE TABLE `holidays` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `holiday_date` DATE NOT NULL,
  `reason` VARCHAR(255) NULL,
  UNIQUE KEY `uk_holiday_date` (`holiday_date`)
);

CREATE TABLE `technician_schedules` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `technician_id` BIGINT NOT NULL,
  `work_date` DATE NOT NULL,
  `shift_start` TIME NULL,
  `shift_end` TIME NULL,
  `is_off` BOOLEAN NOT NULL DEFAULT FALSE,
  `note` VARCHAR(255) NULL,
  UNIQUE KEY `uk_technician_schedule` (`technician_id`, `work_date`),
  CONSTRAINT `fk_technician_schedules_technician`
    FOREIGN KEY (`technician_id`) REFERENCES `technician_profiles` (`id`)
);

-- ============================================================
-- 6. TỒN KHO
-- ============================================================

CREATE TABLE `inventories` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `part_id` BIGINT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `min_quantity` INT NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_inventory_part` (`part_id`),
  CONSTRAINT `fk_inventories_part`
    FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`)
);

-- ============================================================
-- 7. ĐẶT LỊCH
-- Appointment chỉ đặt lịch tiếp nhận, KHÔNG giữ/đặt phụ tùng
-- ============================================================

CREATE TABLE `appointments` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `appointment_code` VARCHAR(30) NOT NULL UNIQUE,
  `customer_id` BIGINT NOT NULL,
  `vehicle_id` BIGINT NOT NULL,
  `appointment_date` DATE NOT NULL,
  `appointment_time` TIME NOT NULL,
  `request_type` VARCHAR(30) NOT NULL COMMENT 'DIAGNOSIS, REPAIR, MAINTENANCE, REPLACEMENT',
  `symptom_description` TEXT NULL,
  `note` TEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    COMMENT 'PENDING, CONFIRMED, CHECKED_IN, CANCELLED, NO_SHOW',
  `cancel_reason` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_appointments_datetime` (`appointment_date`, `appointment_time`),
  KEY `idx_appointments_status` (`status`),
  CONSTRAINT `fk_appointments_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_appointments_vehicle`
    FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`)
);

CREATE TABLE `appointment_services` (
  `appointment_id` BIGINT NOT NULL,
  `service_id` BIGINT NOT NULL,
  PRIMARY KEY (`appointment_id`, `service_id`),
  CONSTRAINT `fk_appointment_services_appointment`
    FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_appointment_services_service`
    FOREIGN KEY (`service_id`) REFERENCES `services` (`id`)
);

-- Gói khách DỰ KIẾN chọn khi đặt lịch (nếu có).
-- Chọn gói KHÔNG giữ phụ tùng, KHÔNG trừ kho; cấu thành thực tế xác nhận sau Inspection/Quotation.
CREATE TABLE `appointment_packages` (
  `appointment_id` BIGINT NOT NULL,
  `package_id` BIGINT NOT NULL,
  PRIMARY KEY (`appointment_id`, `package_id`),
  CONSTRAINT `fk_appointment_packages_appointment`
    FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_appointment_packages_package`
    FOREIGN KEY (`package_id`) REFERENCES `maintenance_packages` (`id`)
);

-- ============================================================
-- 8. PHIẾU TIẾP NHẬN / SERVICE ORDER
-- Hỗ trợ cả appointment và walk-in
-- ============================================================

CREATE TABLE `repair_orders` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `repair_order_code` VARCHAR(30) NOT NULL UNIQUE,
  `appointment_id` BIGINT NULL UNIQUE COMMENT 'NULL cho khách walk-in',
  `customer_id` BIGINT NOT NULL,
  `vehicle_id` BIGINT NOT NULL,
  `advisor_id` BIGINT NOT NULL,
  `mileage_received` INT NULL,
  `initial_condition` TEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'RECEIVED'
    COMMENT 'RECEIVED, INSPECTING, WAITING_APPROVAL, WAITING_FOR_PARTS, IN_PROGRESS, COMPLETED, HANDED_OVER, CLOSED',
  `received_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL,
  `handed_over_at` DATETIME NULL,
  `closed_at` DATETIME NULL,
  `close_reason` VARCHAR(50) NULL
    COMMENT 'CUSTOMER_REQUEST, PART_UNAVAILABLE, CUSTOMER_DECLINED_QUOTE, OTHER',
  `note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_repair_orders_status` (`status`),
  CONSTRAINT `fk_repair_orders_appointment`
    FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`),
  CONSTRAINT `fk_repair_orders_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_repair_orders_vehicle`
    FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`),
  CONSTRAINT `fk_repair_orders_advisor`
    FOREIGN KEY (`advisor_id`) REFERENCES `employees` (`id`)
);

CREATE TABLE `repair_order_status_history` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `repair_order_id` BIGINT NOT NULL,
  `status` VARCHAR(30) NOT NULL,
  `changed_by_account_id` BIGINT NULL,
  `note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_so_history_order`
    FOREIGN KEY (`repair_order_id`) REFERENCES `repair_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_so_history_account`
    FOREIGN KEY (`changed_by_account_id`) REFERENCES `accounts` (`id`)
);

CREATE TABLE `assignments` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `repair_order_id` BIGINT NOT NULL,
  `technician_id` BIGINT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED'
    COMMENT 'ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED',
  `note` TEXT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_assignment` (`repair_order_id`, `technician_id`),
  CONSTRAINT `fk_assignments_order`
    FOREIGN KEY (`repair_order_id`) REFERENCES `repair_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assignments_technician`
    FOREIGN KEY (`technician_id`) REFERENCES `technician_profiles` (`id`)
);

-- ============================================================
-- 9. KIỂM TRA / CHẨN ĐOÁN
-- ============================================================

CREATE TABLE `inspections` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `repair_order_id` BIGINT NOT NULL,
  `technician_id` BIGINT NOT NULL,
  `condition_description` TEXT NULL,
  `diagnosis` TEXT NULL,
  `inspected_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_inspections_order`
    FOREIGN KEY (`repair_order_id`) REFERENCES `repair_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inspections_technician`
    FOREIGN KEY (`technician_id`) REFERENCES `technician_profiles` (`id`)
);

CREATE TABLE `inspection_items` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `inspection_id` BIGINT NOT NULL,
  `item_name` VARCHAR(150) NOT NULL COMMENT 'Ví dụ: Má phanh trước, Dầu phanh, Lốp',
  `condition_status` VARCHAR(30) NULL COMMENT 'NORMAL, WARNING, NEEDS_SERVICE, NEEDS_REPLACEMENT',
  `condition_description` VARCHAR(255) NULL,
  `note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_inspection_items_inspection`
    FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE CASCADE
);

CREATE TABLE `inspection_recommendations` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `inspection_id` BIGINT NOT NULL,
  `item_type` VARCHAR(20) NOT NULL COMMENT 'SERVICE, PART',
  `service_id` BIGINT NULL,
  `part_id` BIGINT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_inspection_recommendations_inspection`
    FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inspection_recommendations_service`
    FOREIGN KEY (`service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `fk_inspection_recommendations_part`
    FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`)
);

-- ============================================================
-- 10. BÁO GIÁ
-- Có version để lưu lịch sử thay đổi báo giá
-- Hỗ trợ duyệt toàn bộ hoặc duyệt từng hạng mục; duyệt một phần => PARTIALLY_APPROVED
-- ============================================================

CREATE TABLE `quotations` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `quotation_code` VARCHAR(30) NOT NULL UNIQUE,
  `repair_order_id` BIGINT NOT NULL,
  `advisor_id` BIGINT NOT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
    COMMENT 'DRAFT, SENT, APPROVED, PARTIALLY_APPROVED, REJECTED, CANCELLED',
  `valid_until` DATETIME NULL,
  `customer_response_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_quotation_version` (`repair_order_id`, `version`),
  CONSTRAINT `fk_quotations_order`
    FOREIGN KEY (`repair_order_id`) REFERENCES `repair_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quotations_advisor`
    FOREIGN KEY (`advisor_id`) REFERENCES `employees` (`id`)
);

CREATE TABLE `quotation_items` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `quotation_id` BIGINT NOT NULL,
  `item_type` VARCHAR(20) NOT NULL COMMENT 'SERVICE, PART',
  `service_id` BIGINT NULL,
  `part_id` BIGINT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(12,2) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `is_approved` BOOLEAN NULL COMMENT 'NULL=chưa phản hồi; TRUE/FALSE nếu hỗ trợ duyệt từng dòng',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_quotation_items_quotation`
    FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quotation_items_service`
    FOREIGN KEY (`service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `fk_quotation_items_part`
    FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`)
);

-- ============================================================
-- 11. THỰC HIỆN CÔNG VIỆC - PHỤ TÙNG ĐÃ DÙNG
-- ============================================================

CREATE TABLE `work_items` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `repair_order_id` BIGINT NOT NULL,
  `service_id` BIGINT NULL,
  `technician_id` BIGINT NULL,
  `description` VARCHAR(255) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    COMMENT 'PENDING, IN_PROGRESS, COMPLETED, CANCELLED',
  `started_at` DATETIME NULL,
  `completed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_work_items_order`
    FOREIGN KEY (`repair_order_id`) REFERENCES `repair_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_work_items_service`
    FOREIGN KEY (`service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `fk_work_items_technician`
    FOREIGN KEY (`technician_id`) REFERENCES `technician_profiles` (`id`)
);

CREATE TABLE `used_parts` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `repair_order_id` BIGINT NOT NULL,
  `work_item_id` BIGINT NULL,
  `part_id` BIGINT NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(12,2) NOT NULL,
  `used_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_used_parts_order`
    FOREIGN KEY (`repair_order_id`) REFERENCES `repair_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_used_parts_work_item`
    FOREIGN KEY (`work_item_id`) REFERENCES `work_items` (`id`),
  CONSTRAINT `fk_used_parts_part`
    FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`)
);

CREATE TABLE `inventory_transactions` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `inventory_id` BIGINT NOT NULL,
  `repair_order_id` BIGINT NULL,
  `used_part_id` BIGINT NULL,
  `transaction_type` VARCHAR(20) NOT NULL COMMENT 'IN, OUT, ADJUSTMENT',
  `quantity` INT NOT NULL,
  `note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_inventory_transactions_inventory`
    FOREIGN KEY (`inventory_id`) REFERENCES `inventories` (`id`),
  CONSTRAINT `fk_inventory_transactions_order`
    FOREIGN KEY (`repair_order_id`) REFERENCES `repair_orders` (`id`),
  CONSTRAINT `fk_inventory_transactions_used_part`
    FOREIGN KEY (`used_part_id`) REFERENCES `used_parts` (`id`)
);

-- ============================================================
-- 12. HÓA ĐƠN - THANH TOÁN
-- Payment gắn Invoice, không gắn trực tiếp Quotation
-- ============================================================

CREATE TABLE `invoices` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `repair_order_id` BIGINT NOT NULL UNIQUE,
  `invoice_code` VARCHAR(30) NOT NULL UNIQUE,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'UNPAID'
    COMMENT 'UNPAID, PARTIALLY_PAID, PAID, CANCELLED',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_invoices_order`
    FOREIGN KEY (`repair_order_id`) REFERENCES `repair_orders` (`id`)
);

CREATE TABLE `invoice_items` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `invoice_id` BIGINT NOT NULL,
  `item_type` VARCHAR(20) NOT NULL COMMENT 'SERVICE, PART',
  `service_id` BIGINT NULL,
  `part_id` BIGINT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(12,2) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_invoice_items_invoice`
    FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invoice_items_service`
    FOREIGN KEY (`service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `fk_invoice_items_part`
    FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`)
);

CREATE TABLE `payments` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `invoice_id` BIGINT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_method` VARCHAR(30) NOT NULL COMMENT 'DIRECT, QR',
  `transaction_code` VARCHAR(100) NULL,
  `qr_reference` VARCHAR(255) NULL COMMENT 'Mã/tham chiếu thanh toán QR; không lưu ảnh QR',
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    COMMENT 'PENDING, SUCCESS, FAILED, CANCELLED',
  `paid_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_payments_invoice_status` (`invoice_id`, `status`),
  CONSTRAINT `fk_payments_invoice`
    FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`)
);

-- ============================================================
-- 13. ĐÁNH GIÁ - THÔNG BÁO
-- ============================================================

CREATE TABLE `reviews` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `repair_order_id` BIGINT NOT NULL UNIQUE,
  `customer_id` BIGINT NOT NULL,
  `overall_rating` TINYINT NOT NULL COMMENT '1-5',
  `advisor_rating` TINYINT NULL COMMENT '1-5',
  `technician_rating` TINYINT NULL COMMENT '1-5',
  `comment` TEXT NULL,
  `reply` TEXT NULL,
  `replied_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_reviews_order`
    FOREIGN KEY (`repair_order_id`) REFERENCES `repair_orders` (`id`),
  CONSTRAINT `fk_reviews_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
);

CREATE TABLE `notifications` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `account_id` BIGINT NOT NULL,
  `appointment_id` BIGINT NULL,
  `repair_order_id` BIGINT NULL,
  `title` VARCHAR(150) NOT NULL,
  `content` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL
    COMMENT 'APPOINTMENT_REMINDER, APPOINTMENT_CONFIRMED, APPOINTMENT_UPDATED, QUOTATION_READY, QUOTATION_UPDATED, SERVICE_IN_PROGRESS, WAITING_FOR_PARTS, SERVICE_COMPLETED, PAYMENT_SUCCESS, MAINTENANCE_DUE',
  `channel` VARCHAR(20) NOT NULL DEFAULT 'WEB' COMMENT 'WEB',
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, SENT, FAILED, READ',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sent_at` DATETIME NULL,
  `read_at` DATETIME NULL,
  CONSTRAINT `fk_notifications_account`
    FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_appointment`
    FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`),
  CONSTRAINT `fk_notifications_order`
    FOREIGN KEY (`repair_order_id`) REFERENCES `repair_orders` (`id`)
);

-- ============================================================
-- BUSINESS RULES THỰC THI Ở BACKEND/SERVICE LAYER
-- ============================================================
-- 1) Appointment chỉ đặt lịch tiếp nhận xe, không đặt/giữ phụ tùng.
-- 2) appointment_services / appointment_packages chỉ là nhu cầu dự kiến.
-- 3) Xe walk-in: tạo Customer (account_id có thể NULL) + Vehicle + Service Order,
--    appointment_id của Service Order = NULL.
-- 4) Sau Inspection mới xác định Recommendation và lập Quotation.
-- 5) Quotation APPROVED mới tạo/triển khai Work Item tương ứng.
-- 6) Thiếu phụ tùng sau tiếp nhận => Service Order = WAITING_FOR_PARTS.
-- 7) Khách dừng sửa/từ chối báo giá => Service Order = CLOSED + close_reason.
--    Không dùng CANCELLED cho Service Order đã tiếp nhận.
-- 8) inspection_recommendations / quotation_items / invoice_items:
--    item_type='SERVICE' => service_id NOT NULL, part_id NULL;
--    item_type='PART'    => part_id NOT NULL, service_id NULL.
-- 9) used_parts là phụ tùng thực tế đã dùng; OUT kho phải tạo inventory_transaction.
-- 10) Payment gắn Invoice. Một Invoice có thể có nhiều lần Payment attempt.
-- 11) Review chỉ được tạo cho Service Order đã hoàn tất/bàn giao theo rule ứng dụng.
-- 12) employees là hồ sơ nhân sự chung cho ADVISOR / TECHNICIAN / ADMIN.
--     Employee dùng làm advisor phải có account.role='ADVISOR';
--     technician_profile phải thuộc employee có account.role='TECHNICIAN';
--     Admin nội bộ phải có employee gắn account.role='ADMIN'.
-- 13) Vehicle phải thuộc đúng Customer khi tạo Appointment/Service Order.
-- 14) Part phải tương thích Vehicle Model/năm xe trước khi đề xuất/sử dụng (nếu có dữ liệu compatibility).
-- 15) Tổng tiền quotation/invoice phải được backend tính từ các item, không tin giá từ client.


-- ============================================================================
-- V6 - QUY TẮC BỔ SUNG BẮT BUỘC Ở BACKEND
-- ============================================================================
-- A) ACCOUNT / PROFILE
-- - account.role='CUSTOMER' nếu có hồ sơ online thì liên kết customers.account_id.
-- - account.role IN ('ADVISOR','TECHNICIAN','ADMIN') phải có đúng một employees row.
-- - Chỉ TECHNICIAN được có technician_profiles; ADVISOR/ADMIN không cần profile riêng.
--
-- B) APPOINTMENT
-- - PENDING -> CONFIRMED -> CHECKED_IN là luồng tiếp nhận thông thường.
-- - CANCELLED dùng khi lịch bị hủy trước khi tiếp nhận; NO_SHOW khi khách không đến.
-- - CHECKED_IN nghĩa là khách/xe đã được tiếp nhận; nghiệp vụ tiếp tục ở repair_orders.
-- - appointment_services / appointment_packages là nhu cầu ban đầu, không phải cam kết
--   sửa chữa và không phải nguồn để trừ tồn kho.
--
-- C) REPAIR ORDER
-- - Một appointment tối đa sinh một repair_order do appointment_id UNIQUE.
-- - Walk-in: appointment_id=NULL nhưng vẫn bắt buộc customer_id + vehicle_id.
-- - advisor_id phải trỏ employees có account.role='ADVISOR'.
-- - CLOSED là trạng thái đóng nghiệp vụ; nếu đóng sớm phải lưu close_reason phù hợp.
--
-- D) INSPECTION / QUOTATION / WORK
-- - technician_id ở assignments/inspections/work_items phải thuộc technician_profiles hợp lệ.
-- - Recommendation chỉ là đề xuất; chưa được phép thực hiện cho đến khi báo giá được duyệt.
-- - PARTIALLY_APPROVED khi có ít nhất một item TRUE và ít nhất một item FALSE.
-- - APPROVED khi toàn bộ item cần khách phản hồi đều TRUE.
-- - REJECTED khi toàn bộ item cần phản hồi đều FALSE (hoặc khách từ chối toàn bộ báo giá).
-- - Chỉ quotation_items.is_approved=TRUE mới được chuyển thành công việc/phụ tùng thực hiện.
--
-- E) INVENTORY
-- - Không có reserved_quantity vì hệ thống không giữ phụ tùng tại bước đặt lịch.
-- - Chỉ giảm tồn khi used_parts được xác nhận sử dụng; đồng thời tạo transaction_type='OUT'.
-- - IN dùng cho nhập kho; ADJUSTMENT dùng điều chỉnh có lý do/audit phù hợp.
--
-- F) PAYMENT
-- - DIRECT: thanh toán trực tiếp tại garage; hệ thống ghi nhận payment SUCCESS khi xác nhận.
-- - QR: website/backend tạo thông tin QR từ yêu cầu thanh toán; DB lưu transaction_code /
--   qr_reference và trạng thái. Không lưu binary/base64/ảnh QR.
-- - Chỉ khi tổng payment SUCCESS đáp ứng số tiền cần thanh toán mới chuyển invoice sang PAID.
--
-- G) DATA INTEGRITY
-- - vehicle.customer_id phải khớp customer_id của appointment/repair_order.
-- - service_id/part_id theo item_type phải tuân thủ rule SERVICE xor PART.
-- - part compatibility phải được kiểm tra trước khi đề xuất/sử dụng nếu có dữ liệu tương thích.
-- ============================================================================
