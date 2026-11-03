<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Assignment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Inspection;
use App\Models\InspectionRecommendation;
use App\Models\Inventory;
use App\Models\Part;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\Service;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use App\Models\WorkItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Luồng sau chẩn đoán: báo giá → khách duyệt → sửa chữa → thanh toán → bàn giao.
 */
class RepairFlowTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $customerAccount;

    private Account $technicianAccount;

    private RepairOrder $repairOrder;

    private Service $service;

    private Part $part;

    protected function setUp(): void
    {
        parent::setUp();

        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);

        $this->technicianAccount = Account::factory()->technician()->create();
        $technician = TechnicianProfile::factory()->create([
            'employee_id' => Employee::factory()->create(['account_id' => $this->technicianAccount->id])->id,
        ]);

        $this->customerAccount = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $this->customerAccount->id]);

        $this->service = Service::factory()->create(['name' => 'Công thay má phanh', 'base_price' => 300000, 'status' => 'ACTIVE']);
        $this->part = Part::query()->create([
            'sku' => 'BRK-01', 'name' => 'Má phanh trước', 'unit' => 'Bộ', 'sell_price' => 450000, 'status' => 'ACTIVE',
        ]);

        $this->repairOrder = RepairOrder::query()->create([
            'repair_order_code' => 'RO-TEST',
            'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'advisor_id' => $this->advisor->employee->id,
            'status' => RepairOrder::QUOTING,
            'received_at' => now(),
        ]);

        Assignment::query()->create([
            'repair_order_id' => $this->repairOrder->id,
            'technician_id' => $technician->id,
            'status' => Assignment::ASSIGNED,
            'assigned_at' => now(),
        ]);

        $inspection = Inspection::query()->create([
            'repair_order_id' => $this->repairOrder->id,
            'technician_id' => $technician->id,
            'diagnosis' => 'Má phanh mòn',
            'inspected_at' => now(),
        ]);

        InspectionRecommendation::query()->create([
            'inspection_id' => $inspection->id,
            'item_type' => InspectionRecommendation::TYPE_PART,
            'part_id' => $this->part->id,
            'quantity' => 1,
        ]);
    }

    /**
     * Cố vấn lập + gửi báo giá 2 dòng (công + phụ tùng), trả về báo giá đã gửi.
     */
    private function sendQuotation(): Quotation
    {
        $quotationId = $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/quotations", [
                'items' => [
                    ['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 1],
                    ['item_type' => 'PART', 'part_id' => $this->part->id, 'quantity' => 2],
                ],
            ])
            ->assertCreated()
            ->json('id');

        $this->actingAs($this->advisor)->postJson("/api/quotations/{$quotationId}/send")->assertOk();

        return Quotation::query()->with('items')->findOrFail($quotationId);
    }

    /**
     * Khách duyệt toàn bộ báo giá rồi Cố vấn bắt đầu sửa.
     */
    private function approveAndStartRepair(): Quotation
    {
        $quotation = $this->sendQuotation();

        $this->actingAs($this->customerAccount)
            ->postJson("/api/me/quotations/{$quotation->id}/respond", [
                'responses' => $quotation->items->map(fn ($item) => ['item_id' => $item->id, 'is_approved' => true])->all(),
            ])
            ->assertOk();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/start-repair")->assertOk();

        return $quotation->fresh('items');
    }

    public function test_quotation_uses_catalog_price_and_name_when_omitted(): void
    {
        $quotation = $this->sendQuotation();

        $this->assertSame(RepairOrder::WAITING_APPROVAL, $this->repairOrder->fresh()->status);
        $this->assertEqualsCanonicalizing(
            [['Công thay má phanh', 300000.0], ['Má phanh trước', 900000.0]],
            $quotation->items->map(fn ($item) => [$item->description, (float) $item->amount])->all()
        );
    }

    public function test_customer_partial_approval_creates_work_items_only_for_approved_services(): void
    {
        $quotation = $this->sendQuotation();
        $serviceItem = $quotation->items->firstWhere('item_type', 'SERVICE');
        $partItem = $quotation->items->firstWhere('item_type', 'PART');

        $this->actingAs($this->customerAccount)
            ->postJson("/api/me/quotations/{$quotation->id}/respond", [
                'responses' => [
                    ['item_id' => $serviceItem->id, 'is_approved' => true],
                    ['item_id' => $partItem->id, 'is_approved' => false],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', Quotation::PARTIALLY_APPROVED);

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/start-repair")->assertOk();

        $this->assertSame(RepairOrder::IN_PROGRESS, $this->repairOrder->fresh()->status);
        $this->assertSame(1, WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->count());
    }

    public function test_repair_cannot_start_before_customer_approves(): void
    {
        $this->sendQuotation();

        $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/start-repair")
            ->assertUnprocessable();
    }

    public function test_technician_uses_approved_part_and_stock_is_exported(): void
    {
        $this->approveAndStartRepair();
        $inventory = Inventory::query()->create(['part_id' => $this->part->id, 'quantity' => 5]);

        $this->actingAs($this->technicianAccount)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/used-parts", ['part_id' => $this->part->id, 'quantity' => 2])
            ->assertCreated()
            ->assertJsonPath('unit_price', '450000.00');

        $this->assertSame(3, $inventory->fresh()->quantity);
        $this->assertDatabaseHas('inventory_transactions', [
            'inventory_id' => $inventory->id,
            'repair_order_id' => $this->repairOrder->id,
            'transaction_type' => 'OUT',
            'quantity' => 2,
        ]);
    }

    public function test_using_part_beyond_stock_is_rejected_without_changes(): void
    {
        $this->approveAndStartRepair();
        $inventory = Inventory::query()->create(['part_id' => $this->part->id, 'quantity' => 1]);

        $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/used-parts", ['part_id' => $this->part->id, 'quantity' => 2])
            ->assertUnprocessable();

        $this->assertSame(1, $inventory->fresh()->quantity);
        $this->assertDatabaseCount('used_parts', 0);
    }

    public function test_order_completes_only_after_all_work_items_are_done(): void
    {
        $this->approveAndStartRepair();
        $workItem = WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->firstOrFail();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/complete")->assertUnprocessable();

        $this->actingAs($this->technicianAccount)
            ->patchJson("/api/work-items/{$workItem->id}/status", ['status' => WorkItem::COMPLETED])
            ->assertOk();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/complete")->assertUnprocessable();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/review", ['result' => 'PASSED'])->assertCreated();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/complete")->assertOk();
        $this->assertSame(RepairOrder::COMPLETED, $this->repairOrder->fresh()->status);
    }

    public function test_work_items_are_frozen_once_the_order_is_completed(): void
    {
        $this->completeAndInvoice();
        $workItem = WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->firstOrFail();

        $this->actingAs($this->advisor)
            ->patchJson("/api/work-items/{$workItem->id}/status", ['status' => WorkItem::PENDING])
            ->assertUnprocessable();
        $this->assertSame(WorkItem::COMPLETED, $workItem->fresh()->status);
    }

    public function test_cancelled_work_item_cannot_be_reopened(): void
    {
        $this->approveAndStartRepair();
        $workItem = WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->firstOrFail();
        $url = "/api/work-items/{$workItem->id}/status";

        $this->actingAs($this->advisor)->patchJson($url, ['status' => WorkItem::CANCELLED])->assertOk();
        $this->actingAs($this->advisor)->patchJson($url, ['status' => WorkItem::IN_PROGRESS])->assertUnprocessable();
    }

    /**
     * Đưa phiếu đến COMPLETED và xuất hóa đơn, trả về id hóa đơn.
     */
    private function completeAndInvoice(): int
    {
        $this->approveAndStartRepair();
        WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->update(['status' => WorkItem::COMPLETED]);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/review", ['result' => 'PASSED'])->assertCreated();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/complete")->assertOk();

        return $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/invoice")
            ->assertCreated()
            ->assertJsonPath('total_amount', '1200000.00')
            ->json('id');
    }

    public function test_cash_payment_then_hand_over_then_customer_review(): void
    {
        $invoiceId = $this->completeAndInvoice();
        $orderId = $this->repairOrder->id;

        $this->actingAs($this->advisor)->postJson("/api/invoices/{$invoiceId}/payments", ['amount' => 200000])
            ->assertCreated()
            ->assertJsonPath('payment_method', 'DIRECT')
            ->assertJsonPath('status', 'SUCCESS');

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/hand-over", ['receiver_name' => 'Nguyễn Văn A'])->assertUnprocessable();

        $this->actingAs($this->customerAccount)
            ->postJson('/api/me/reviews', ['repair_order_id' => $orderId, 'overall_rating' => 5])
            ->assertUnprocessable();

        $this->actingAs($this->advisor)->postJson("/api/invoices/{$invoiceId}/payments", ['amount' => 1000000])->assertCreated();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/hand-over")->assertUnprocessable()->assertJsonValidationErrors('receiver_name');
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/hand-over", [
            'receiver_name' => 'Trần Thị B', 'receiver_phone' => '0909000111', 'note' => 'Người nhà nhận hộ',
        ])->assertOk();
        $this->assertDatabaseHas('repair_orders', ['id' => $orderId, 'handed_over_to_name' => 'Trần Thị B', 'handover_note' => 'Người nhà nhận hộ']);
        $this->assertSame(RepairOrder::HANDED_OVER, $this->repairOrder->fresh()->status);

        $this->actingAs($this->customerAccount)
            ->postJson('/api/me/reviews', ['repair_order_id' => $orderId, 'overall_rating' => 5])
            ->assertCreated();
    }

    public function test_only_cash_payment_is_accepted_and_overpayment_is_rejected(): void
    {
        $invoiceId = $this->completeAndInvoice();

        $this->actingAs($this->advisor)
            ->postJson("/api/invoices/{$invoiceId}/payments", ['payment_method' => 'QR', 'amount' => 1000])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payment_method');

        $this->actingAs($this->advisor)
            ->postJson("/api/invoices/{$invoiceId}/payments", ['amount' => 1300000])
            ->assertUnprocessable();

        $this->assertDatabaseCount('payments', 0);
    }

    public function test_order_detail_includes_invoice_items_and_newest_history_first(): void
    {
        $this->completeAndInvoice();

        $response = $this->actingAs($this->advisor)->getJson("/api/repair-orders/{$this->repairOrder->id}")->assertOk();

        $this->assertCount(2, $response->json('invoice.items'));
        $this->assertSame(RepairOrder::COMPLETED, $response->json('status_history.0.status'));
    }

    public function test_retrying_a_cash_payment_with_the_same_key_records_it_once(): void
    {
        $invoiceId = $this->completeAndInvoice();
        $headers = ['Idempotency-Key' => 'cash-payment-0001'];

        $first = $this->actingAs($this->advisor)->withHeaders($headers)
            ->postJson("/api/invoices/{$invoiceId}/payments", ['amount' => 500000])->assertCreated();

        $this->actingAs($this->advisor)->withHeaders($headers)
            ->postJson("/api/invoices/{$invoiceId}/payments", ['amount' => 500000])
            ->assertCreated()
            ->assertHeader('Idempotent-Replayed', 'true')
            ->assertJsonPath('id', $first->json('id'));

        $this->assertDatabaseCount('payments', 1);
    }

    public function test_advisor_assigns_and_reassigns_the_technician_of_a_work_item(): void
    {
        $this->approveAndStartRepair();
        $workItem = WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->firstOrFail();
        $first = TechnicianProfile::query()->firstOrFail();
        $second = TechnicianProfile::factory()->create([
            'employee_id' => Employee::factory()->create(['account_id' => Account::factory()->technician()->create()->id])->id,
        ]);

        $this->actingAs($this->advisor)->patchJson("/api/work-items/{$workItem->id}/technician", ['technician_id' => $first->id])
            ->assertOk()->assertJsonPath('technician_id', $first->id);
        $this->actingAs($this->advisor)->patchJson("/api/work-items/{$workItem->id}/technician", ['technician_id' => $second->id, 'reason' => 'KTV nghỉ đột xuất'])
            ->assertOk()->assertJsonPath('technician_id', $second->id);

        $this->assertDatabaseHas('repair_order_status_history', [
            'repair_order_id' => $this->repairOrder->id,
            'note' => "Đổi người thực hiện \"{$workItem->description}\": {$first->employee->full_name} → {$second->employee->full_name} (KTV nghỉ đột xuất).",
        ]);

        $workItem->update(['status' => WorkItem::COMPLETED]);
        $this->actingAs($this->advisor)->patchJson("/api/work-items/{$workItem->id}/technician", ['technician_id' => $first->id])->assertUnprocessable();
        $this->actingAs($this->customerAccount)->patchJson("/api/work-items/{$workItem->id}/technician", ['technician_id' => $first->id])->assertForbidden();
    }

    public function test_failed_quality_check_reopens_work_and_blocks_completion_until_rechecked(): void
    {
        $this->approveAndStartRepair();
        $orderId = $this->repairOrder->id;
        $workItem = WorkItem::query()->where('repair_order_id', $orderId)->firstOrFail();
        $workItem->update(['status' => WorkItem::COMPLETED, 'completed_at' => now()]);

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/review", ['result' => 'FAILED'])->assertUnprocessable();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/review", [
            'result' => 'FAILED', 'note' => 'Phanh còn kêu', 'rework_item_ids' => [$workItem->id],
        ])->assertCreated();
        $this->assertSame(WorkItem::PENDING, $workItem->fresh()->status);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/complete")->assertUnprocessable();

        $this->travel(5)->minutes();
        $workItem->fresh()->update(['status' => WorkItem::COMPLETED, 'completed_at' => now()]);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/review", ['result' => 'PASSED'])->assertCreated();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/complete")->assertOk();
        $this->assertSame(RepairOrder::COMPLETED, $this->repairOrder->fresh()->status);
    }

    public function test_work_finished_after_a_passed_check_needs_a_new_check(): void
    {
        $this->approveAndStartRepair();
        $orderId = $this->repairOrder->id;
        $workItem = WorkItem::query()->where('repair_order_id', $orderId)->firstOrFail();
        $workItem->update(['status' => WorkItem::COMPLETED, 'completed_at' => now()]);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/review", ['result' => 'PASSED'])->assertCreated();

        $this->travel(5)->minutes();
        $workItem->update(['completed_at' => now()]);

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/complete")->assertUnprocessable();
    }

    public function test_new_quotation_version_supersedes_the_previous_one(): void
    {
        $first = $this->sendQuotation();

        $secondId = $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/quotations", [
                'items' => [['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 1, 'unit_price' => 250000]],
            ])
            ->assertCreated()
            ->assertJsonPath('version', 2)
            ->json('id');

        $this->assertSame(Quotation::CANCELLED, $first->fresh()->status);

        $this->actingAs($this->customerAccount)
            ->postJson("/api/me/quotations/{$first->id}/respond", [
                'responses' => $first->items->map(fn ($item) => ['item_id' => $item->id, 'is_approved' => true])->all(),
            ])
            ->assertUnprocessable();

        $this->assertSame(Quotation::DRAFT, Quotation::query()->findOrFail($secondId)->status);
    }

    public function test_approved_quotation_cannot_be_silently_replaced(): void
    {
        $quotation = $this->sendQuotation();
        $this->actingAs($this->customerAccount)
            ->postJson("/api/me/quotations/{$quotation->id}/respond", [
                'responses' => $quotation->items->map(fn ($item) => ['item_id' => $item->id, 'is_approved' => true])->all(),
            ])
            ->assertOk();

        $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/quotations", [
                'items' => [['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 1]],
            ])
            ->assertUnprocessable();

        $this->assertSame(Quotation::APPROVED, $quotation->fresh()->status);
    }
}
