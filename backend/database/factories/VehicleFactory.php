<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Vehicle;
use App\Models\VehicleModel;
use Illuminate\Database\Eloquent\Factories\Factory;

class VehicleFactory extends Factory
{
    protected $model = Vehicle::class;

    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'model_id' => VehicleModel::factory(),
            'variant' => fake()->randomElement(['1.5 AT', '2.0 Turbo', '2.5G CVT', 'Premium', 'Standard']),
            'year' => fake()->numberBetween(2018, 2024),
            'license_plate' => fake()->unique()->numerify('##?-###.##'),
            'vin' => strtoupper(fake()->unique()->bothify('??#????#?##??????')),
            'mileage' => fake()->numberBetween(5000, 120000),
            'note' => fake()->optional()->sentence(),
        ];
    }
}