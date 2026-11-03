<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Part;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PartController extends Controller
{
    /**
     * GET /api/parts?search=
     * Danh mục phụ tùng đang kinh doanh kèm tồn kho, dùng khi KTV đề xuất và Cố vấn lập báo giá.
     */
    public function index(Request $request): JsonResponse
    {
        $parts = Part::query()
            ->where('status', 'ACTIVE')
            ->when($request->filled('search'), fn ($query) => $query->where(fn ($inner) => $inner
                ->where('name', 'like', '%'.$request->query('search').'%')
                ->orWhere('sku', 'like', '%'.$request->query('search').'%')))
            ->with('inventory:id,part_id,quantity,min_quantity')
            ->orderBy('name')
            ->get();

        return response()->json($parts);
    }
}
