<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VehicleController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | ADMIN / ADVISOR - QUẢN LÝ XE
    |--------------------------------------------------------------------------
    */

    /**
     * GET /api/vehicles
     *
     * Lấy danh sách xe.
     * Có thể lọc theo customer_id hoặc tìm kiếm.
     */
    public function index(Request $request)
    {
        $query = Vehicle::with(['customer', 'model']);

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('license_plate', 'like', "%{$search}%")
                    ->orWhere('vin', 'like', "%{$search}%")
                    ->orWhere('variant', 'like', "%{$search}%");
            });
        }

        $vehicles = $query
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách xe thành công.',
            'data' => $vehicles,
        ]);
    }

    /**
     * POST /api/vehicles
     *
     * Admin/Advisor thêm xe cho khách hàng.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => [
                'required',
                'exists:customers,id',
            ],

            'model_id' => [
                'required',
                'exists:vehicle_models,id',
            ],

            'variant' => [
                'nullable',
                'string',
                'max:100',
            ],

            'year' => [
                'nullable',
                'integer',
                'min:1900',
                'max:'.(date('Y') + 1),
            ],

            'license_plate' => [
                'nullable',
                'string',
                'max:20',
                'unique:vehicles,license_plate',
            ],

            'vin' => [
                'nullable',
                'string',
                'max:50',
                'unique:vehicles,vin',
            ],

            'mileage' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'note' => [
                'nullable',
                'string',
            ],
        ]);

        $vehicle = Vehicle::create($validated);

        $vehicle->load([
            'customer',
            'model',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Thêm xe thành công.',
            'data' => $vehicle,
        ], 201);
    }

    /**
     * GET /api/vehicles/{vehicle}
     *
     * Xem chi tiết xe.
     */
    public function show(Vehicle $vehicle)
    {
        $vehicle->load([
            'customer',
            'model',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin xe thành công.',
            'data' => $vehicle,
        ]);
    }

    /**
     * PUT/PATCH /api/vehicles/{vehicle}
     *
     * Admin/Advisor cập nhật xe.
     */
    public function update(Request $request, Vehicle $vehicle)
    {
        $validated = $request->validate([
            'customer_id' => [
                'sometimes',
                'exists:customers,id',
            ],

            'model_id' => [
                'sometimes',
                'exists:vehicle_models,id',
            ],

            'variant' => [
                'nullable',
                'string',
                'max:100',
            ],

            'year' => [
                'nullable',
                'integer',
                'min:1900',
                'max:'.(date('Y') + 1),
            ],

            'license_plate' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('vehicles', 'license_plate')
                    ->ignore($vehicle->id),
            ],

            'vin' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('vehicles', 'vin')
                    ->ignore($vehicle->id),
            ],

            'mileage' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'note' => [
                'nullable',
                'string',
            ],
        ]);

        $vehicle->update($validated);

        $vehicle->load([
            'customer',
            'model',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật xe thành công.',
            'data' => $vehicle,
        ]);
    }

    /**
     * DELETE /api/vehicles/{vehicle}
     *
     * Admin/Advisor xóa xe.
     */
    public function destroy(Vehicle $vehicle)
    {
        if ($blocked = $this->activeUsageResponse($vehicle)) {
            return $blocked;
        }

        $vehicle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa xe thành công.',
        ]);
    }

    /**
     * GET /api/customers/{customerId}/vehicles
     *
     * Admin/Advisor xem xe của một khách hàng.
     */
    public function byCustomer($customerId)
    {
        $vehicles = Vehicle::with('model')
            ->where('customer_id', $customerId)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách xe của khách hàng thành công.',
            'data' => $vehicles,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER - QUẢN LÝ XE CỦA CHÍNH MÌNH
    |--------------------------------------------------------------------------
    |
    | Không nhận customer_id từ phía client.
    | Customer được xác định từ Bearer Token:
    |
    | Account đăng nhập
    |      ↓
    | Customer
    |      ↓
    | customer_id
    |
    */

    /**
     * GET /api/me/vehicles
     *
     * Customer xem danh sách xe của chính mình.
     */
    public function myVehicles(Request $request)
    {
        $customer = $this->getAuthenticatedCustomer($request);

        if (! $customer) {
            return $this->customerProfileNotFoundResponse();
        }

        $vehicles = Vehicle::with('model')
            ->where('customer_id', $customer->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách xe của bạn thành công.',
            'data' => $vehicles,
        ]);
    }

    /**
     * POST /api/me/vehicles
     *
     * Customer tự thêm xe.
     *
     * customer_id KHÔNG lấy từ request.
     */
    public function storeMyVehicle(Request $request)
    {
        $customer = $this->getAuthenticatedCustomer($request);

        if (! $customer) {
            return $this->customerProfileNotFoundResponse();
        }

        $modelNames = [
            'Vios',
            'Camry',
            'Corolla Altis',
            'Raize',
            'Corolla Cross',
            'Fortuner',
            'Innova Cross',
            'Hilux',
        ];
        $validated = $request->validate([
            'model_id' => [
                'nullable',
                'required_without:model_name',
                'exists:vehicle_models,id',
            ],
            'model_name' => [
                'nullable',
                'required_without:model_id',
                Rule::in($modelNames),
            ],

            'variant' => [
                'nullable',
                'string',
                'max:100',
            ],

            'year' => [
                'nullable',
                'integer',
                'min:1900',
                'max:'.(date('Y') + 1),
            ],

            'license_plate' => [
                'nullable',
                'string',
                'max:20',
                'unique:vehicles,license_plate',
            ],

            'vin' => [
                'nullable',
                'string',
                'max:50',
                'unique:vehicles,vin',
            ],

            'mileage' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'note' => [
                'nullable',
                'string',
            ],
        ]);

        if (! empty($validated['model_name'])) {
            $brand = VehicleBrand::firstOrCreate(
                ['name' => 'Toyota'],
                ['status' => 'ACTIVE'],
            );
            $model = VehicleModel::firstOrCreate([
                'brand_id' => $brand->id,
                'name' => $validated['model_name'],
            ]);
            $validated['model_id'] = $model->id;
            unset($validated['model_name']);
        }

        // Không cho client tự chọn customer_id.
        $validated['customer_id'] = $customer->id;

        $vehicle = Vehicle::create($validated);

        $vehicle->load('model');

        return response()->json([
            'success' => true,
            'message' => 'Thêm xe của bạn thành công.',
            'data' => $vehicle,
        ], 201);
    }

    /**
     * GET /api/me/vehicles/{vehicle}
     *
     * Customer chỉ xem được xe thuộc chính mình.
     */
    public function showMyVehicle(Request $request, Vehicle $vehicle)
    {
        $customer = $this->getAuthenticatedCustomer($request);

        if (! $customer) {
            return $this->customerProfileNotFoundResponse();
        }

        if ((int) $vehicle->customer_id !== (int) $customer->id) {
            return $this->vehicleForbiddenResponse();
        }

        $vehicle->load('model');

        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin xe thành công.',
            'data' => $vehicle,
        ]);
    }

    /**
     * PATCH /api/me/vehicles/{vehicle}
     *
     * Customer chỉ sửa xe thuộc chính mình.
     *
     * Không cho phép sửa customer_id.
     */
    public function updateMyVehicle(
        Request $request,
        Vehicle $vehicle
    ) {
        $customer = $this->getAuthenticatedCustomer($request);

        if (! $customer) {
            return $this->customerProfileNotFoundResponse();
        }

        if ((int) $vehicle->customer_id !== (int) $customer->id) {
            return $this->vehicleForbiddenResponse();
        }

        $validated = $request->validate([
            'model_id' => [
                'sometimes',
                'exists:vehicle_models,id',
            ],

            'variant' => [
                'nullable',
                'string',
                'max:100',
            ],

            'year' => [
                'nullable',
                'integer',
                'min:1900',
                'max:'.(date('Y') + 1),
            ],

            'license_plate' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('vehicles', 'license_plate')
                    ->ignore($vehicle->id),
            ],

            'vin' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('vehicles', 'vin')
                    ->ignore($vehicle->id),
            ],

            'mileage' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'note' => [
                'nullable',
                'string',
            ],
        ]);

        $vehicle->update($validated);

        $vehicle->load('model');

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật xe của bạn thành công.',
            'data' => $vehicle,
        ]);
    }

    /**
     * DELETE /api/me/vehicles/{vehicle}
     *
     * Customer chỉ xóa được xe thuộc chính mình.
     */
    public function destroyMyVehicle(
        Request $request,
        Vehicle $vehicle
    ) {
        $customer = $this->getAuthenticatedCustomer($request);

        if (! $customer) {
            return $this->customerProfileNotFoundResponse();
        }

        if ((int) $vehicle->customer_id !== (int) $customer->id) {
            return $this->vehicleForbiddenResponse();
        }

        if ($blocked = $this->activeUsageResponse($vehicle)) {
            return $blocked;
        }

        $vehicle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa xe của bạn thành công.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | PRIVATE HELPERS
    |--------------------------------------------------------------------------
    */

    /**
     * Lấy Customer tương ứng với Account đang đăng nhập.
     */
    private function getAuthenticatedCustomer(Request $request)
    {
        $account = $request->user();

        if (! $account) {
            return null;
        }

        return $account->customer;
    }

    /**
     * Response khi Account CUSTOMER chưa có hồ sơ Customer.
     */
    private function customerProfileNotFoundResponse()
    {
        return response()->json([
            'success' => false,
            'message' => 'Không tìm thấy hồ sơ khách hàng của tài khoản này.',
        ], 404);
    }

    /**
     * Response khi Customer cố truy cập xe của người khác.
     */
    private function vehicleForbiddenResponse()
    {
        return response()->json([
            'success' => false,
            'message' => 'Bạn không có quyền truy cập xe này.',
        ], 403);
    }

    /**
     * Xe đang có lịch chờ/đã xác nhận hoặc đang nằm trong gara (phiếu chưa bàn giao/đóng) thì không được ẩn.
     * Xóa là xóa mềm (deleted_at): lịch sử lịch hẹn, phiếu sửa chữa, hóa đơn vẫn giữ nguyên.
     */
    private function activeUsageResponse(Vehicle $vehicle): ?JsonResponse
    {
        if (Appointment::query()->where('vehicle_id', $vehicle->id)->whereIn('status', ['PENDING', 'CONFIRMED'])->exists()) {
            return response()->json(['success' => false, 'message' => 'Xe đang có lịch hẹn chưa hoàn tất. Hủy lịch trước khi xóa xe.'], 422);
        }

        if (RepairOrder::query()->where('vehicle_id', $vehicle->id)->whereNotIn('status', [RepairOrder::HANDED_OVER, RepairOrder::CLOSED])->exists()) {
            return response()->json(['success' => false, 'message' => 'Xe đang nằm trong gara (phiếu sửa chữa chưa bàn giao), chưa thể xóa.'], 422);
        }

        return null;
    }
}
