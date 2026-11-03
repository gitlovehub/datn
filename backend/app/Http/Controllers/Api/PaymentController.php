<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\RepairOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private readonly RepairOrderService $service) {}

    public function store(Request $request, Invoice $invoice): JsonResponse
    {
        // Giai đoạn demo: chỉ thu tiền mặt tại quầy, Cố vấn xác nhận đã nhận tiền (chưa tích hợp VNPay/QR).
        $data = $request->validate([
            'payment_method' => ['sometimes', 'string', 'in:'.Payment::DIRECT],
            'amount' => ['required', 'numeric', 'min:0.01'],
        ], [
            'payment_method.in' => 'Hiện chỉ hỗ trợ thanh toán tiền mặt tại quầy (DIRECT).',
        ]);

        $payment = $this->service->recordPayment($invoice, Payment::DIRECT, (float) $data['amount']);

        return response()->json($payment, 201);
    }

    public function confirmQr(Request $request, Payment $payment): JsonResponse
    {
        $data = $request->validate([
            'success' => ['required', 'boolean'],
            'transaction_code' => ['nullable', 'string'],
        ]);

        $payment = $this->service->confirmQrPayment($payment, $data['success'], $data['transaction_code'] ?? null);

        return response()->json($payment);
    }
}
