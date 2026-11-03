<?php

namespace Tests\Feature;

use App\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_only_active_services_and_applies_filters(): void
    {
        Service::factory()->create([
            'name' => 'Bảo dưỡng phanh',
            'category' => 'Bảo dưỡng',
            'status' => 'ACTIVE',
        ]);
        Service::factory()->create([
            'name' => 'Thay dầu',
            'category' => 'Bảo dưỡng',
            'status' => 'ACTIVE',
        ]);
        Service::factory()->create([
            'name' => 'Bảo dưỡng máy lạnh',
            'category' => 'Điện - Lạnh',
            'status' => 'ACTIVE',
        ]);
        Service::factory()->create([
            'name' => 'Bảo dưỡng cũ',
            'category' => 'Bảo dưỡng',
            'status' => 'INACTIVE',
        ]);

        $this->getJson('/api/services?category=B%E1%BA%A3o+d%C6%B0%E1%BB%A1ng&search=B%E1%BA%A3o+d%C6%B0%E1%BB%A1ng')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Bảo dưỡng phanh');
    }

    public function test_index_treats_all_as_no_category_filter_and_orders_results(): void
    {
        Service::factory()->create([
            'name' => 'Thay dầu',
            'category' => 'Bảo dưỡng',
        ]);
        Service::factory()->create([
            'name' => 'Kiểm tra điện',
            'category' => 'Điện - Lạnh',
        ]);

        $this->getJson('/api/services?category=T%E1%BA%A5t+c%E1%BA%A3')
            ->assertOk()
            ->assertJsonPath('0.category', 'Bảo dưỡng')
            ->assertJsonPath('1.category', 'Điện - Lạnh');
    }

    public function test_show_hides_inactive_services(): void
    {
        $service = Service::factory()->create(['status' => 'INACTIVE']);

        $this->getJson("/api/services/{$service->id}")
            ->assertNotFound();
    }
}
