<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\RepairOrder;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssignTechnicianFlowTest extends TestCase
{
    use RefreshDatabase;

    private function createAdvisor(): Account
    {
        $account = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $account->id]);

        return $account;
    }

    private function createTechnician(): TechnicianProfile
    {
        $account = Account::factory()->technician()->create();
        $employee = Employee::factory()->create(['account_id' => $account->id]);

        return TechnicianProfile::factory()->create(['employee_id' => $employee->id]);
    }

    private function createRepairOrder(string $status = RepairOrder::RECEIVED): RepairOrder
    {
        $customer = Customer::factory()->create();

        return RepairOrder::query()->create([
            'repair_order_code' => 'RO-'.uniqid(),
            'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'advisor_id' => Employee::factory()->create()->id,
            'status' => $status,
            'received_at' => now(),
        ]);
    }

    public function test_advisor_lists_working_technicians_even_without_login(): void
    {
        $technician = $this->createTechnician();
        // KTV không cần đăng nhập: khóa tài khoản vẫn được giao việc; nghỉ việc (nhân viên INACTIVE) thì không.
        $loginLocked = $this->createTechnician();
        $loginLocked->employee->account->update(['status' => Account::STATUS_LOCKED]);
        $resigned = $this->createTechnician();
        $resigned->employee->update(['status' => 'INACTIVE']);

        $this->actingAs($this->createAdvisor())
            ->getJson('/api/technicians')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonMissing(['id' => $resigned->id])
            ->assertJsonPath('0.active_assignments_count', 0);

        $this->assertNotNull($technician);
    }

    public function test_customer_cannot_list_technicians(): void
    {
        $this->actingAs(Account::factory()->create())
            ->getJson('/api/technicians')
            ->assertForbidden();
    }

    public function test_assigning_moves_order_to_inspecting_and_rejects_duplicates(): void
    {
        $advisor = $this->createAdvisor();
        $technician = $this->createTechnician();
        $repairOrder = $this->createRepairOrder();
        $url = "/api/repair-orders/{$repairOrder->id}/assign-technician";

        $this->actingAs($advisor)->postJson($url, ['technician_id' => $technician->id])->assertCreated();
        $this->assertSame(RepairOrder::INSPECTING, $repairOrder->fresh()->status);

        $this->actingAs($advisor)->postJson($url, ['technician_id' => $technician->id])->assertUnprocessable();
        $this->assertDatabaseCount('assignments', 1);
    }

    public function test_cannot_assign_technician_to_finished_order(): void
    {
        $repairOrder = $this->createRepairOrder(RepairOrder::CLOSED);

        $this->actingAs($this->createAdvisor())
            ->postJson("/api/repair-orders/{$repairOrder->id}/assign-technician", ['technician_id' => $this->createTechnician()->id])
            ->assertUnprocessable();
    }

    public function test_closing_order_releases_its_technician(): void
    {
        $advisor = $this->createAdvisor();
        $technician = $this->createTechnician();
        $repairOrder = $this->createRepairOrder();
        $this->actingAs($advisor)->postJson("/api/repair-orders/{$repairOrder->id}/assign-technician", ['technician_id' => $technician->id])->assertCreated();

        $this->actingAs($advisor)
            ->postJson("/api/repair-orders/{$repairOrder->id}/close", ['close_reason' => 'CUSTOMER_REQUEST', 'note' => 'Khách đổi ý'])
            ->assertOk();

        $this->assertDatabaseHas('assignments', ['technician_id' => $technician->id, 'status' => 'CANCELLED']);
        $this->actingAs($advisor)->getJson('/api/technicians')->assertJsonPath('0.active_assignments_count', 0);
    }
}
