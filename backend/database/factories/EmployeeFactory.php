<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory()->advisor(),
            'full_name' => fake()->name(),
            'phone' => fake()->numerify('09########'),
            'status' => 'ACTIVE',
        ];
    }

    public function technicianRole(): static
    {
        return $this->state(fn () => [
            'account_id' => Account::factory()->technician(),
        ]);
    }

    public function adminRole(): static
    {
        return $this->state(fn () => [
            'account_id' => Account::factory()->admin(),
        ]);
    }
}