<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\RepairOrder;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard/summary?days=30 (Cố vấn, Quản trị)
     * Mọi số liệu tính trực tiếp từ DB tại thời điểm gọi; cách tính ghi trong "definitions".
     */
    public function summary(Request $request): JsonResponse
    {
        $days = min(max((int) $request->query('days', 30), 1), 365);
        $today = now()->toDateString();
        $from = now()->subDays($days - 1)->startOfDay();

        $orderCounts = RepairOrder::query()->select('status', DB::raw('count(*) as total'))->groupBy('status')->pluck('total', 'status');
        $count = fn (string ...$statuses) => (int) collect($statuses)->sum(fn ($status) => $orderCounts[$status] ?? 0);

        $readyForPickup = RepairOrder::query()->where('status', RepairOrder::COMPLETED)
            ->whereHas('invoice', fn ($query) => $query->where('status', Invoice::PAID))->count();

        $todayAppointments = Appointment::query()->whereDate('appointment_date', $today);
        $periodAppointments = Appointment::query()->where('created_at', '>=', $from);
        $periodTotal = (clone $periodAppointments)->count();
        $rate = fn (int $part) => $periodTotal ? round($part * 100 / $periodTotal, 1) : 0.0;

        $hours = DB::table('working_hours')->where('day_of_week', Carbon::parse($today)->dayOfWeek)->first();

        return response()->json([
            'generated_at' => now()->toIso8601String(),
            'period_days' => $days,
            'appointments' => [
                'today' => (clone $todayAppointments)->whereNotIn('status', ['CANCELLED'])->count(),
                'today_checked_in' => (clone $todayAppointments)->where('status', 'CHECKED_IN')->count(),
                'today_waiting_arrival' => (clone $todayAppointments)->where('status', 'CONFIRMED')->count(),
                'pending' => Appointment::query()->where('status', 'PENDING')->count(),
                'today_capacity' => $hours && $hours->is_active ? (int) $hours->max_slots : 0,
            ],
            'repair_orders' => [
                'in_garage' => $count(RepairOrder::RECEIVED, RepairOrder::INSPECTING, RepairOrder::QUOTING, RepairOrder::WAITING_APPROVAL, RepairOrder::IN_PROGRESS, RepairOrder::WAITING_FOR_PARTS, RepairOrder::COMPLETED),
                'waiting_diagnosis' => $count(RepairOrder::RECEIVED, RepairOrder::INSPECTING),
                'waiting_quotation' => $count(RepairOrder::QUOTING),
                'waiting_approval' => $count(RepairOrder::WAITING_APPROVAL),
                'in_progress' => $count(RepairOrder::IN_PROGRESS),
                'waiting_parts' => $count(RepairOrder::WAITING_FOR_PARTS),
                'waiting_payment' => $count(RepairOrder::COMPLETED) - $readyForPickup,
                'ready_for_pickup' => $readyForPickup,
            ],
            'period' => [
                'appointments' => $periodTotal,
                'cancel_rate' => $rate((clone $periodAppointments)->where('status', 'CANCELLED')->count()),
                'no_show_rate' => $rate((clone $periodAppointments)->where('status', 'NO_SHOW')->count()),
                'revenue' => (float) Payment::query()->where('status', Payment::SUCCESS)->where('paid_at', '>=', $from)->sum('amount'),
                'handed_over' => RepairOrder::query()->where('status', RepairOrder::HANDED_OVER)->where('handed_over_at', '>=', $from)->count(),
            ],
            'inventory' => [
                'low_stock' => Inventory::query()->whereColumn('quantity', '<=', 'min_quantity')->count(),
            ],
            'recent_orders' => RepairOrder::query()
                ->with(['customer:id,full_name', 'vehicle:id,license_plate'])
                ->latest('updated_at')->limit(5)
                ->get(['id', 'repair_order_code', 'status', 'customer_id', 'vehicle_id', 'updated_at']),
            'definitions' => [
                'appointments.today' => 'Lịch có ngày hẹn hôm nay, trừ lịch đã hủy.',
                'appointments.today_capacity' => 'Số suất tiếp nhận mỗi khung giờ hôm nay theo cấu hình giờ làm việc (0 nếu nghỉ).',
                'repair_orders.in_garage' => 'Phiếu chưa bàn giao và chưa đóng (xe còn ở gara).',
                'repair_orders.waiting_payment' => 'Phiếu đã hoàn thành nhưng hóa đơn chưa thanh toán đủ (hoặc chưa lập).',
                'repair_orders.ready_for_pickup' => 'Phiếu đã hoàn thành và hóa đơn PAID, chờ khách nhận xe.',
                'period.cancel_rate' => 'Số lịch tạo trong kỳ đang ở trạng thái CANCELLED / tổng số lịch tạo trong kỳ (%).',
                'period.no_show_rate' => 'Số lịch tạo trong kỳ ở trạng thái NO_SHOW / tổng số lịch tạo trong kỳ (%).',
                'period.revenue' => 'Tổng tiền các khoản thanh toán SUCCESS có thời điểm thu trong kỳ.',
                'inventory.low_stock' => 'Số mã phụ tùng có tồn kho ≤ mức cảnh báo (min_quantity).',
            ],
        ]);
    }
}
