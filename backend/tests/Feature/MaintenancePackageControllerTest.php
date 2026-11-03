<?php

namespace Tests\Feature;

use App\Models\MaintenancePackage;
use App\Models\Part;
use App\Models\Service;
use App\Models\VehicleModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaintenancePackageControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_active_packages_for_model_and_shared_packages_in_mileage_order(): void
    {
        $vehicleModel = VehicleModel::factory()->create();
        $otherModel = VehicleModel::factory()->create();

        $sharedPackage = MaintenancePackage::factory()->create([
            'vehicle_model_id' => null,
            'mileage_milestone' => 5000,
        ]);
        $matchingPackage = MaintenancePackage::factory()->create([
            'vehicle_model_id' => $vehicleModel->id,
            'mileage_milestone' => 10000,
        ]);
        MaintenancePackage::factory()->create([
            'vehicle_model_id' => $otherModel->id,
            'mileage_milestone' => 15000,
        ]);
        MaintenancePackage::factory()->create([
            'vehicle_model_id' => null,
            'mileage_milestone' => 2000,
            'status' => 'INACTIVE',
        ]);

        $response = $this->getJson('/api/maintenance-packages?model_id=' . $vehicleModel->id)
            ->assertOk()
            ->assertJsonCount(2);

        $this->assertSame(
            [$sharedPackage->id, $matchingPackage->id],
            array_column($response->json(), 'id')
        );
    }

    public function test_index_includes_computed_price_for_services_and_parts(): void
    {
        $package = MaintenancePackage::factory()->create();
        $service = Service::factory()->create(['base_price' => 100]);
        $part = Part::query()->create([
            'sku' => 'PART-TEST-001',
            'name' => 'Lọc dầu',
            'unit' => 'cái',
            'sell_price' => 45,
        ]);

        $package->services()->attach($service->id, ['quantity' => 2]);
        $package->parts()->attach($part->id, ['quantity' => 3]);

        $this->getJson('/api/maintenance-packages')
            ->assertOk()
            ->assertJsonPath('0.id', $package->id)
            ->assertJsonPath('0.price', 335)
            ->assertJsonPath('0.estimated_price', 335)
            ->assertJsonPath('0.mileage_km', $package->mileage_milestone)
            ->assertJsonPath('0.services.0.pivot.quantity', 2)
            ->assertJsonPath('0.parts.0.pivot.quantity', 3);
    }

    public function test_show_returns_computed_fields_and_hides_inactive_packages(): void
    {
        $package = MaintenancePackage::factory()->create([
            'mileage_milestone' => 12000,
        ]);

        $this->getJson("/api/maintenance-packages/{$package->id}")
            ->assertOk()
            ->assertJsonPath('id', $package->id)
            ->assertJsonPath('price', 0)
            ->assertJsonPath('estimated_price', 0)
            ->assertJsonPath('mileage_km', 12000);

        $inactivePackage = MaintenancePackage::factory()->create([
            'status' => 'INACTIVE',
        ]);

        $this->getJson("/api/maintenance-packages/{$inactivePackage->id}")
            ->assertNotFound();
    }
}
