<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\MaintenancePackage;
use App\Models\Part;
use App\Models\Service;
use App\Models\VehicleModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminMaintenancePackageControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_package_routes_require_an_admin_account(): void
    {
        $this->getJson('/api/admin/maintenance-packages')->assertUnauthorized();

        $advisor = Account::factory()->advisor()->create();
        $token = $advisor->createToken('package-test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/admin/maintenance-packages')
            ->assertForbidden();
    }

    public function test_admin_can_create_list_and_show_package_with_computed_price(): void
    {
        $token = $this->adminToken();
        $vehicleModel = VehicleModel::factory()->create();
        $service = Service::factory()->create(['base_price' => 100]);
        $part = $this->createPart('PART-CRUD-001', 45);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/admin/maintenance-packages', [
                'vehicle_model_id' => $vehicleModel->id,
                'name' => 'Gói 10.000 km',
                'mileage_milestone' => 10000,
                'month_milestone' => 6,
                'services' => [
                    ['service_id' => $service->id, 'quantity' => 2],
                ],
                'parts' => [
                    ['part_id' => $part->id, 'quantity' => 3],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Gói 10.000 km')
            ->assertJsonPath('data.status', 'ACTIVE')
            ->assertJsonPath('data.price', 335)
            ->assertJsonPath('data.services.0.pivot.quantity', 2)
            ->assertJsonPath('data.parts.0.pivot.quantity', 3);

        $package = MaintenancePackage::query()->firstOrFail();

        $this->getJson('/api/admin/maintenance-packages?vehicle_model_id=' . $vehicleModel->id . '&status=ACTIVE&search=10.000')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id', $package->id)
            ->assertJsonPath('data.data.0.price', 335);

        $this->getJson('/api/admin/maintenance-packages/' . $package->id)
            ->assertOk()
            ->assertJsonPath('data.id', $package->id)
            ->assertJsonPath('data.estimated_price', 335);
    }

    public function test_update_syncs_only_sent_collections_and_empty_array_clears_collection(): void
    {
        $token = $this->adminToken();
        $package = MaintenancePackage::factory()->create(['name' => 'Tên trước']);
        $existingService = Service::factory()->create();
        $newService = Service::factory()->create();
        $package->services()->attach($existingService->id, ['quantity' => 2]);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson('/api/admin/maintenance-packages/' . $package->id, [
                'name' => 'Tên sau',
                'services' => [
                    ['service_id' => $newService->id],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Tên sau')
            ->assertJsonPath('data.services.0.id', $newService->id)
            ->assertJsonPath('data.services.0.pivot.quantity', 1);

        $this->assertDatabaseMissing('maintenance_package_services', [
            'package_id' => $package->id,
            'service_id' => $existingService->id,
        ]);

        $this->patchJson('/api/admin/maintenance-packages/' . $package->id, [
            'description' => 'Mô tả cập nhật',
        ])
            ->assertOk()
            ->assertJsonPath('data.description', 'Mô tả cập nhật')
            ->assertJsonPath('data.services.0.id', $newService->id);

        $this->putJson('/api/admin/maintenance-packages/' . $package->id . '/services', [
            'services' => [],
        ])
            ->assertOk()
            ->assertJsonCount(0, 'data.services');

        $this->assertDatabaseMissing('maintenance_package_services', [
            'package_id' => $package->id,
            'service_id' => $newService->id,
        ]);
    }

    public function test_admin_can_sync_parts_and_soft_delete_package(): void
    {
        $token = $this->adminToken();
        $package = MaintenancePackage::factory()->create();
        $part = $this->createPart('PART-CRUD-002', 80);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/admin/maintenance-packages/' . $package->id . '/parts', [
                'parts' => [
                    ['part_id' => $part->id, 'quantity' => 2],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.parts.0.id', $part->id)
            ->assertJsonPath('data.parts.0.pivot.quantity', 2)
            ->assertJsonPath('data.price', 160);

        $this->deleteJson('/api/admin/maintenance-packages/' . $package->id)
            ->assertOk()
            ->assertJsonPath('data.status', 'INACTIVE');

        $this->assertDatabaseHas('maintenance_packages', [
            'id' => $package->id,
            'status' => 'INACTIVE',
        ]);
    }

    public function test_invalid_or_duplicate_package_items_are_rejected(): void
    {
        $token = $this->adminToken();
        $service = Service::factory()->create();

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/admin/maintenance-packages', [
                'name' => 'Gói không hợp lệ',
                'mileage_milestone' => 0,
                'services' => [
                    ['service_id' => $service->id, 'quantity' => 1],
                    ['service_id' => $service->id, 'quantity' => 2],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'mileage_milestone',
                'services.1.service_id',
            ]);
    }

    private function adminToken(): string
    {
        $admin = Account::factory()->admin()->create();

        return $admin->createToken('package-test')->plainTextToken;
    }

    private function createPart(string $sku, int $sellPrice): Part
    {
        return Part::query()->create([
            'sku' => $sku,
            'name' => 'Phụ tùng ' . $sku,
            'unit' => 'cái',
            'sell_price' => $sellPrice,
            'status' => 'ACTIVE',
        ]);
    }
}
