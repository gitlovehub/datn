<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReceiveVehicleFlowTest extends TestCase
{
    use RefreshDatabase;

    private function createAdvisor(): Account
    {
        $account = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $account->id]);

        return $account;
    }

    private function createAppointment(string $status): Appointment
    {
        $customer = Customer::factory()->create();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);

        return Appointment::query()->create([
            'appointment_code' => 'APT-'.uniqid(),
            'customer_id' => $customer->id,
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDay()->toDateString(),
            'appointment_time' => '09:00:00',
            'request_type' => 'MAINTENANCE',
            'status' => $status,
        ]);
    }

    /**
     * @return array<string, int>
     */
    private function payloadFor(Appointment $appointment): array
    {
        return [
            'appointment_id' => $appointment->id,
            'customer_id' => $appointment->customer_id,
            'vehicle_id' => $appointment->vehicle_id,
        ];
    }

    public function test_advisor_creates_one_repair_order_for_checked_in_appointment(): void
    {
        $advisor = $this->createAdvisor();
        $appointment = $this->createAppointment('CHECKED_IN');

        $this->actingAs($advisor)
            ->postJson('/api/repair-orders', $this->payloadFor($appointment))
            ->assertCreated()
            ->assertJsonPath('status', RepairOrder::RECEIVED);

        $this->actingAs($advisor)
            ->postJson('/api/repair-orders', $this->payloadFor($appointment))
            ->assertUnprocessable()
            ->assertJsonPath('message', fn (string $message) => str_contains($message, 'đã có phiếu sửa chữa'));

        $this->assertDatabaseCount('repair_orders', 1);
    }

    public function test_appointment_must_be_checked_in_before_receiving(): void
    {
        $advisor = $this->createAdvisor();
        $appointment = $this->createAppointment('PENDING');

        $this->actingAs($advisor)
            ->postJson('/api/repair-orders', $this->payloadFor($appointment))
            ->assertUnprocessable();

        $this->assertDatabaseCount('repair_orders', 0);
    }

    public function test_vehicle_must_match_appointment_and_customer(): void
    {
        $advisor = $this->createAdvisor();
        $appointment = $this->createAppointment('CHECKED_IN');
        $otherVehicle = Vehicle::factory()->create();

        $this->actingAs($advisor)
            ->postJson('/api/repair-orders', [
                'appointment_id' => $appointment->id,
                'customer_id' => $appointment->customer_id,
                'vehicle_id' => $otherVehicle->id,
            ])
            ->assertUnprocessable();

        $this->assertDatabaseCount('repair_orders', 0);
    }

    public function test_walk_in_vehicle_cannot_have_two_open_repair_orders(): void
    {
        $advisor = $this->createAdvisor();
        $vehicle = Vehicle::factory()->create();
        $payload = ['customer_id' => $vehicle->customer_id, 'vehicle_id' => $vehicle->id];

        $this->actingAs($advisor)->postJson('/api/repair-orders', $payload)->assertCreated();
        $this->actingAs($advisor)->postJson('/api/repair-orders', $payload)->assertUnprocessable();

        RepairOrder::query()->update(['status' => RepairOrder::HANDED_OVER]);

        $this->actingAs($advisor)->postJson('/api/repair-orders', $payload)->assertCreated();
        $this->assertDatabaseCount('repair_orders', 2);
    }
}
