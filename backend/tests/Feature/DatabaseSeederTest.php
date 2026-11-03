<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Part;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_can_run_again_without_duplicating_data(): void
    {
        $this->seed();
        $counts = [Account::query()->count(), Customer::query()->count(), Part::query()->count()];

        $this->seed();

        $this->assertSame($counts, [Account::query()->count(), Customer::query()->count(), Part::query()->count()]);
        $this->assertDatabaseHas('working_hours', ['day_of_week' => 1, 'is_active' => true]);
    }
}
