<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Advisor / Admin
    |--------------------------------------------------------------------------
    */

    /**
     * GET /api/customers
     * Danh sách khách hàng + tìm kiếm + phân trang.
     */
    public function index(Request $request)
    {
        $query = Customer::query();

        if ($request->filled('search')) {
            $search = trim($request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $customers = $query
            ->orderByDesc('id')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách khách hàng thành công.',
            'data' => $customers,
        ]);
    }

    /**
     * POST /api/customers
     * Cố vấn/Admin tạo hồ sơ khách hàng.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:100'],

            'phone' => [
                'required',
                'string',
                'max:20',
                Rule::unique('customers', 'phone'),
            ],

            'email' => [
                'nullable',
                'email',
                'max:150',
                Rule::unique('customers', 'email'),
            ],

            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $customer = Customer::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Thêm khách hàng thành công.',
            'data' => $customer,
        ], 201);
    }

    /**
     * GET /api/customers/{id}
     * Xem chi tiết khách hàng.
     */
    public function show(int $id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy khách hàng.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin khách hàng thành công.',
            'data' => $customer,
        ]);
    }

    /**
     * PUT/PATCH /api/customers/{id}
     * Cập nhật thông tin khách hàng.
     */
    public function update(Request $request, int $id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy khách hàng.',
            ], 404);
        }

        $validated = $request->validate([
            'full_name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
            ],

            'phone' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                Rule::unique('customers', 'phone')->ignore($customer->id),
            ],

            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:150',
                Rule::unique('customers', 'email')->ignore($customer->id),
            ],

            'address' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],
        ]);

        $customer->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật khách hàng thành công.',
            'data' => $customer->fresh(),
        ]);
    }

    /**
     * DELETE /api/customers/{customer}
     * Xóa khách hàng.
     * Quyền truy cập được kiểm soát ở routes/api.php.
     */
    public function destroy(int $id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy khách hàng.',
            ], 404);
        }

        $customer->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa khách hàng thành công.',
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | Customer - Hồ sơ cá nhân
    |--------------------------------------------------------------------------
    */

    /**
     * GET /api/me/customer
     * Khách hàng xem hồ sơ của chính mình.
     */
    public function me(Request $request)
    {
        $customer = $request->user()
            ->customer()
            ->first();

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ khách hàng.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin cá nhân thành công.',
            'data' => $customer,
        ]);
    }

    /**
     * PUT /api/me/customer
     * Khách hàng cập nhật hồ sơ của chính mình.
     */
    public function updateMe(Request $request)
    {
        $customer = $request->user()
            ->customer()
            ->first();

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ khách hàng.',
            ], 404);
        }

        $validated = $request->validate([
            'full_name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
            ],

            'phone' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                Rule::unique('customers', 'phone')->ignore($customer->id),
            ],

            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:150',
                Rule::unique('customers', 'email')->ignore($customer->id),
            ],

            'address' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],
        ]);

        $customer->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông tin cá nhân thành công.',
            'data' => $customer->fresh(),
        ]);
    }
}