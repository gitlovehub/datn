<?php

namespace Database\Factories;

use App\Models\VehicleBrand;
use Illuminate\Database\Eloquent\Factories\Factory;

class VehicleBrandFactory extends Factory
{
    protected $model = VehicleBrand::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement(['Toyota', 'Honda', 'Hyundai', 'Mazda', 'Ford', 'Kia', 'BMW', 'Mercedes-Benz']),
            'status' => 'ACTIVE',
        ];
    }
}