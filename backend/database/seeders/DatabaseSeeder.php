<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\MaintenancePackage;
use App\Models\Service;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use App\Models\VehicleModel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RealDataSeeder::class);
        $this->call(DemoAccountsSeeder::class);
        $this->call(PartInventorySeeder::class);

        // Dữ liệu mẫu ngẫu nhiên (factory) chỉ tạo ở lần chạy đầu để `db:seed` chạy lại không lỗi trùng email.
        if (Account::query()->where('email', 'admin@carservice.vn')->exists()) {
            $this->command?->info('Đã có dữ liệu mẫu, bỏ qua phần tạo ngẫu nhiên.');
        } else {
            $this->seedSampleData();
        }

        // 8. GIỜ LÀM VIỆC: day_of_week theo Carbon (0 = Chủ nhật ... 6 = Thứ bảy), khớp với API đặt lịch
        $this->call(WorkingHoursSeeder::class);

        // 9. CẤU HÌNH NGÀY NGHỈ LỄ CỦA GARAGE
        Holiday::firstOrCreate(
            ['holiday_date' => '2026-01-01'],
            ['reason' => 'Tết Dương Lịch 2026']
        );
        Holiday::firstOrCreate(
            ['holiday_date' => '2026-04-30'],
            ['reason' => 'Ngày Giải phóng miền Nam']
        );
        Holiday::firstOrCreate(
            ['holiday_date' => '2026-05-01'],
            ['reason' => 'Ngày Quốc tế Lao động']
        );
        Holiday::firstOrCreate(
            ['holiday_date' => '2026-09-02'],
            ['reason' => 'Lễ Quốc khánh 2/9']
        );
    }

    /**
     * Tài khoản admin mẫu, nhân sự, khách hàng, xe, dịch vụ và gói bảo dưỡng ngẫu nhiên.
     */
    private function seedSampleData(): void
    {
        $defaultPassword = Hash::make('password123');

        // 1. TÀI KHOẢN ADMIN MẪU
        $adminAccount = Account::factory()->admin()->create([
            'email' => 'admin@carservice.vn',
            'password_hash' => $defaultPassword,
        ]);

        Employee::factory()->create([
            'account_id' => $adminAccount->id,
            'full_name' => 'Trần Văn Quản Trị',
            'phone' => '0901000001',
        ]);

        // 2. NHÂN SỰ NỘI BỘ (Advisor & Technician)
        Employee::factory()->count(3)->create();
        TechnicianProfile::factory()->count(5)->create();

        // 3. DÙNG LẠI HÃNG XE VÀ DÒNG XE TỪ RealDataSeeder
        $allModels = VehicleModel::all();

        // 4. MASTER DATA: DỊCH VỤ GARAGE
        $allServices = Service::factory()->count(8)->create();

        // 5. KHÁCH HÀNG ONLINE & XE CỦA HỌ
        Customer::factory()->count(10)->create()->each(function ($customer) use ($allModels) {
            Vehicle::factory()->count(rand(1, 2))->create([
                'customer_id' => $customer->id,
                'model_id' => $allModels->random()->id,
            ]);
        });

        // 6. KHÁCH HÀNG WALK-IN (VÃNG LAI KHÔNG CÓ ACCOUNT)
        Customer::factory()->walkIn()->count(5)->create()->each(function ($customer) use ($allModels) {
            Vehicle::factory()->create([
                'customer_id' => $customer->id,
                'model_id' => $allModels->random()->id,
            ]);
        });

        // 7. GÓI BẢO DƯỠNG ĐỊNH KỲ & DỊCH VỤ ĐI KÈM
        $packages = MaintenancePackage::factory()->count(4)->create();
        foreach ($packages as $package) {
            // Gắn ngẫu nhiên từ 2 đến 4 dịch vụ vào từng gói
            $attachServices = $allServices->random(rand(2, 4));
            foreach ($attachServices as $service) {
                DB::table('maintenance_package_services')->insertOrIgnore([
                    'package_id' => $package->id,
                    'service_id' => $service->id,
                    'quantity' => 1,
                ]);
            }
        }
    }
}
