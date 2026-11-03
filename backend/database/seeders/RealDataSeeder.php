<?php

namespace Database\Seeders;

use App\Models\MaintenancePackage;
use App\Models\Service;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RealDataSeeder extends Seeder
{
    public function run(): void
    {
        // Hãng xe và Dòng xe phổ biến
        $brands = [
            'Toyota' => ['Vios', 'Camry', 'Corolla Altis', 'Raize', 'Corolla Cross', 'Fortuner', 'Innova Cross', 'Hilux'],
            'Honda' => ['City', 'Civic', 'CR-V', 'HR-V'],
            'Mazda' => ['Mazda 3', 'Mazda 6', 'CX-5', 'CX-8'],
            'Hyundai' => ['Accent', 'Elantra', 'Tucson', 'Santa Fe'],
            'Ford' => ['Ranger', 'Everest', 'Territory'],
            'VinFast' => ['Fadil', 'VF e34', 'VF 8', 'VF 9'],
        ];

        foreach ($brands as $brandName => $models) {
            $brand = VehicleBrand::firstOrCreate(['name' => $brandName], ['status' => 'ACTIVE']);
            foreach ($models as $modelName) {
                VehicleModel::firstOrCreate([
                    'brand_id' => $brand->id,
                    'name' => $modelName,
                ], [
                    'year_from' => 2020,
                    'year_to' => null,
                    'status' => 'ACTIVE',
                ]);
            }
        }

        // Dịch vụ
        $servicesData = [
            ['name' => 'Bảo dưỡng định kỳ', 'category' => 'Bảo dưỡng định kỳ', 'base_price' => 500000, 'estimated_minutes' => 60],
            ['name' => 'Kiểm tra tổng quát', 'category' => 'Kiểm tra tổng quát', 'base_price' => 300000, 'estimated_minutes' => 60],
            ['name' => 'Thay dầu động cơ', 'category' => 'Bảo dưỡng định kỳ', 'base_price' => 350000, 'estimated_minutes' => 30],
            ['name' => 'Kiểm tra phanh', 'category' => 'Gầm - Phanh', 'base_price' => 300000, 'estimated_minutes' => 45],
            ['name' => 'Kiểm tra điều hòa', 'category' => 'Điện - Điện lạnh', 'base_price' => 400000, 'estimated_minutes' => 60],
            ['name' => 'Kiểm tra động cơ', 'category' => 'Động cơ - Hộp số', 'base_price' => 600000, 'estimated_minutes' => 90],
            ['name' => 'Chăm sóc xe', 'category' => 'Chăm sóc xe - Detailing', 'base_price' => 300000, 'estimated_minutes' => 120],
        ];

        $services = [];
        foreach ($servicesData as $svc) {
            $services[] = Service::updateOrCreate(['name' => $svc['name']], [
                'category' => $svc['category'],
                'base_price' => $svc['base_price'],
                'estimated_minutes' => $svc['estimated_minutes'],
                'status' => 'ACTIVE',
            ]);
        }

        // Gói bảo dưỡng
        $packagesData = [
            ['name' => 'Bảo dưỡng cấp 1 (5.000km)', 'mileage_milestone' => 5000, 'month_milestone' => 6, 'desc' => 'Gói bảo dưỡng cơ bản sau 5.000km'],
            ['name' => 'Bảo dưỡng cấp 2 (10.000km)', 'mileage_milestone' => 10000, 'month_milestone' => 12, 'desc' => 'Bảo dưỡng định kỳ 10.000km'],
            ['name' => 'Bảo dưỡng cấp 3 (20.000km)', 'mileage_milestone' => 20000, 'month_milestone' => 24, 'desc' => 'Bảo dưỡng chuyên sâu 20.000km'],
            ['name' => 'Bảo dưỡng lớn (40.000km)', 'mileage_milestone' => 40000, 'month_milestone' => 48, 'desc' => 'Thay thế toàn diện 40.000km'],
        ];

        foreach ($packagesData as $pkgData) {
            $pkg = MaintenancePackage::updateOrCreate(['name' => $pkgData['name']], [
                'mileage_milestone' => $pkgData['mileage_milestone'],
                'month_milestone' => $pkgData['month_milestone'],
                'description' => $pkgData['desc'],
                'status' => 'ACTIVE',
            ]);

            // Link services to package
            if ($pkg->wasRecentlyCreated) {
                // Attach random services
                $randomServices = array_rand($services, 3);
                foreach ($randomServices as $svcKey) {
                    DB::table('maintenance_package_services')->insertOrIgnore([
                        'package_id' => $pkg->id,
                        'service_id' => $services[$svcKey]->id,
                        'quantity' => 1,
                    ]);
                }
            }
        }
    }
}
