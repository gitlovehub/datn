<?php

namespace Tests\Feature;

use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Database\Seeders\RealDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RealDataSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_vehicle_models_using_the_current_schema_and_is_idempotent(): void
    {
        $seeder = new RealDataSeeder;
        $seeder->run();

        $firstModelCount = VehicleModel::query()->count();
        $firstBrandCount = VehicleBrand::query()->count();

        $seeder->run();

        $this->assertSame(27, $firstModelCount);
        $this->assertSame(6, $firstBrandCount);
        $this->assertSame($firstModelCount, VehicleModel::query()->count());
        $this->assertSame($firstBrandCount, VehicleBrand::query()->count());

        $vios = VehicleModel::query()
            ->where('name', 'Vios')
            ->whereHas('brand', fn ($query) => $query->where('name', 'Toyota'))
            ->firstOrFail();

        $this->assertSame(2020, $vios->year_from);
        $this->assertNull($vios->year_to);
        $this->assertSame('ACTIVE', $vios->status);
    }
}
