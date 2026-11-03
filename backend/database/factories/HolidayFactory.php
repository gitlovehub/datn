<?php

namespace Database\Factories;

use App\Models\Holiday;
use Illuminate\Database\Eloquent\Factories\Factory;

class HolidayFactory extends Factory
{
    protected $model = Holiday::class;

    public function definition(): array
    {
        return [
            'holiday_date' => fake()->unique()->dateTimeBetween('now', '+1 year')->format('Y-m-d'),
            'reason'       => fake()->randomElement(['Nghỉ lễ Quốc Khánh', 'Nghỉ Tết Dương Lịch', 'Bảo trì trang thiết bị Garage', 'Nghỉ lễ Giỗ Tổ']),
        ];
    }
}