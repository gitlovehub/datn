<?php

namespace Database\Factories;

use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Database\Eloquent\Factories\Factory;

class VehicleModelFactory extends Factory
{
    protected $model = VehicleModel::class;

    public function definition(): array
    {
        return [
            'brand_id' => VehicleBrand::factory(),
            'name' => fake()->word(),
            'body_type' => fake()->randomElement(['SEDAN', 'SUV', 'HATCHBACK', 'MPV', 'PICKUP']),
            'year_from' => fake()->numberBetween(2015, 2020),
            'year_to' => fake()->numberBetween(2021, 2025),
            'status' => 'ACTIVE',
        ];
    }
}