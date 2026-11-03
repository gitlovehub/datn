<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenancePackage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * API công khai cho khách: chỉ trả gói ACTIVE, kèm dịch vụ/phụ tùng và giá ước tính.
 * CRUD quản trị nằm ở AdminMaintenancePackageController.
 */
class MaintenancePackageController extends Controller
{
    /**
     * GET /api/maintenance-packages
     *
     * ?model_id= : lấy gói của dòng xe đó và các gói dùng chung.
     */
    public function index(Request $request): JsonResponse
    {
        $query = MaintenancePackage::query()
            ->with(['services', 'parts'])
            ->where('status', 'ACTIVE');

        if ($request->filled('model_id')) {
            $query->where(function ($query) use ($request): void {
                $query->whereNull('vehicle_model_id')
                    ->orWhere('vehicle_model_id', $request->input('model_id'));
            });
        }

        $packages = $query->orderBy('mileage_milestone')
            ->get()
            ->each->withComputedFields();

        return response()->json($packages);
    }

    /**
     * GET /api/maintenance-packages/{maintenancePackage}
     */
    public function show(MaintenancePackage $maintenancePackage): JsonResponse
    {
        abort_if($maintenancePackage->status !== 'ACTIVE', 404);

        $maintenancePackage->load(['services', 'parts'])
            ->withComputedFields();

        return response()->json($maintenancePackage);
    }
}
