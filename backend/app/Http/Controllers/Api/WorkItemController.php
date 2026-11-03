<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\RepairOrder;
use App\Models\TechnicianProfile;
use App\Models\WorkItem;
use App\Services\RepairOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkItemController extends Controller
{
    public function __construct(private readonly RepairOrderService $service) {}

    public function index(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        if ($request->user()?->role === Account::ROLE_TECHNICIAN) {
            $employeeId = $request->user()->employee?->id;

            if (! $employeeId || ! $repairOrder->assignments()->whereHas('technician', function ($q) use ($employeeId): void {
                $q->where('employee_id', $employeeId);
            })->exists()) {
                return response()->json([
                    'message' => 'Bạn không có quyền xem công việc của phiếu sửa chữa này.',
                ], 403);
            }
        }

        return response()->json(
            $repairOrder->workItems()->with(['technician.employee', 'usedParts.part'])->get()
        );
    }

    public function updateStatus(Request $request, WorkItem $workItem): JsonResponse
    {
        if ($request->user()?->role === Account::ROLE_TECHNICIAN) {
            $employeeId = $request->user()->employee?->id;

            $hasAccess = $workItem->repairOrder()->whereHas('assignments.technician', function ($q) use ($employeeId): void {
                $q->where('employee_id', $employeeId);
            })->exists();

            if (! $employeeId || ! $hasAccess) {
                return response()->json([
                    'message' => 'Bạn không có quyền cập nhật trạng thái công việc này.',
                ], 403);
            }
        }

        $data = $request->validate([
            'status' => ['required', 'string', 'in:PENDING,IN_PROGRESS,COMPLETED,CANCELLED'],
        ]);

        $item = $this->service->updateWorkItemStatus($workItem, $data['status']);

        return response()->json($item);
    }

    public function storeUsedPart(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        if ($request->user()?->role === Account::ROLE_TECHNICIAN) {
            $employeeId = $request->user()->employee?->id;

            if (! $employeeId || ! $repairOrder->assignments()->whereHas('technician', function ($q) use ($employeeId): void {
                $q->where('employee_id', $employeeId);
            })->exists()) {
                return response()->json([
                    'message' => 'Bạn không có quyền ghi nhận phụ tùng cho phiếu sửa chữa này.',
                ], 403);
            }
        }

        $data = $request->validate([
            'work_item_id' => ['nullable', 'integer', 'exists:work_items,id'],
            'part_id' => ['required', 'integer', 'exists:parts,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $usedPart = $this->service->recordUsedPart($repairOrder, $data);

        return response()->json($usedPart, 201);
    }

    /**
     * PATCH /api/work-items/{workItem}/technician (Cố vấn): chọn KTV thực hiện hạng mục.
     */
    public function assignTechnician(Request $request, WorkItem $workItem): JsonResponse
    {
        $data = $request->validate([
            'technician_id' => ['required', 'integer', 'exists:technician_profiles,id'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $item = $this->service->assignWorkItemTechnician(
            $workItem,
            TechnicianProfile::findOrFail($data['technician_id']),
            $request->user(),
            $data['reason'] ?? null,
        );

        return response()->json($item);
    }
}
