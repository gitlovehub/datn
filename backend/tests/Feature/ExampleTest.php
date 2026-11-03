<?php

namespace Tests\Feature;

use App\Exceptions\InvalidStatusTransitionException;
use App\Models\Account;
use App\Models\Assignment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\RepairOrder;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A basic test example.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }

    public function test_invalid_status_transition_returns_a_json_422_response(): void
    {
        Route::get('/api/test/invalid-status-transition', function () {
            throw InvalidStatusTransitionException::because('Chuyển trạng thái không hợp lệ.');
        });

        $this->getJson('/api/test/invalid-status-transition')
            ->assertUnprocessable()
            ->assertExactJson(['message' => 'Chuyển trạng thái không hợp lệ.']);
    }

    public function test_technician_can_only_view_assigned_repair_orders(): void
    {
        $technicianAccount = Account::factory()->technician()->create();
        $technicianEmployee = Employee::query()->create([
            'account_id' => $technicianAccount->id,
            'full_name' => 'Kỹ thuật viên A',
            'phone' => '0900000001',
            'status' => 'ACTIVE',
        ]);
        $technicianProfile = TechnicianProfile::query()->create([
            'employee_id' => $technicianEmployee->id,
            'specialty' => 'Engine',
            'level' => 'SENIOR',
            'is_available' => true,
        ]);

        $advisorAccount = Account::factory()->advisor()->create();
        $advisorEmployee = Employee::query()->create([
            'account_id' => $advisorAccount->id,
            'full_name' => 'Cố vấn A',
            'phone' => '0900000002',
            'status' => 'ACTIVE',
        ]);

        $assignedCustomer = Customer::factory()->create();
        $assignedVehicle = Vehicle::factory()->create([
            'customer_id' => $assignedCustomer->id,
        ]);

        $otherCustomer = Customer::factory()->create();
        $otherVehicle = Vehicle::factory()->create([
            'customer_id' => $otherCustomer->id,
        ]);

        $assignedRepairOrder = RepairOrder::query()->create([
            'repair_order_code' => 'RO-ASSIGNED',
            'customer_id' => $assignedCustomer->id,
            'vehicle_id' => $assignedVehicle->id,
            'advisor_id' => $advisorEmployee->id,
            'status' => RepairOrder::RECEIVED,
            'received_at' => now(),
        ]);

        $otherRepairOrder = RepairOrder::query()->create([
            'repair_order_code' => 'RO-OTHER',
            'customer_id' => $otherCustomer->id,
            'vehicle_id' => $otherVehicle->id,
            'advisor_id' => $advisorEmployee->id,
            'status' => RepairOrder::RECEIVED,
            'received_at' => now(),
        ]);

        Assignment::query()->create([
            'repair_order_id' => $assignedRepairOrder->id,
            'technician_id' => $technicianProfile->id,
            'status' => Assignment::ASSIGNED,
            'assigned_at' => now(),
        ]);

        $token = $technicianAccount->createToken('tech-client')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/repair-orders');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($assignedRepairOrder->id, $ids);
        $this->assertNotContains($otherRepairOrder->id, $ids);
    }
}
