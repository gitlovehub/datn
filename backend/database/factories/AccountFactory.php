<?php

namespace Database\Factories;

use App\Models\Account;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

class AccountFactory extends Factory
{
    protected $model = Account::class;

    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'password_hash' => Hash::make('password123'),
            'role' => 'CUSTOMER',
            'status' => 'ACTIVE',
        ];
    }

    public function customer(): static
    {
        return $this->state(fn () => ['role' => 'CUSTOMER']);
    }

    public function advisor(): static
    {
        return $this->state(fn () => ['role' => 'ADVISOR']);
    }

    public function technician(): static
    {
        return $this->state(fn () => ['role' => 'TECHNICIAN']);
    }

    public function admin(): static
    {
        return $this->state(fn () => ['role' => 'ADMIN']);
    }
}