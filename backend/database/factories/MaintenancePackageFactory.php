<?php

namespace Database\Factories;

use App\Models\MaintenancePackage;
use Illuminate\Database\Eloquent\Factories\Factory;

class MaintenancePackageFactory extends Factory
{
    protected $model = MaintenancePackage::class;

    public function definition(): array
    {
        $milestones = [
            ['name' => 'Gói bảo dưỡng định kỳ 5.000 km', 'km' => 5000, 'month' => 3, 'desc' => 'Bảo dưỡng cấp nhỏ: Thay dầu động cơ, kiểm tra hệ thống phanh và gầm xe.'],
            ['name' => 'Gói bảo dưỡng định kỳ 10.000 km', 'km' => 10000, 'month' => 6, 'desc' => 'Bảo dưỡng cấp trung bình: Thay dầu, lọc nhớt, đảo lốp, vệ sinh lọc gió.'],
            ['name' => 'Gói bảo dưỡng định kỳ 20.000 km', 'km' => 20000, 'month' => 12, 'desc' => 'Bảo dưỡng cấp trung bình lớn: Thay dầu, lọc nhớt, lọc gió điều hòa, bảo dưỡng 4 phanh.'],
            ['name' => 'Gói bảo dưỡng định kỳ 40.000 km', 'km' => 40000, 'month' => 24, 'desc' => 'Bảo dưỡng cấp lớn: Thay dầu phanh, dầu trợ lực, nước làm mát, bugi, lọc nhiên liệu.'],
        ];

        $selected = fake()->randomElement($milestones);

        return [
            'vehicle_model_id'  => null, // Gói dùng chung cho các dòng xe
            'name'              => $selected['name'],
            'mileage_milestone' => $selected['km'],
            'month_milestone'   => $selected['month'],
            'description'       => $selected['desc'],
            'status'            => 'ACTIVE',
        ];
    }
}