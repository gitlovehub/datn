<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardSummaryTest extends TestCase
{
    use RefreshDatabase;

    private function advisor(): Account
    {
        $account = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $account->id]);

        return $account;
    }

    private function repairOrder(Vehicle $vehicle, string $status): RepairOrder
    {
        return RepairOrder::query()->create([
            'repair_order_code' => 'RO-'.uniqid(),
            'customer_id' => $vehicle->customer_id,
            'vehicle_id' => $vehicle->id,
            'advisor_id' => Employee::factory()->create()->id,
            'status' => $status,
            'received_at' => now(),
        ]);
    }

    private function appointment(Vehicle $vehicle, string $status): Appointment
    {
        return Appointment::query()->create([
            'appointment_code' => 'APT-'.uniqid(),
            'customer_id' => $vehicle->customer_id,
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'status' => $status,
        ]);
    }

    public function test_summary_counts_real_records(): void
    {
        $vehicle = Vehicle::factory()->create(['customer_id' => Customer::factory()->create()->id]);

        $this->repairOrder($vehicle, RepairOrder::WAITING_APPROVAL);
        $this->repairOrder($vehicle, RepairOrder::IN_PROGRESS);
        $this->repairOrder($vehicle, RepairOrder::CLOSED);
        $paidOrder = $this->repairOrder($vehicle, RepairOrder::COMPLETED);
        $invoice = Invoice::query()->create(['repair_order_id' => $paidOrder->id, 'invoice_code' => 'INV-1', 'total_amount' => 500000, 'status' => Invoice::PAID]);
        Payment::query()->create(['invoice_id' => $invoice->id, 'amount' => 500000, 'payment_method' => Payment::DIRECT, 'status' => Payment::SUCCESS, 'paid_at' => now()]);
        Payment::query()->create(['invoice_id' => $invoice->id, 'amount' => 999, 'payment_method' => Payment::DIRECT, 'status' => Payment::FAILED, 'paid_at' => now()]);
        $this->repairOrder($vehicle, RepairOrder::COMPLETED);

        $this->appointment($vehicle, 'CONFIRMED');
        $this->appointment($vehicle, 'CANCELLED');
        $this->appointment($vehicle, 'NO_SHOW');
        $this->appointment($vehicle, 'PENDING');

        $this->actingAs($this->advisor())
            ->getJson('/api/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('repair_orders.in_garage', 4)
            ->assertJsonPath('repair_orders.waiting_approval', 1)
            ->assertJsonPath('repair_orders.in_progress', 1)
            ->assertJsonPath('repair_orders.ready_for_pickup', 1)
            ->assertJsonPath('repair_orders.waiting_payment', 1)
            ->assertJsonPath('appointments.today', 3)
            ->assertJsonPath('appointments.pending', 1)
            ->assertJsonPath('period.cancel_rate', 25)
            ->assertJsonPath('period.no_show_rate', 25)
            ->assertJsonPath('period.revenue', 500000)
            ->assertJsonCount(5, 'recent_orders')
            ->assertJsonStructure(['definitions' => ['period.revenue'], 'recent_orders' => [['repair_order_code', 'status', 'customer', 'vehicle']]]);
    }

    public function test_customer_cannot_read_summary(): void
    {
        $this->actingAs(Account::factory()->create())
            ->getJson('/api/dashboard/summary')
            ->assertForbidden();
    }
}
