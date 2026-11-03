<?php

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    public function definition(): array
    {
        return [
            'account_id' => null,
            'full_name' => fake()->name(),
            'phone' => fake()->numerify('09########'),
            'email' => fake()->safeEmail(),
            'address' => fake()->address(),
        ];
    }

    public function walkIn(): static
    {
        return $this->state(fn () => [
            'account_id' => null,
            'email' => null,
        ]);
    }
}