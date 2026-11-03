<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Quản trị danh mục dịch vụ. Xóa dịch vụ bằng cách chuyển status sang INACTIVE
 * để giữ nguyên các tham chiếu từ dữ liệu lịch sử.
 */
class AdminServiceController extends Controller
{
    /**
     * GET /api/admin/services
     */
    public function index(Request $request): JsonResponse
    {
        $query = Service::query();

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->input('search') . '%');
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách dịch vụ thành công.',
            'data' => $query->latest('id')->paginate(10),
        ]);
    }

    /**
     * GET /api/admin/services/{service}
     */
    public function show(Service $service): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin dịch vụ thành công.',
            'data' => $service,
        ]);
    }

    /**
     * POST /api/admin/services
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150', Rule::unique('services', 'name')],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'estimated_minutes' => ['nullable', 'integer', 'min:1'],
            'status' => ['sometimes', 'required', Rule::in(['ACTIVE', 'INACTIVE'])],
        ]);

        $validated['status'] ??= 'ACTIVE';
        $service = Service::query()->create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Thêm dịch vụ thành công.',
            'data' => $service,
        ], 201);
    }

    /**
     * PUT/PATCH /api/admin/services/{service}
     */
    public function update(Request $request, Service $service): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:150',
                Rule::unique('services', 'name')->ignore($service->id),
            ],
            'category' => ['sometimes', 'nullable', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],
            'base_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'estimated_minutes' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'status' => ['sometimes', 'required', Rule::in(['ACTIVE', 'INACTIVE'])],
        ]);

        $service->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật dịch vụ thành công.',
            'data' => $service->fresh(),
        ]);
    }

    /**
     * DELETE /api/admin/services/{service} — soft delete.
     */
    public function destroy(Service $service): JsonResponse
    {
        $service->update(['status' => 'INACTIVE']);

        return response()->json([
            'success' => true,
            'message' => 'Đã ẩn dịch vụ (xóa mềm, status = INACTIVE).',
            'data' => $service->fresh(),
        ]);
    }
}
