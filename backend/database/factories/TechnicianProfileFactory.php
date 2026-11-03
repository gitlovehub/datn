<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\TechnicianProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

class TechnicianProfileFactory extends Factory
{
    protected $model = TechnicianProfile::class;

    public function definition(): array
    {
        return [
            'employee_id' => Employee::factory()->technicianRole(),
            'specialty' => fake()->randomElement(['Động cơ', 'Điện - Điều hòa', 'Gầm - Phanh - Lốp', 'Hộp số']),
            'level' => fake()->randomElement(['JUNIOR', 'SENIOR', 'EXPERT']),
            'is_available' => true,
        ];
    }
}