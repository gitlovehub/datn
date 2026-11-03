<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\QualityCheck;
use App\Models\RepairOrder;
use App\Models\TechnicianProfile;
use App\Services\RepairOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RepairOrderController extends Controller
{
    public function __construct(private readonly RepairOrderService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = RepairOrder::query()->with(['customer', 'vehicle', 'advisor']);

        if ($request->user()?->role === Account::ROLE_TECHNICIAN) {
            $employeeId = $request->user()->employee?->id;

            if (! $employeeId) {
                $query->whereRaw('0 = 1');
            } else {
                $query->whereHas('assignments.technician', function ($q) use ($employeeId): void {
                    $q->where('employee_id', $employeeId);
                });
            }
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->latest('received_at')->paginate(20));
    }

    public function show(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        if ($request->user()?->role === Account::ROLE_TECHNICIAN) {
            $employeeId = $request->user()->employee?->id;

            if (! $employeeId || ! $repairOrder->assignments()->whereHas('technician', function ($q) use ($employeeId): void {
                $q->where('employee_id', $employeeId);
            })->exists()) {
                return response()->json([
                    'message' => 'Bạn không có quyền xem phiếu sửa chữa này.',
                ], 403);
            }
        }

        $repairOrder->load([
            'customer', 'vehicle', 'advisor', 'statusHistory.changedByAccount',
            'assignments.technician.employee', 'inspections.items', 'inspections.recordedBy', 'inspections.technician.employee', 'inspections.recommendations.service', 'inspections.recommendations.part',
            'quotations.items', 'workItems.technician.employee', 'workItems.service', 'usedParts.part', 'invoice.items', 'invoice.payments', 'qualityChecks.checkedBy',
        ]);

        return response()->json($repairOrder);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
            'mileage_received' => ['nullable', 'integer', 'min:0'],
            'initial_condition' => ['nullable', 'string'],
            'note' => ['nullable', 'string'],
        ]);

        $advisor = $request->user()->employee;

        if (! $advisor) {
            return response()->json(['message' => 'Tài khoản chưa gắn với hồ sơ nhân viên.'], 403);
        }

        $ro = $this->service->receive($data, $advisor);

        return response()->json($ro, 201);
    }

    public function assignTechnician(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate([
            'technician_id' => ['required', 'integer', 'exists:technician_profiles,id'],
            'note' => ['nullable', 'string'],
        ]);

        $technician = TechnicianProfile::findOrFail($data['technician_id']);

        $assignment = $this->service->assignTechnician(
            $repairOrder, $technician, $request->user(), $data['note'] ?? null
        );

        return response()->json($assignment, 201);
    }

    public function startRepair(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $ro = $this->service->startRepair($repairOrder, $request->user());

        return response()->json($ro->load('workItems'));
    }

    public function markWaitingForParts(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate(['note' => ['nullable', 'string']]);

        $ro = $this->service->markWaitingForParts($repairOrder, $request->user(), $data['note'] ?? null);

        return response()->json($ro);
    }

    public function resume(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate(['note' => ['nullable', 'string']]);

        $ro = $this->service->resumeFromWaitingForParts($repairOrder, $request->user(), $data['note'] ?? null);

        return response()->json($ro);
    }

    /**
     * POST /repair-orders/{id}/review: ghi kết quả kiểm tra chất lượng (nghiệm thu).
     */
    public function review(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate([
            'result' => ['required', 'in:'.QualityCheck::PASSED.','.QualityCheck::FAILED],
            'note' => ['nullable', 'string', 'max:1000'],
            'rework_item_ids' => ['nullable', 'array'],
            'rework_item_ids.*' => ['integer', Rule::exists('work_items', 'id')->where('repair_order_id', $repairOrder->id)],
        ], [
            'result.required' => 'Chọn kết quả kiểm tra chất lượng.',
            'rework_item_ids.*.exists' => 'Hạng mục sửa lại không thuộc phiếu này.',
        ]);

        $check = $this->service->recordQualityCheck(
            $repairOrder, $request->user()->employee, $data['result'], $data['note'] ?? null, $data['rework_item_ids'] ?? [], $request->user()
        );

        return response()->json($check, 201);
    }

    public function complete(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate(['note' => ['nullable', 'string']]);

        $ro = $this->service->completeRepairOrder($repairOrder, $request->user(), $data['note'] ?? null);

        return response()->json($ro);
    }

    public function close(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate([
            'close_reason' => ['required', 'string', 'in:'.implode(',', RepairOrder::CLOSE_REASONS)],
            'note' => ['required', 'string'],
        ]);

        $ro = $this->service->closeRepairOrder(
            $repairOrder, $data['close_reason'], $data['note'], $request->user()
        );

        return response()->json($ro);
    }

    public function handOver(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate([
            'receiver_name' => ['required', 'string', 'max:100'],
            'receiver_phone' => ['nullable', 'string', 'max:20'],
            'note' => ['nullable', 'string', 'max:1000'],
        ], ['receiver_name.required' => 'Ghi tên người nhận xe (chủ xe hoặc người nhận hộ).']);

        $ro = $this->service->handOver($repairOrder, $request->user(), $data['receiver_name'], $data['receiver_phone'] ?? null, $data['note'] ?? null);

        return response()->json($ro);
    }
}
