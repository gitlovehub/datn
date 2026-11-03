<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Part;
use App\Models\RepairOrder;
use App\Models\Service;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use App\Models\VehicleModel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class InspectionTestSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Đảm bảo có phụ tùng mẫu để test recommendation
        $part = Part::query()->firstOrCreate(
            ['sku' => 'PT-BRAKE-01'],
            [
                'name' => 'Bộ má phanh trước gốm Ceramic',
                'category' => 'Hệ thống phanh',
                'description' => 'Má phanh chịu nhiệt cao, giảm bụi',
                'unit' => 'Bộ',
                'cost_price' => 350000,
                'sell_price' => 550000,
                'status' => 'ACTIVE',
            ]
        );

        Part::query()->firstOrCreate(
            ['sku' => 'PT-FILTER-01'],
            [
                'name' => 'Lọc gió động cơ Denso',
                'category' => 'Bảo dưỡng định kỳ',
                'description' => 'Lọc gió tiêu chuẩn',
                'unit' => 'Cái',
                'cost_price' => 120000,
                'sell_price' => 220000,
                'status' => 'ACTIVE',
            ]
        );

        // 2. Đảm bảo KTV jane.beahan@example.org có profile KTV
        $techAccount = Account::query()->firstOrCreate(
            ['email' => 'jane.beahan@example.org'],
            [
                'password_hash' => Hash::make('password123'),
                'role' => Account::ROLE_TECHNICIAN,
                'status' => Account::STATUS_ACTIVE,
            ]
        );

        $techEmployee = Employee::query()->firstOrCreate(
            ['account_id' => $techAccount->id],
            [
                'full_name' => 'Jane Beahan',
                'phone' => '0912345678',
                'status' => 'ACTIVE',
            ]
        );

        TechnicianProfile::query()->firstOrCreate(
            ['employee_id' => $techEmployee->id],
            [
                'specialty' => 'Gầm & Phanh',
                'level' => 'SENIOR',
                'is_available' => true,
            ]
        );

        // 3. Đảm bảo có Advisor mẫu
        $advisorAccount = Account::query()->firstOrCreate(
            ['email' => 'advisor.test@carservice.test'],
            [
                'password_hash' => Hash::make('password123'),
                'role' => Account::ROLE_ADVISOR,
                'status' => Account::STATUS_ACTIVE,
            ]
        );

        $advisor = Employee::query()->firstOrCreate(
            ['account_id' => $advisorAccount->id],
            [
                'full_name' => 'Cố vấn Dịch vụ Test',
                'phone' => '0987654321',
                'status' => 'ACTIVE',
            ]
        );

        // 4. Đảm bảo có Khách hàng & Xe mẫu
        $customerAccount = Account::query()->firstOrCreate(
            ['email' => 'customer.test@carservice.test'],
            [
                'password_hash' => Hash::make('password123'),
                'role' => Account::ROLE_CUSTOMER,
                'status' => Account::STATUS_ACTIVE,
            ]
        );

        $customer = Customer::query()->firstOrCreate(
            ['account_id' => $customerAccount->id],
            [
                'full_name' => 'Khách hàng Nguyễn Văn Test',
                'phone' => '0933333333',
                'email' => 'customer.test@carservice.test',
            ]
        );

        $model = VehicleModel::first() ?? VehicleModel::create([
            'name' => 'Vios',
            'brand_id' => 1,
            'year_from' => 2021,
            'status' => 'ACTIVE',
        ]);

        $vehicle = Vehicle::query()->firstOrCreate(
            ['license_plate' => '30A-999.99'],
            [
                'customer_id' => $customer->id,
                'model_id' => $model->id,
                'variant' => '1.5G CVT',
                'year' => 2022,
                'vin' => 'VIN1234567890TEST',
                'mileage' => 35000,
            ]
        );

        // 5. Tạo sẵn 1 Lệnh sửa chữa (RepairOrder) ở trạng thái RECEIVED để test Inspection
        $ro = RepairOrder::query()->firstOrCreate(
            ['repair_order_code' => 'RO-TEST-INSPECTION'],
            [
                'customer_id' => $customer->id,
                'vehicle_id' => $vehicle->id,
                'advisor_id' => $advisor->id,
                'mileage_received' => 35000,
                'initial_condition' => 'Khách báo phanh kêu rít, xe rung lắc khi chạy nhanh',
                'status' => RepairOrder::RECEIVED,
                'received_at' => now(),
                'note' => 'Cần KTV kiểm tra kỹ hệ thống phanh và lốp',
            ]
        );

        $this->command?->info("Tạo dữ liệu test thành công!");
        $this->command?->info("Repair Order ID để test Postman: {$ro->id} ({$ro->repair_order_code})");
        $this->command?->info("Part ID: {$part->id}");
    }
}
