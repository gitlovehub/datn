<?php

namespace Database\Factories;

use App\Models\WorkingHour;
use Illuminate\Database\Eloquent\Factories\Factory;

class WorkingHourFactory extends Factory
{
    protected $model = WorkingHour::class;

    public function definition(): array
    {
        return [
            'day_of_week' => fake()->unique()->numberBetween(0, 6),
            'open_time'   => '08:00:00',
            'close_time'  => '17:30:00',
            'max_slots'   => 5,
            'is_active'   => true,
        ];
    }
}