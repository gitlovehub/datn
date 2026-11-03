<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdvisorAppointmentController extends Controller
{
    /**
     * Danh sách lịch hẹn toàn garage dành cho Cố vấn/Admin
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Appointment::with([
                'customer:id,full_name,phone,email',
                'vehicle:id,license_plate,model_id,variant,year',
                'vehicle.model.brand:id,name',
                'services:id,name,base_price',
                'packages:id,name,mileage_milestone',
            ]);

            // Lọc theo ngày hẹn cụ thể (YYYY-MM-DD)
            if ($request->filled('date')) {
                $query->whereDate('appointment_date', $request->query('date'));
            }

            // Lọc theo trạng thái (PENDING, CONFIRMED, CHECKED_IN, CANCELLED)
            if ($request->filled('status')) {
                $query->where('status', $request->query('status'));
            }

            // Tìm kiếm theo biển số xe hoặc tên/SĐT khách hàng
            if ($request->filled('search')) {
                $search = $request->query('search');
                $query->where(function ($q) use ($search) {
                    $q->whereHas('vehicle', function ($v) use ($search) {
                        $v->where('license_plate', 'like', "%{$search}%");
                    })
                        ->orWhereHas('customer', function ($c) use ($search) {
                            $c->where('full_name', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%");
                        })
                        ->orWhere('appointment_code', 'like', "%{$search}%");
                });
            }

            // Mặc định sắp xếp ngày gần nhất lên trước
            $appointments = $query->orderBy('appointment_date', 'asc')
                ->orderBy('appointment_time', 'asc')
                ->paginate($request->query('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $appointments->items(),
                'pagination' => [
                    'current_page' => $appointments->currentPage(),
                    'per_page' => $appointments->perPage(),
                    'total' => $appointments->total(),
                    'last_page' => $appointments->lastPage(),
                ],
            ], Response::HTTP_OK);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Xem chi tiết 1 lịch hẹn bất kỳ
     */
    public function show(int $id): JsonResponse
    {
        $appointment = Appointment::with([
            'customer',
            'vehicle.model.brand',
            'services',
            'packages',
        ])->find($id);

        if (! $appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy lịch hẹn.',
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'success' => true,
            'data' => $appointment,
        ], Response::HTTP_OK);
    }

    /**
     * Cố vấn duyệt / xác nhận lịch hẹn (PENDING -> CONFIRMED)
     */
    public function confirm(int $id): JsonResponse
    {
        $appointment = Appointment::find($id);

        if (! $appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy lịch hẹn.',
            ], Response::HTTP_NOT_FOUND);
        }

        if ($appointment->status !== 'PENDING') {
            return response()->json([
                'success' => false,
                'message' => "Chỉ có thể xác nhận lịch hẹn đang ở trạng thái PENDING. Trạng thái hiện tại: {$appointment->status}",
            ], Response::HTTP_BAD_REQUEST);
        }

        $appointment->update([
            'status' => 'CONFIRMED',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Xác nhận lịch hẹn thành công.',
            'data' => $appointment->fresh(),
        ], Response::HTTP_OK);
    }

    /**
     * Tiếp nhận xe tại garage (CONFIRMED -> CHECKED_IN)
     */
    public function checkIn(int $id): JsonResponse
    {
        $appointment = Appointment::find($id);

        if (! $appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy lịch hẹn.',
            ], Response::HTTP_NOT_FOUND);
        }

        if ($appointment->status !== 'CONFIRMED') {
            return response()->json([
                'success' => false,
                'message' => "Chỉ có thể tiếp nhận xe khi lịch hẹn đã được duyệt (CONFIRMED). Trạng thái hiện tại: {$appointment->status}",
            ], Response::HTTP_BAD_REQUEST);
        }

        $appointment->update([
            'status' => 'CHECKED_IN',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tiếp nhận xe vào garage thành công. Sẵn sàng lập Lệnh sửa chữa.',
            'data' => $appointment->fresh(),
        ], Response::HTTP_OK);
    }

    /**
     * Cố vấn từ chối hoặc hủy lịch hẹn
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'cancel_reason' => 'required|string|max:255',
        ]);

        $appointment = Appointment::find($id);

        if (! $appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy lịch hẹn.',
            ], Response::HTTP_NOT_FOUND);
        }

        if (in_array($appointment->status, ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'])) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể hủy lịch hẹn đã tiếp nhận hoặc đã hủy trước đó.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $appointment->update([
            'status' => 'CANCELLED',
            'cancel_reason' => $request->input('cancel_reason'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã hủy lịch hẹn thành công.',
            'data' => $appointment->fresh(),
        ], Response::HTTP_OK);
    }

    /**
     * Đánh dấu khách không đến (CONFIRMED -> NO_SHOW).
     * Chỉ cho phép khi đã quá giờ hẹn cộng thời gian chờ (config carservice.no_show_grace_minutes),
     * để khách đến muộn trong khoảng chờ vẫn được check-in. Suất của lịch NO_SHOW được trả lại.
     */
    public function noShow(int $id): JsonResponse
    {
        $appointment = Appointment::find($id);

        if (! $appointment) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy lịch hẹn.'], Response::HTTP_NOT_FOUND);
        }

        if ($appointment->status !== 'CONFIRMED') {
            return response()->json([
                'success' => false,
                'message' => "Chỉ đánh dấu không đến cho lịch đã xác nhận (CONFIRMED). Trạng thái hiện tại: {$appointment->status}",
            ], Response::HTTP_BAD_REQUEST);
        }

        $grace = config('carservice.no_show_grace_minutes');
        $deadline = Carbon::parse(Carbon::parse($appointment->appointment_date)->toDateString().' '.$appointment->appointment_time)->addMinutes($grace);

        if (now()->lessThan($deadline)) {
            return response()->json([
                'success' => false,
                'message' => "Chưa quá giờ hẹn {$grace} phút, khách vẫn có thể đến muộn. Có thể đánh dấu sau ".$deadline->format('H:i d/m/Y').'.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $appointment->update(['status' => 'NO_SHOW']);

        return response()->json([
            'success' => true,
            'message' => 'Đã đánh dấu khách không đến.',
            'data' => $appointment->fresh(),
        ], Response::HTTP_OK);
    }
}
