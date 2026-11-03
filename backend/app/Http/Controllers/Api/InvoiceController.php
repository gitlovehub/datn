<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RepairOrder;
use App\Services\RepairOrderService;
use Illuminate\Http\JsonResponse;

class InvoiceController extends Controller
{
    public function __construct(private readonly RepairOrderService $service) {}

    public function store(RepairOrder $repairOrder): JsonResponse
    {
        $invoice = $this->service->generateInvoice($repairOrder);

        return response()->json($invoice, 201);
    }

    public function show(RepairOrder $repairOrder): JsonResponse
    {
        return response()->json($repairOrder->invoice()->with('items', 'payments')->firstOrFail());
    }
}
