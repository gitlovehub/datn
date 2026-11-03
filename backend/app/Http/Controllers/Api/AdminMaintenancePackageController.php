<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenancePackage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Quản trị gói bảo dưỡng. Xóa gói bằng cách chuyển status sang INACTIVE.
 */
class AdminMaintenancePackageController extends Controller
{
    private const WITH = ['vehicleModel', 'services', 'parts'];

    /**
     * GET /api/admin/maintenance-packages
     */
    public function index(Request $request): JsonResponse
    {
        $query = MaintenancePackage::query()->with(self::WITH);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('vehicle_model_id')) {
            $query->where('vehicle_model_id', $request->input('vehicle_model_id'));
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->input('search') . '%');
        }

        $packages = $query->latest('id')->paginate(10);
        $packages->getCollection()->each->withComputedFields();

        return $this->ok('Lấy danh sách gói bảo dưỡng thành công.', $packages);
    }

    /**
     * GET /api/admin/maintenance-packages/{maintenancePackage}
     */
    public function show(MaintenancePackage $maintenancePackage): JsonResponse
    {
        return $this->ok(
            'Lấy thông tin gói bảo dưỡng thành công.',
            $this->fresh($maintenancePackage)
        );
    }

    /**
     * POST /api/admin/maintenance-packages
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());

        if (! array_key_exists('status', $validated) || $validated['status'] === null) {
            $validated['status'] = 'ACTIVE';
        }

        $package = DB::transaction(function () use ($validated): MaintenancePackage {
            $package = MaintenancePackage::query()->create(
                collect($validated)->except(['services', 'parts'])->all()
            );

            $this->syncItems($package, $validated);

            return $this->fresh($package);
        });

        return $this->ok('Thêm gói bảo dưỡng thành công.', $package, 201);
    }

    /**
     * PUT/PATCH /api/admin/maintenance-packages/{maintenancePackage}
     */
    public function update(Request $request, MaintenancePackage $maintenancePackage): JsonResponse
    {
        $validated = $request->validate($this->rules(partial: true));

        $package = DB::transaction(function () use ($maintenancePackage, $validated): MaintenancePackage {
            $maintenancePackage->update(
                collect($validated)->except(['services', 'parts'])->all()
            );

            $this->syncItems($maintenancePackage, $validated);

            return $this->fresh($maintenancePackage);
        });

        return $this->ok('Cập nhật gói bảo dưỡng thành công.', $package);
    }

    /**
     * PUT /api/admin/maintenance-packages/{maintenancePackage}/services
     */
    public function syncServices(Request $request, MaintenancePackage $maintenancePackage): JsonResponse
    {
        $validated = $request->validate([
            'services' => ['present', 'array'],
            'services.*.service_id' => ['required', 'integer', 'distinct', 'exists:services,id'],
            'services.*.quantity' => ['nullable', 'integer', 'min:1'],
        ]);

        $package = DB::transaction(function () use ($maintenancePackage, $validated): MaintenancePackage {
            $this->syncItems($maintenancePackage, $validated);

            return $this->fresh($maintenancePackage);
        });

        return $this->ok('Cập nhật dịch vụ của gói thành công.', $package);
    }

    /**
     * PUT /api/admin/maintenance-packages/{maintenancePackage}/parts
     */
    public function syncParts(Request $request, MaintenancePackage $maintenancePackage): JsonResponse
    {
        $validated = $request->validate([
            'parts' => ['present', 'array'],
            'parts.*.part_id' => ['required', 'integer', 'distinct', 'exists:parts,id'],
            'parts.*.quantity' => ['nullable', 'integer', 'min:1'],
        ]);

        $package = DB::transaction(function () use ($maintenancePackage, $validated): MaintenancePackage {
            $this->syncItems($maintenancePackage, $validated);

            return $this->fresh($maintenancePackage);
        });

        return $this->ok('Cập nhật phụ tùng của gói thành công.', $package);
    }

    /**
     * DELETE /api/admin/maintenance-packages/{maintenancePackage}
     */
    public function destroy(MaintenancePackage $maintenancePackage): JsonResponse
    {
        $maintenancePackage->update(['status' => 'INACTIVE']);

        return $this->ok(
            'Đã ẩn gói bảo dưỡng (xóa mềm, status = INACTIVE).',
            $this->fresh($maintenancePackage)
        );
    }

    private function rules(bool $partial = false): array
    {
        $required = $partial ? ['sometimes', 'required'] : ['required'];

        return [
            'vehicle_model_id' => ['sometimes', 'nullable', 'integer', 'exists:vehicle_models,id'],
            'name' => [...$required, 'string', 'max:150'],
            'mileage_milestone' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'month_milestone' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => $partial
                ? ['sometimes', 'required', Rule::in(['ACTIVE', 'INACTIVE'])]
                : ['sometimes', 'nullable', Rule::in(['ACTIVE', 'INACTIVE'])],
            'services' => ['sometimes', 'array'],
            'services.*.service_id' => ['required', 'integer', 'distinct', 'exists:services,id'],
            'services.*.quantity' => ['nullable', 'integer', 'min:1'],
            'parts' => ['sometimes', 'array'],
            'parts.*.part_id' => ['required', 'integer', 'distinct', 'exists:parts,id'],
            'parts.*.quantity' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * Sync only the pivot collections present in the validated payload.
     *
     * @param  array<string, mixed>  $validated
     */
    private function syncItems(MaintenancePackage $package, array $validated): void
    {
        if (array_key_exists('services', $validated)) {
            $package->services()->sync($this->pivotPayload($validated['services'], 'service_id'));
        }

        if (array_key_exists('parts', $validated)) {
            $package->parts()->sync($this->pivotPayload($validated['parts'], 'part_id'));
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array{quantity: int}>
     */
    private function pivotPayload(array $rows, string $key): array
    {
        $payload = [];

        foreach ($rows as $row) {
            $payload[$row[$key]] = ['quantity' => $row['quantity'] ?? 1];
        }

        return $payload;
    }

    private function fresh(MaintenancePackage $package): MaintenancePackage
    {
        return $package->refresh()->load(self::WITH)->withComputedFields();
    }

    private function ok(string $message, mixed $data, int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }
}
