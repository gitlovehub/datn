<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\RepairOrder;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerReviewController extends Controller
{
    /**
     * GET /api/me/reviews
     * Lấy danh sách đánh giá của khách hàng đang đăng nhập.
     */
    public function index(Request $request): JsonResponse
    {
        $customerId = $this->customerId($request);

        $reviews = Review::query()
            ->where('customer_id', $customerId)
            ->with(['repairOrder.vehicle.model.brand'])
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $reviews,
        ]);
    }

    /**
     * POST /api/me/reviews
     * Khách hàng gửi đánh giá cho 1 phiếu sửa chữa của mình.
     */
    public function store(Request $request): JsonResponse
    {
        $customerId = $this->customerId($request);

        $validated = $request->validate([
            'repair_order_id' => [
                'required',
                'integer',
                Rule::exists('repair_orders', 'id')
                    ->where('customer_id', $customerId)
                    ->where('status', RepairOrder::HANDED_OVER),
                Rule::unique('reviews', 'repair_order_id'),
            ],
            'overall_rating' => ['required', 'integer', 'min:1', 'max:5'],
            'advisor_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'technician_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ], [
            'repair_order_id.unique' => 'Phiếu sửa chữa này đã được bạn gửi đánh giá trước đó.',
            'repair_order_id.exists' => 'Chỉ đánh giá được phiếu sửa chữa của bạn sau khi đã bàn giao xe.',
        ]);

        $review = Review::create([
            'customer_id' => $customerId,
            'repair_order_id' => $validated['repair_order_id'],
            'overall_rating' => $validated['overall_rating'],
            'advisor_rating' => $validated['advisor_rating'] ?? null,
            'technician_rating' => $validated['technician_rating'] ?? null,
            'comment' => $validated['comment'] ?? null,
        ]);

        $review->load(['repairOrder.vehicle.model.brand']);

        return response()->json([
            'success' => true,
            'message' => 'Cảm ơn bạn đã gửi đánh giá dịch vụ.',
            'data' => $review,
        ], 201);
    }

    private function customerId(Request $request): int
    {
        $customerId = Customer::query()
            ->where('account_id', $request->user()->id)
            ->value('id');

        abort_if($customerId === null, 404, 'Không tìm thấy hồ sơ khách hàng.');

        return (int) $customerId;
    }
}
