<?php

namespace App\Services;

use App\Exceptions\InvalidStatusTransitionException;
use App\Models\Account;
use App\Models\Appointment;
use App\Models\Assignment;
use App\Models\Employee;
use App\Models\Inspection;
use App\Models\InspectionItem;
use App\Models\InspectionRecommendation;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Part;
use App\Models\Payment;
use App\Models\QualityCheck;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\RepairOrder;
use App\Models\RepairOrderStatusHistory;
use App\Models\Service;
use App\Models\TechnicianProfile;
use App\Models\UsedPart;
use App\Models\Vehicle;
use App\Models\WorkItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RepairOrderService
{
    /*
    |--------------------------------------------------------------------------
    | 1. Tiếp nhận xe
    |--------------------------------------------------------------------------
    */
    public function receive(array $data, Employee $advisor): RepairOrder
    {
        $this->assertAdvisor($advisor);

        return DB::transaction(function () use ($data, $advisor) {
            $vehicle = Vehicle::query()->lockForUpdate()->find($data['vehicle_id']);

            if (! $vehicle || (int) $vehicle->customer_id !== (int) $data['customer_id']) {
                throw InvalidStatusTransitionException::because('Xe không thuộc khách hàng đã chọn.');
            }

            if (! empty($data['appointment_id'])) {
                $this->assertAppointmentReadyForReceiving((int) $data['appointment_id'], $data);
            }

            $openOrder = RepairOrder::query()
                ->where('vehicle_id', $vehicle->id)
                ->whereNotIn('status', [RepairOrder::HANDED_OVER, RepairOrder::CLOSED])
                ->first();

            if ($openOrder) {
                throw InvalidStatusTransitionException::because(
                    "Xe đang có phiếu sửa chữa {$openOrder->repair_order_code} chưa kết thúc, không tạo phiếu mới."
                );
            }

            $ro = RepairOrder::create([
                'repair_order_code' => $this->generateCode('RO'),
                'appointment_id' => $data['appointment_id'] ?? null,
                'customer_id' => $data['customer_id'],
                'vehicle_id' => $data['vehicle_id'],
                'advisor_id' => $advisor->id,
                'mileage_received' => $data['mileage_received'] ?? null,
                'initial_condition' => $data['initial_condition'] ?? null,
                'status' => RepairOrder::RECEIVED,
                'received_at' => now(),
                'note' => $data['note'] ?? null,
            ]);

            $this->logHistory($ro, RepairOrder::RECEIVED, null, 'Tiếp nhận xe.');

            return $ro;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 2. Giao KTV kiểm tra / chẩn đoán
    |--------------------------------------------------------------------------
    */
    public function assignTechnician(RepairOrder $ro, TechnicianProfile $technician, ?Account $actor, ?string $note = null): Assignment
    {
        $this->assertTechnician($technician);

        if (in_array($ro->status, [RepairOrder::COMPLETED, RepairOrder::HANDED_OVER, RepairOrder::CLOSED], true)) {
            throw InvalidStatusTransitionException::because("Không thể giao KTV khi phiếu đang {$ro->status}.");
        }

        if ($ro->assignments()->where('technician_id', $technician->id)->exists()) {
            throw InvalidStatusTransitionException::because('KTV này đã được giao cho phiếu sửa chữa.');
        }

        return DB::transaction(function () use ($ro, $technician, $actor, $note) {
            $assignment = Assignment::create([
                'repair_order_id' => $ro->id,
                'technician_id' => $technician->id,
                'status' => Assignment::ASSIGNED,
                'note' => $note,
                'assigned_at' => now(),
            ]);

            if ($ro->status === RepairOrder::RECEIVED) {
                $this->transition($ro, RepairOrder::INSPECTING, $actor, 'Giao KTV kiểm tra/chẩn đoán.');
            }

            return $assignment;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 3. Ghi nhận kết quả kiểm tra / chẩn đoán (KTV hoặc Cố vấn nhập)
    |--------------------------------------------------------------------------
    | $data = [
    |   'condition_description' => ..., 'diagnosis' => ...,
    |   'items' => [['item_name','condition_status','condition_description','note'], ...],
    |   'recommendations' => [['item_type','service_id'|'part_id','quantity','note'], ...],
    | ]
    */
    public function recordInspection(RepairOrder $ro, ?TechnicianProfile $technician, array $data, ?Employee $recordedBy = null): Inspection
    {
        if ($technician) {
            $this->assertTechnician($technician);
        }

        if (! in_array($ro->status, [RepairOrder::RECEIVED, RepairOrder::INSPECTING], true)) {
            throw InvalidStatusTransitionException::because(
                'Chỉ ghi nhận kiểm tra khi Phiếu sửa chữa đang RECEIVED hoặc INSPECTING.'
            );
        }

        if ($ro->inspections()->exists()) {
            throw InvalidStatusTransitionException::because(
                'Mỗi lệnh sửa chữa chỉ thuộc về 1 phiếu kiểm tra tổng thể.'
            );
        }

        return DB::transaction(function () use ($ro, $technician, $data, $recordedBy) {
            $inspection = Inspection::create([
                'repair_order_id' => $ro->id,
                'technician_id' => $technician?->id,
                'recorded_by_employee_id' => $recordedBy?->id,
                'condition_description' => $data['condition_description'] ?? null,
                'diagnosis' => $data['diagnosis'] ?? null,
                'inspected_at' => null,
            ]);

            $items = $data['inspection_items'] ?? $data['items'] ?? [];
            foreach ($items as $item) {
                InspectionItem::create([
                    'inspection_id' => $inspection->id,
                    'item_name' => $item['item_name'],
                    'condition_status' => $item['status'] ?? $item['condition_status'] ?? null,
                    'condition_description' => $item['condition_description'] ?? null,
                    'note' => $item['note'] ?? null,
                ]);
            }

            foreach ($data['recommendations'] ?? [] as $rec) {
                $this->assertRecommendationIsWellFormed($rec);

                InspectionRecommendation::create([
                    'inspection_id' => $inspection->id,
                    'item_type' => $rec['item_type'],
                    'service_id' => $rec['item_type'] === InspectionRecommendation::TYPE_SERVICE ? $rec['service_id'] : null,
                    'part_id' => $rec['item_type'] === InspectionRecommendation::TYPE_PART ? $rec['part_id'] : null,
                    'quantity' => $rec['quantity'] ?? 1,
                    'note' => $rec['note'] ?? null,
                ]);
            }

            if ($ro->status === RepairOrder::RECEIVED) {
                $ro->status = RepairOrder::INSPECTING;
                $ro->save();
                $this->logHistory($ro, RepairOrder::INSPECTING, $recordedBy?->account, 'Bắt đầu kiểm tra xe.');
            }

            return $inspection->load(['items', 'recommendations.service', 'recommendations.part', 'technician.employee']);
        });
    }

    public function addInspectionRecommendation(Inspection $inspection, array $rec): InspectionRecommendation
    {
        $this->assertRecommendationIsWellFormed($rec);

        return InspectionRecommendation::create([
            'inspection_id' => $inspection->id,
            'item_type' => $rec['item_type'],
            'service_id' => $rec['item_type'] === InspectionRecommendation::TYPE_SERVICE ? $rec['service_id'] : null,
            'part_id' => $rec['item_type'] === InspectionRecommendation::TYPE_PART ? $rec['part_id'] : null,
            'quantity' => $rec['quantity'] ?? 1,
            'note' => $rec['note'] ?? null,
        ])->load(['service', 'part']);
    }

    public function completeInspection(RepairOrder $ro, ?Account $actor): Inspection
    {
        $inspection = $ro->inspections()->latest()->first();

        if (! $inspection) {
            throw InvalidStatusTransitionException::because(
                'Lệnh sửa chữa này chưa có phiếu kiểm tra để hoàn tất.'
            );
        }

        return DB::transaction(function () use ($ro, $inspection, $actor) {
            $inspection->inspected_at = now();
            $inspection->save();

            if ($ro->status === RepairOrder::INSPECTING) {
                $this->transition($ro, RepairOrder::QUOTING, $actor, 'Hoàn tất chẩn đoán, chuyển sang lập báo giá.');
            }

            return $inspection->load(['items', 'recommendations.service', 'recommendations.part', 'technician.employee']);
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 4. Cố vấn lập báo giá
    |--------------------------------------------------------------------------
    | RULE: một dòng PART chỉ được thêm nếu part_id đó đã từng xuất hiện
    | trong inspection_recommendations của chính Phiếu sửa chữa này.
    | $itemsInput = [['item_type','service_id'|'part_id','description','quantity','unit_price'], ...]
    */
    public function createQuotation(
        RepairOrder $ro,
        Employee $advisor,
        array $itemsInput,
        float $discountAmount = 0,
        ?string $validUntil = null
    ): Quotation {
        $this->assertAdvisor($advisor);

        if (! in_array($ro->status, [RepairOrder::INSPECTING, RepairOrder::QUOTING, RepairOrder::WAITING_APPROVAL], true)) {
            throw InvalidStatusTransitionException::because(
                'Chỉ lập báo giá khi Phiếu sửa chữa đang INSPECTING, QUOTING (báo giá đầu) hoặc WAITING_APPROVAL (báo giá lại).'
            );
        }

        $recommendedPartIds = InspectionRecommendation::query()
            ->whereHas('inspection', fn ($q) => $q->where('repair_order_id', $ro->id))
            ->where('item_type', InspectionRecommendation::TYPE_PART)
            ->pluck('part_id')
            ->all();

        $current = $ro->latestQuotation;
        if ($current && in_array($current->status, [Quotation::APPROVED, Quotation::PARTIALLY_APPROVED], true)) {
            throw InvalidStatusTransitionException::because(
                "Báo giá {$current->quotation_code} đã được khách duyệt; không lập bản mới đè lên. Bắt đầu sửa theo báo giá đã duyệt hoặc đóng phiếu."
            );
        }

        return DB::transaction(function () use ($ro, $advisor, $itemsInput, $discountAmount, $validUntil, $recommendedPartIds) {
            // Phiên bản mới thay thế bản nháp / đã gửi / bị từ chối trước đó: bản cũ chuyển CANCELLED (superseded)
            // để khách không duyệt nhầm bản cũ.
            $ro->quotations()
                ->whereIn('status', [Quotation::DRAFT, Quotation::SENT, Quotation::REJECTED])
                ->update(['status' => Quotation::CANCELLED]);

            $nextVersion = (int) $ro->quotations()->max('version') + 1;

            $quotation = Quotation::create([
                'quotation_code' => $this->generateCode('QT'),
                'repair_order_id' => $ro->id,
                'advisor_id' => $advisor->id,
                'version' => $nextVersion,
                'discount_amount' => $discountAmount,
                'status' => Quotation::DRAFT,
                'valid_until' => $validUntil,
            ]);

            foreach ($itemsInput as $item) {
                if ($item['item_type'] === QuotationItem::TYPE_PART
                    && ! in_array($item['part_id'], $recommendedPartIds, true)) {
                    throw InvalidStatusTransitionException::because(
                        'Phụ tùng chỉ được thêm vào báo giá sau khi đã có trong đề xuất kiểm tra/chẩn đoán.'
                    );
                }

                $catalogItem = $item['item_type'] === QuotationItem::TYPE_PART
                    ? Part::query()->find($item['part_id'])
                    : Service::query()->find($item['service_id']);
                $catalogPrice = $item['item_type'] === QuotationItem::TYPE_PART
                    ? $catalogItem?->sell_price
                    : $catalogItem?->base_price;

                $unitPrice = (float) ($item['unit_price'] ?? $catalogPrice ?? 0);
                $quantity = (int) ($item['quantity'] ?? 1);

                QuotationItem::create([
                    'quotation_id' => $quotation->id,
                    'item_type' => $item['item_type'],
                    'service_id' => $item['item_type'] === QuotationItem::TYPE_SERVICE ? $item['service_id'] : null,
                    'part_id' => $item['item_type'] === QuotationItem::TYPE_PART ? $item['part_id'] : null,
                    'description' => $item['description'] ?? $catalogItem?->name ?? '',
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'amount' => $unitPrice * $quantity,
                ]);
            }

            $quotation->recalculateTotals();

            return $quotation->load('items');
        });
    }

    public function sendQuotation(Quotation $quotation, ?Account $actor): Quotation
    {
        if ($quotation->status !== Quotation::DRAFT) {
            throw InvalidStatusTransitionException::because('Chỉ gửi được báo giá đang ở trạng thái DRAFT.');
        }

        return DB::transaction(function () use ($quotation, $actor) {
            $quotation->status = Quotation::SENT;
            $quotation->save();

            $ro = $quotation->repairOrder;
            if (in_array($ro->status, [RepairOrder::INSPECTING, RepairOrder::QUOTING], true)) {
                $this->transition($ro, RepairOrder::WAITING_APPROVAL, $actor,
                    "Đã gửi báo giá {$quotation->quotation_code} cho khách.");
            }

            return $quotation;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 5. Khách duyệt / từ chối từng dòng báo giá
    |--------------------------------------------------------------------------
    | $responses = [['item_id' => .., 'is_approved' => bool], ...]
    */
    public function recordCustomerResponse(Quotation $quotation, array $responses): Quotation
    {
        if ($quotation->status !== Quotation::SENT) {
            throw InvalidStatusTransitionException::because('Chỉ ghi nhận phản hồi cho báo giá đang ở trạng thái SENT.');
        }

        return DB::transaction(function () use ($quotation, $responses) {
            foreach ($responses as $r) {
                QuotationItem::where('quotation_id', $quotation->id)
                    ->where('id', $r['item_id'])
                    ->update(['is_approved' => (bool) $r['is_approved']]);
            }

            $quotation->refresh();
            $items = $quotation->items;

            $answeredCount = $items->whereNotNull('is_approved')->count();
            $approvedCount = $items->where('is_approved', true)->count();

            $quotation->status = match (true) {
                $answeredCount < $items->count() => Quotation::SENT, // khách chưa trả lời hết
                $approvedCount === $items->count() => Quotation::APPROVED,
                $approvedCount === 0 => Quotation::REJECTED,
                default => Quotation::PARTIALLY_APPROVED,
            };
            $quotation->customer_response_at = now();
            $quotation->save();

            return $quotation->fresh('items');
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 6. Bắt đầu sửa chữa (sau khi có báo giá được duyệt)
    |--------------------------------------------------------------------------
    */
    public function startRepair(RepairOrder $ro, ?Account $actor): RepairOrder
    {
        $quotation = $ro->latestQuotation;

        if (! $quotation || ! in_array($quotation->status, [Quotation::APPROVED, Quotation::PARTIALLY_APPROVED], true)) {
            throw InvalidStatusTransitionException::because(
                'Cần có báo giá đã được khách duyệt (toàn bộ hoặc một phần) trước khi bắt đầu sửa chữa.'
            );
        }

        return DB::transaction(function () use ($ro, $quotation, $actor) {
            $approvedServices = $quotation->items()
                ->where('item_type', QuotationItem::TYPE_SERVICE)
                ->where('is_approved', true)
                ->get();

            foreach ($approvedServices as $item) {
                WorkItem::create([
                    'repair_order_id' => $ro->id,
                    'service_id' => $item->service_id,
                    'description' => $item->description,
                    'status' => WorkItem::PENDING,
                ]);
            }

            $this->transition($ro, RepairOrder::IN_PROGRESS, $actor,
                "Bắt đầu sửa chữa theo báo giá {$quotation->quotation_code}.");

            return $ro;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 7. WAITING_FOR_PARTS
    |--------------------------------------------------------------------------
    */
    public function markWaitingForParts(RepairOrder $ro, ?Account $actor, ?string $note = null): RepairOrder
    {
        $this->transition($ro, RepairOrder::WAITING_FOR_PARTS, $actor, $note ?? 'Đang chờ phụ tùng.');

        return $ro;
    }

    public function resumeFromWaitingForParts(RepairOrder $ro, ?Account $actor, ?string $note = null): RepairOrder
    {
        $this->transition($ro, RepairOrder::IN_PROGRESS, $actor, $note ?? 'Đã có đủ phụ tùng, tiếp tục sửa chữa.');

        return $ro;
    }

    /*
    |--------------------------------------------------------------------------
    | 8. Theo dõi sửa chữa: work items & phụ tùng thực dùng
    |--------------------------------------------------------------------------
    */
    public function updateWorkItemStatus(WorkItem $item, string $status): WorkItem
    {
        if (! in_array($status, [WorkItem::PENDING, WorkItem::IN_PROGRESS, WorkItem::COMPLETED, WorkItem::CANCELLED], true)) {
            throw InvalidStatusTransitionException::because('Trạng thái hạng mục công việc không hợp lệ.');
        }

        if (! in_array($item->repairOrder->status, [RepairOrder::IN_PROGRESS, RepairOrder::WAITING_FOR_PARTS], true)) {
            throw InvalidStatusTransitionException::because('Chỉ cập nhật hạng mục khi phiếu đang sửa chữa hoặc chờ phụ tùng.');
        }

        if ($item->status === WorkItem::CANCELLED && $status !== WorkItem::CANCELLED) {
            throw InvalidStatusTransitionException::because('Hạng mục đã hủy, không mở lại được.');
        }

        $item->status = $status;

        if ($status === WorkItem::IN_PROGRESS) {
            $item->started_at ??= now();
        }

        if ($status === WorkItem::COMPLETED) {
            $item->completed_at = now();
        }

        $item->save();

        return $item;
    }

    /**
     * Gán KTV thực hiện một hạng mục (truy vết ai sửa xe). KTV không cần tài khoản đăng nhập.
     * Ghi lịch sử phiếu khi đổi người để giải thích được lý do thay đổi.
     */
    public function assignWorkItemTechnician(WorkItem $item, TechnicianProfile $technician, ?Account $actor, ?string $reason = null): WorkItem
    {
        $this->assertTechnician($technician);

        $ro = $item->repairOrder;
        if (! in_array($ro->status, [RepairOrder::IN_PROGRESS, RepairOrder::WAITING_FOR_PARTS], true)) {
            throw InvalidStatusTransitionException::because('Chỉ phân công hạng mục khi phiếu đang sửa chữa hoặc chờ phụ tùng.');
        }

        if (in_array($item->status, [WorkItem::COMPLETED, WorkItem::CANCELLED], true)) {
            throw InvalidStatusTransitionException::because('Hạng mục đã kết thúc, không đổi người thực hiện.');
        }

        $previous = $item->technician?->employee?->full_name;
        $item->technician_id = $technician->id;
        $item->save();

        $name = $technician->employee?->full_name ?? "KTV #{$technician->id}";
        $note = $previous
            ? "Đổi người thực hiện \"{$item->description}\": {$previous} → {$name}".($reason ? " ({$reason})" : '').'.'
            : "Giao \"{$item->description}\" cho {$name}.";
        $this->logHistory($ro, $ro->status, $actor, $note);

        return $item->load('technician.employee');
    }

    /**
     * RULE: chỉ ghi nhận phụ tùng thực dùng nếu part_id nằm trong
     * các dòng PART đã được khách duyệt của báo giá mới nhất.
     * Ghi nhận = xuất kho: trừ inventories và tạo inventory_transactions loại OUT.
     */
    public function recordUsedPart(RepairOrder $ro, array $data): UsedPart
    {
        if ($ro->status !== RepairOrder::IN_PROGRESS) {
            throw InvalidStatusTransitionException::because('Chỉ ghi nhận phụ tùng thực dùng khi phiếu đang IN_PROGRESS.');
        }

        $approvedItem = $ro->latestQuotation?->items()
            ->where('item_type', QuotationItem::TYPE_PART)
            ->where('is_approved', true)
            ->where('part_id', $data['part_id'])
            ->first();

        if (! $approvedItem) {
            throw InvalidStatusTransitionException::because(
                'Phụ tùng phải nằm trong báo giá đã được khách duyệt mới được ghi nhận sử dụng.'
            );
        }

        return DB::transaction(function () use ($ro, $data, $approvedItem) {
            $inventory = Inventory::query()->where('part_id', $data['part_id'])->lockForUpdate()->first();
            $quantity = (int) $data['quantity'];

            if (! $inventory || $inventory->quantity < $quantity) {
                $inStock = $inventory->quantity ?? 0;
                throw InvalidStatusTransitionException::because(
                    "Không đủ tồn kho (còn {$inStock}). Chuyển phiếu sang chờ phụ tùng nếu cần."
                );
            }

            $usedPart = UsedPart::create([
                'repair_order_id' => $ro->id,
                'work_item_id' => $data['work_item_id'] ?? null,
                'part_id' => $data['part_id'],
                'quantity' => $quantity,
                'unit_price' => $data['unit_price'] ?? $approvedItem->unit_price,
                'used_at' => now(),
            ]);

            $inventory->decrement('quantity', $quantity);

            InventoryTransaction::create([
                'inventory_id' => $inventory->id,
                'repair_order_id' => $ro->id,
                'used_part_id' => $usedPart->id,
                'transaction_type' => InventoryTransaction::TYPE_OUT,
                'quantity' => $quantity,
                'note' => "Xuất kho cho phiếu {$ro->repair_order_code}.",
            ]);

            return $usedPart->load('part');
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 9. Review & Test (sub-state UI, không đổi cột status) + Hoàn thành
    |--------------------------------------------------------------------------
    */
    /**
     * Nghiệm thu (kiểm tra chất lượng) sau khi mọi hạng mục xong.
     * FAILED: bắt buộc ghi lý do; các hạng mục cần sửa lại ($reworkItemIds) mở lại về PENDING.
     *
     * @param  array<int, int>  $reworkItemIds
     */
    public function recordQualityCheck(RepairOrder $ro, ?Employee $checker, string $result, ?string $note, array $reworkItemIds, ?Account $actor): QualityCheck
    {
        if ($ro->status !== RepairOrder::IN_PROGRESS) {
            throw InvalidStatusTransitionException::because('Chỉ kiểm tra chất lượng khi phiếu đang sửa chữa (IN_PROGRESS).');
        }

        if ($this->hasUnfinishedWorkItems($ro)) {
            throw InvalidStatusTransitionException::because('Còn hạng mục công việc chưa hoàn thành, chưa thể kiểm tra chất lượng.');
        }

        if ($result === QualityCheck::FAILED && ! trim((string) $note)) {
            throw InvalidStatusTransitionException::because('Kiểm tra không đạt cần ghi rõ lỗi để sửa lại.');
        }

        return DB::transaction(function () use ($ro, $checker, $result, $note, $reworkItemIds, $actor) {
            $check = QualityCheck::create([
                'repair_order_id' => $ro->id,
                'checked_by_employee_id' => $checker?->id,
                'result' => $result,
                'note' => $note,
                'checked_at' => now(),
            ]);

            if ($result === QualityCheck::FAILED && $reworkItemIds) {
                $ro->workItems()->whereIn('id', $reworkItemIds)->update(['status' => WorkItem::PENDING, 'completed_at' => null]);
            }

            $this->logHistory($ro, RepairOrder::REVIEW_TEST, $actor, $result === QualityCheck::PASSED
                ? 'Kiểm tra chất lượng đạt.'.($note ? " {$note}" : '')
                : "Kiểm tra chất lượng không đạt, sửa lại: {$note}");

            return $check->load('checkedBy');
        });
    }

    public function completeRepairOrder(RepairOrder $ro, ?Account $actor, ?string $note = null): RepairOrder
    {
        if ($this->hasUnfinishedWorkItems($ro)) {
            throw InvalidStatusTransitionException::because('Còn hạng mục công việc chưa hoàn thành (PENDING/IN_PROGRESS).');
        }

        $check = QualityCheck::query()->where('repair_order_id', $ro->id)->latest('id')->first();
        $lastWorkDone = $ro->workItems()->max('completed_at');

        if (! $check || $check->result !== QualityCheck::PASSED || ($lastWorkDone && $check->checked_at->lt($lastWorkDone))) {
            throw InvalidStatusTransitionException::because('Cần kiểm tra chất lượng đạt (sau lần sửa cuối) trước khi hoàn thành phiếu.');
        }

        $this->transition($ro, RepairOrder::COMPLETED, $actor, $note ?? 'Hoàn tất toàn bộ công việc sửa chữa.');

        return $ro;
    }

    private function hasUnfinishedWorkItems(RepairOrder $ro): bool
    {
        return $ro->workItems()->whereIn('status', [WorkItem::PENDING, WorkItem::IN_PROGRESS])->exists();
    }

    /*
    |--------------------------------------------------------------------------
    | 10. Đóng phiếu (khách không tiếp tục)
    |--------------------------------------------------------------------------
    */
    public function closeRepairOrder(RepairOrder $ro, string $reason, string $note, ?Account $actor): RepairOrder
    {
        if (! in_array($reason, RepairOrder::CLOSE_REASONS, true)) {
            throw InvalidStatusTransitionException::because('close_reason không hợp lệ.');
        }

        $ro->close_reason = $reason;
        $this->transition($ro, RepairOrder::CLOSED, $actor, $note);

        return $ro;
    }

    /*
    |--------------------------------------------------------------------------
    | 11. Thanh toán
    |--------------------------------------------------------------------------
    */
    public function generateInvoice(RepairOrder $ro): Invoice
    {
        if ($ro->status !== RepairOrder::COMPLETED) {
            throw InvalidStatusTransitionException::because('Chỉ xuất hóa đơn khi Phiếu sửa chữa đã COMPLETED.');
        }

        if ($ro->invoice) {
            throw InvalidStatusTransitionException::because('Phiếu sửa chữa này đã có hóa đơn.');
        }

        return DB::transaction(function () use ($ro) {
            $invoice = Invoice::create([
                'repair_order_id' => $ro->id,
                'invoice_code' => $this->generateCode('INV'),
                'status' => Invoice::UNPAID,
            ]);

            $quotation = $ro->latestQuotation;
            $approvedItems = $quotation ? $quotation->items()->where('is_approved', true)->get() : collect();

            foreach ($approvedItems as $item) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'item_type' => $item->item_type,
                    'service_id' => $item->service_id,
                    'part_id' => $item->part_id,
                    'description' => $item->description,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'amount' => $item->amount,
                ]);
            }

            $invoice->discount_amount = $quotation?->discount_amount ?? 0;
            $subtotal = $invoice->items()->sum('amount');
            $invoice->subtotal = $subtotal;
            $invoice->total_amount = $subtotal - $invoice->discount_amount;
            $invoice->save();

            return $invoice->load('items');
        });
    }

    /**
     * DIRECT => coi như thu tiền ngay tại quầy, đánh SUCCESS luôn.
     * QR     => chờ cổng thanh toán xác nhận, tạo ở trạng thái PENDING.
     */
    public function recordPayment(Invoice $invoice, string $method, float $amount): Payment
    {
        if (! in_array($method, [Payment::DIRECT, Payment::QR], true)) {
            throw InvalidStatusTransitionException::because('Phương thức thanh toán phải là DIRECT hoặc QR.');
        }

        return DB::transaction(function () use ($invoice, $method, $amount) {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);

            if ($invoice->status === Invoice::PAID) {
                throw InvalidStatusTransitionException::because('Hóa đơn đã thanh toán đủ.');
            }

            $remaining = (float) $invoice->total_amount - (float) $invoice->totalPaid();
            if ($amount > $remaining + 0.001) {
                throw InvalidStatusTransitionException::because('Số tiền thanh toán vượt quá số còn phải trả.');
            }

            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'amount' => $amount,
                'payment_method' => $method,
                'qr_reference' => $method === Payment::QR ? Str::upper(Str::random(12)) : null,
                'status' => $method === Payment::DIRECT ? Payment::SUCCESS : Payment::PENDING,
                'paid_at' => $method === Payment::DIRECT ? now() : null,
            ]);

            $this->refreshInvoiceStatus($invoice);

            return $payment;
        });
    }

    /**
     * Webhook / xác nhận thủ công khi cổng thanh toán QR báo kết quả.
     */
    public function confirmQrPayment(Payment $payment, bool $success, ?string $transactionCode = null): Payment
    {
        if ($payment->payment_method !== Payment::QR) {
            throw InvalidStatusTransitionException::because('Chỉ xác nhận cho giao dịch QR.');
        }

        if ($payment->status !== Payment::PENDING) {
            throw InvalidStatusTransitionException::because('Giao dịch này không còn ở trạng thái PENDING.');
        }

        return DB::transaction(function () use ($payment, $success, $transactionCode) {
            $payment->status = $success ? Payment::SUCCESS : Payment::FAILED;
            $payment->transaction_code = $transactionCode;
            $payment->paid_at = $success ? now() : null;
            $payment->save();

            $this->refreshInvoiceStatus($payment->invoice);

            return $payment;
        });
    }

    private function refreshInvoiceStatus(Invoice $invoice): void
    {
        $invoice->refresh();
        $paid = (float) $invoice->totalPaid();

        $invoice->status = match (true) {
            $paid <= 0 => Invoice::UNPAID,
            $paid < (float) $invoice->total_amount => Invoice::PARTIALLY_PAID,
            default => Invoice::PAID,
        };
        $invoice->save();
    }

    /*
    |--------------------------------------------------------------------------
    | 12. Bàn giao xe
    |--------------------------------------------------------------------------
    */
    /**
     * Biên bản bàn giao: ghi người thực tế nhận xe (chủ xe hoặc người nhận hộ) và ghi chú tình trạng khi giao.
     */
    public function handOver(RepairOrder $ro, ?Account $actor, string $receiverName, ?string $receiverPhone = null, ?string $note = null): RepairOrder
    {
        $invoice = $ro->invoice;

        if (! $invoice || $invoice->status !== Invoice::PAID) {
            throw InvalidStatusTransitionException::because('Chỉ bàn giao xe khi hóa đơn đã thanh toán đủ (PAID).');
        }

        $ro->handed_over_to_name = $receiverName;
        $ro->handed_over_to_phone = $receiverPhone;
        $ro->handover_note = $note;

        $this->transition($ro, RepairOrder::HANDED_OVER, $actor, "Đã bàn giao xe cho {$receiverName}.");

        return $ro;
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers dùng chung
    |--------------------------------------------------------------------------
    */
    private function transition(RepairOrder $ro, string $to, ?Account $actor, ?string $note = null): void
    {
        if (! $ro->canTransitionTo($to)) {
            throw InvalidStatusTransitionException::forRepairOrder($ro->status, $to);
        }

        $ro->status = $to;

        match ($to) {
            RepairOrder::COMPLETED => $ro->completed_at = now(),
            RepairOrder::HANDED_OVER => $ro->handed_over_at = now(),
            RepairOrder::CLOSED => $ro->closed_at = now(),
            default => null,
        };

        $ro->save();

        // Phiếu xong/đóng thì KTV không còn bị tính là đang giữ phiếu này.
        if (in_array($to, [RepairOrder::COMPLETED, RepairOrder::CLOSED], true)) {
            $ro->assignments()
                ->whereIn('status', [Assignment::ASSIGNED, Assignment::IN_PROGRESS])
                ->update(['status' => $to === RepairOrder::COMPLETED ? Assignment::COMPLETED : Assignment::CANCELLED]);
        }

        $this->logHistory($ro, $to, $actor, $note);
    }

    private function logHistory(RepairOrder $ro, string $status, ?Account $actor, ?string $note = null): void
    {
        RepairOrderStatusHistory::create([
            'repair_order_id' => $ro->id,
            'status' => $status,
            'changed_by_account_id' => $actor?->id,
            'note' => $note,
        ]);
    }

    /**
     * Lịch hẹn chỉ được lập phiếu khi xe đã check-in, đúng khách/xe và chưa có phiếu.
     *
     * @param  array{customer_id: int|string, vehicle_id: int|string}  $data
     */
    private function assertAppointmentReadyForReceiving(int $appointmentId, array $data): void
    {
        $appointment = Appointment::query()->lockForUpdate()->find($appointmentId);

        if (! $appointment) {
            throw InvalidStatusTransitionException::because('Không tìm thấy lịch hẹn.');
        }

        if ($appointment->status !== 'CHECKED_IN') {
            throw InvalidStatusTransitionException::because(
                "Chỉ tạo phiếu sửa chữa khi lịch hẹn đã check-in (CHECKED_IN). Trạng thái hiện tại: {$appointment->status}."
            );
        }

        if ((int) $appointment->customer_id !== (int) $data['customer_id']
            || (int) $appointment->vehicle_id !== (int) $data['vehicle_id']) {
            throw InvalidStatusTransitionException::because('Khách hàng hoặc xe không khớp với lịch hẹn.');
        }

        $existing = RepairOrder::query()->where('appointment_id', $appointmentId)->first();

        if ($existing) {
            throw InvalidStatusTransitionException::because(
                "Lịch hẹn này đã có phiếu sửa chữa {$existing->repair_order_code}, không tạo phiếu thứ hai."
            );
        }
    }

    private function assertAdvisor(Employee $employee): void
    {
        if (! $employee->isAdvisor()) {
            throw InvalidStatusTransitionException::because('Thao tác này chỉ dành cho Cố vấn (ADVISOR).');
        }
    }

    private function assertTechnician(TechnicianProfile $technician): void
    {
        if (! $technician->isTechnician()) {
            throw InvalidStatusTransitionException::because('Nhân viên được chọn không có tài khoản vai trò TECHNICIAN.');
        }
    }

    private function assertRecommendationIsWellFormed(array $rec): void
    {
        if (! in_array($rec['item_type'] ?? null, [InspectionRecommendation::TYPE_SERVICE, InspectionRecommendation::TYPE_PART], true)) {
            throw InvalidStatusTransitionException::because('item_type của đề xuất phải là SERVICE hoặc PART.');
        }

        if ($rec['item_type'] === InspectionRecommendation::TYPE_SERVICE && empty($rec['service_id'])) {
            throw InvalidStatusTransitionException::because('Đề xuất SERVICE phải có service_id.');
        }

        if ($rec['item_type'] === InspectionRecommendation::TYPE_PART && empty($rec['part_id'])) {
            throw InvalidStatusTransitionException::because('Đề xuất PART phải có part_id.');
        }
    }

    private function generateCode(string $prefix): string
    {
        return sprintf('%s-%s-%s', $prefix, now()->format('Y'), Str::upper(Str::random(6)));
    }
}
