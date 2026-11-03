<?php

namespace Database\Factories;

use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

class ServiceFactory extends Factory
{
    protected $model = Service::class;

    public function definition(): array
    {
        return [
            'name' => fake()->randomElement([
                'Thay dầu động cơ', 'Thay lọc gió điều hòa', 'Bảo dưỡng phanh 4 bánh',
                'Cân bằng động & chỉnh độ chụm', 'Vệ sinh họng hút kim phun', 'Đảo lốp xe'
            ]),
            'category' => fake()->randomElement(['Bảo dưỡng định kỳ', 'Gầm - Phanh', 'Điện - Lạnh', 'Động cơ']),
            'description' => fake()->sentence(),
            'base_price' => fake()->randomElement([200000, 350000, 500000, 850000, 1200000]),
            'estimated_minutes' => fake()->randomElement([30, 45, 60, 90, 120]),
            'status' => 'ACTIVE',
        ];
    }
}