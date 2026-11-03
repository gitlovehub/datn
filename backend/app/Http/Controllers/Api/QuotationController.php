<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Services\RepairOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuotationController extends Controller
{
    public function __construct(private readonly RepairOrderService $service) {}

    public function store(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate([
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'valid_until' => ['nullable', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_type' => ['required', 'string', 'in:SERVICE,PART'],
            'items.*.service_id' => ['nullable', 'integer', 'exists:services,id', 'required_if:items.*.item_type,SERVICE'],
            'items.*.part_id' => ['nullable', 'integer', 'exists:parts,id', 'required_if:items.*.item_type,PART'],
            'items.*.description' => ['nullable', 'string'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $advisor = $request->user()->employee;

        $quotation = $this->service->createQuotation(
            $repairOrder, $advisor, $data['items'], $data['discount_amount'] ?? 0, $data['valid_until'] ?? null
        );

        return response()->json($quotation, 201);
    }

    public function send(Request $request, Quotation $quotation): JsonResponse
    {
        $quotation = $this->service->sendQuotation($quotation, $request->user());

        return response()->json($quotation);
    }

    public function respond(Request $request, Quotation $quotation): JsonResponse
    {
        $data = $request->validate([
            'responses' => ['required', 'array', 'min:1'],
            'responses.*.item_id' => ['required', 'integer', 'exists:quotation_items,id'],
            'responses.*.is_approved' => ['required', 'boolean'],
        ]);

        $quotation = $this->service->recordCustomerResponse($quotation, $data['responses']);

        return response()->json($quotation);
    }
}
