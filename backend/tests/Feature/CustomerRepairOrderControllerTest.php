<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerRepairOrderControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_only_list_their_own_repair_orders(): void
    {
        [$account, $customer] = $this->createCustomer();
        $ownRepairOrder = $this->createRepairOrder($customer);
        $otherCustomer = Customer::factory()->create();
        $otherRepairOrder = $this->createRepairOrder($otherCustomer);

        $this->actingAs($account)
            ->getJson('/api/me/repair-orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownRepairOrder->id)
            ->assertJsonMissing(['id' => $otherRepairOrder->id]);
    }

    public function test_customer_cannot_view_another_customers_repair_order_or_invoice(): void
    {
        [$account] = $this->createCustomer();
        $otherCustomer = Customer::factory()->create();
        $repairOrder = $this->createRepairOrder($otherCustomer);

        $this->actingAs($account)
            ->getJson("/api/me/repair-orders/{$repairOrder->id}")
            ->assertNotFound();

        $this->actingAs($account)
            ->getJson("/api/me/repair-orders/{$repairOrder->id}/invoice")
            ->assertNotFound();
    }

    public function test_customer_can_read_their_repair_order_and_invoice(): void
    {
        [$account, $customer] = $this->createCustomer();
        $repairOrder = $this->createRepairOrder($customer);
        $invoice = Invoice::query()->create([
            'repair_order_id' => $repairOrder->id,
            'invoice_code' => 'INV-CUSTOMER-1',
            'subtotal' => 100,
            'discount_amount' => 0,
            'total_amount' => 100,
            'status' => Invoice::UNPAID,
        ]);

        $this->actingAs($account)
            ->getJson("/api/me/repair-orders/{$repairOrder->id}")
            ->assertOk()
            ->assertJsonPath('id', $repairOrder->id);

        $this->actingAs($account)
            ->getJson("/api/me/repair-orders/{$repairOrder->id}/invoice")
            ->assertOk()
            ->assertJsonPath('id', $invoice->id);
    }

    public function test_customer_can_respond_to_their_sent_quotation(): void
    {
        [$account, $customer] = $this->createCustomer();
        $repairOrder = $this->createRepairOrder($customer);
        $quotation = $this->createQuotation($repairOrder, Quotation::SENT);
        $item = $this->createQuotationItem($quotation);

        $this->actingAs($account)
            ->postJson("/api/me/quotations/{$quotation->id}/respond", [
                'responses' => [
                    ['item_id' => $item->id, 'is_approved' => true],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', Quotation::APPROVED)
            ->assertJsonPath('items.0.is_approved', true);
    }

    public function test_customer_cannot_respond_using_an_item_from_another_quotation(): void
    {
        [$account, $customer] = $this->createCustomer();
        $repairOrder = $this->createRepairOrder($customer);
        $quotation = $this->createQuotation($repairOrder, Quotation::SENT);
        $otherRepairOrder = $this->createRepairOrder($customer);
        $otherQuotation = $this->createQuotation($otherRepairOrder, Quotation::SENT);
        $otherItem = $this->createQuotationItem($otherQuotation);

        $this->actingAs($account)
            ->postJson("/api/me/quotations/{$quotation->id}/respond", [
                'responses' => [
                    ['item_id' => $otherItem->id, 'is_approved' => true],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('responses.0.item_id');
    }

    public function test_customer_without_a_profile_receives_not_found(): void
    {
        $account = Account::factory()->customer()->create();

        $this->actingAs($account)
            ->getJson('/api/me/repair-orders')
            ->assertNotFound();
    }

    /**
     * @return array{0: Account, 1: Customer}
     */
    private function createCustomer(): array
    {
        $account = Account::factory()->customer()->create();
        $customer = Customer::factory()->create(['account_id' => $account->id]);

        return [$account, $customer];
    }

    private function createRepairOrder(Customer $customer): RepairOrder
    {
        $advisor = Employee::factory()->create();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);

        return RepairOrder::query()->create([
            'repair_order_code' => 'RO-'.uniqid(),
            'customer_id' => $customer->id,
            'vehicle_id' => $vehicle->id,
            'advisor_id' => $advisor->id,
            'status' => RepairOrder::WAITING_APPROVAL,
            'received_at' => now(),
        ]);
    }

    private function createQuotation(RepairOrder $repairOrder, string $status): Quotation
    {
        $advisor = Employee::factory()->create();

        return Quotation::query()->create([
            'quotation_code' => 'QT-'.uniqid(),
            'repair_order_id' => $repairOrder->id,
            'advisor_id' => $advisor->id,
            'version' => 1,
            'subtotal' => 100,
            'discount_amount' => 0,
            'total_amount' => 100,
            'status' => $status,
        ]);
    }

    private function createQuotationItem(Quotation $quotation): QuotationItem
    {
        return QuotationItem::query()->create([
            'quotation_id' => $quotation->id,
            'item_type' => QuotationItem::TYPE_SERVICE,
            'description' => 'Service item',
            'quantity' => 1,
            'unit_price' => 100,
            'amount' => 100,
        ]);
    }
}
