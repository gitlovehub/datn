<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    /**
     * GET /api/services
     */
    public function index(Request $request): JsonResponse
    {
        $query = Service::query()->where('status', 'ACTIVE');

        // "Tất cả" là nhãn giao diện — coi như không lọc để FE cũ vẫn chạy.
        if ($request->filled('category') && $request->category !== 'Tất cả') {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        return response()->json($query->orderBy('category')->orderBy('name')->get());
    }

    /**
     * GET /api/services/{service}
     */
    public function show(Service $service): JsonResponse
    {
        // Dịch vụ đã ẩn không được lộ ra phía khách.
        abort_if($service->status !== 'ACTIVE', 404);

        return response()->json($service);
    }
}
