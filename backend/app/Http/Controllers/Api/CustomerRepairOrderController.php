<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Services\RepairOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerRepairOrderController extends Controller
{
    public function __construct(private readonly RepairOrderService $service) {}

    public function index(Request $request): JsonResponse
    {
        $customerId = $this->customerId($request);

        $query = RepairOrder::query()
            ->where('customer_id', $customerId)
            ->with(['vehicle.model.brand'])
            ->latest('received_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->paginate(20));
    }

    public function show(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorizeOwner($request, $repairOrder);

        $repairOrder->load([
            'vehicle.model.brand',
            'statusHistory',
            'quotations' => fn ($query) => $query->whereIn('status', [
                Quotation::SENT,
                Quotation::APPROVED,
                Quotation::PARTIALLY_APPROVED,
                Quotation::REJECTED,
            ]),
            'quotations.items',
            'workItems',
            'invoice.items',
            'invoice.payments',
        ]);

        return response()->json($repairOrder);
    }

    public function invoice(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorizeOwner($request, $repairOrder);

        return response()->json($repairOrder->invoice()->with('items', 'payments')->firstOrFail());
    }

    public function respondQuotation(Request $request, Quotation $quotation): JsonResponse
    {
        $this->authorizeOwner($request, $quotation->repairOrder);

        $data = $request->validate([
            'responses' => ['required', 'array', 'min:1'],
            'responses.*.item_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('quotation_items', 'id')
                    ->where(fn ($query) => $query->where('quotation_id', $quotation->id)),
            ],
            'responses.*.is_approved' => ['required', 'boolean'],
        ]);

        return response()->json($this->service->recordCustomerResponse($quotation, $data['responses']));
    }

    private function customerId(Request $request): int
    {
        $customerId = Customer::query()
            ->where('account_id', $request->user()->id)
            ->value('id');

        abort_if($customerId === null, 404);

        return (int) $customerId;
    }

    private function authorizeOwner(Request $request, RepairOrder $repairOrder): void
    {
        abort_if(
            (int) $repairOrder->customer_id !== $this->customerId($request),
            404
        );
    }
}
