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

class AppointmentLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function createAdvisor(): Account
    {
        $account = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $account->id]);

        return $account;
    }

    private function createAppointment(Vehicle $vehicle, string $status, string $date, string $time = '09:00:00'): Appointment
    {
        return Appointment::query()->create([
            'appointment_code' => 'APT-'.uniqid(),
            'customer_id' => $vehicle->customer_id,
            'vehicle_id' => $vehicle->id,
            'appointment_date' => $date,
            'appointment_time' => $time,
            'request_type' => 'MAINTENANCE',
            'status' => $status,
        ]);
    }

    public function test_no_show_is_only_allowed_after_the_grace_period(): void
    {
        config(['carservice.no_show_grace_minutes' => 30]);
        $this->travelTo(now()->setDate(2026, 11, 10)->setTime(9, 20));
        $appointment = $this->createAppointment(Vehicle::factory()->create(), 'CONFIRMED', '2026-11-10');
        $advisor = $this->createAdvisor();

        $this->actingAs($advisor)->postJson("/api/advisor/appointments/{$appointment->id}/no-show")->assertBadRequest();

        $this->travelTo(now()->setTime(9, 31));
        $this->actingAs($advisor)->postJson("/api/advisor/appointments/{$appointment->id}/no-show")
            ->assertOk()
            ->assertJsonPath('data.status', 'NO_SHOW');

        $this->actingAs($advisor)->postJson("/api/advisor/appointments/{$appointment->id}/check-in")->assertBadRequest();
        $this->actingAs($advisor)->postJson("/api/advisor/appointments/{$appointment->id}/cancel", ['cancel_reason' => 'x'])->assertBadRequest();
    }

    public function test_no_show_requires_a_confirmed_appointment(): void
    {
        $this->travelTo(now()->setDate(2026, 11, 10)->setTime(12, 0));
        $appointment = $this->createAppointment(Vehicle::factory()->create(), 'PENDING', '2026-11-10');

        $this->actingAs($this->createAdvisor())->postJson("/api/advisor/appointments/{$appointment->id}/no-show")->assertBadRequest();
    }

    public function test_customer_cannot_delete_a_vehicle_with_an_active_appointment_or_open_repair_order(): void
    {
        $account = Account::factory()->customer()->create();
        $customer = Customer::factory()->create(['account_id' => $account->id]);
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $appointment = $this->createAppointment($vehicle, 'PENDING', now()->addDay()->toDateString());

        $this->actingAs($account)->deleteJson("/api/me/vehicles/{$vehicle->id}")->assertUnprocessable();

        $appointment->update(['status' => 'CHECKED_IN']);
        $order = RepairOrder::query()->create([
            'repair_order_code' => 'RO-TEST', 'customer_id' => $customer->id, 'vehicle_id' => $vehicle->id,
            'advisor_id' => Employee::factory()->create()->id, 'status' => RepairOrder::IN_PROGRESS, 'received_at' => now(),
        ]);
        $this->actingAs($account)->deleteJson("/api/me/vehicles/{$vehicle->id}")->assertUnprocessable();

        $order->update(['status' => RepairOrder::HANDED_OVER]);
        $this->actingAs($account)->deleteJson("/api/me/vehicles/{$vehicle->id}")->assertOk();

        $this->assertSoftDeleted('vehicles', ['id' => $vehicle->id]);
        $this->assertDatabaseHas('repair_orders', ['id' => $order->id]);
    }
}
