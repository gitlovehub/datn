<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WorkingHoursController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => DB::table('working_hours')
                ->whereBetween('day_of_week', [0, 6])
                ->orderBy('day_of_week')
                ->get(),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'open_time' => ['required', 'date_format:H:i'],
            'close_time' => ['required', 'date_format:H:i', 'after:open_time'],
            'max_slots' => ['required', 'integer', 'min:0', 'max:100'],
            'is_active' => ['required', 'boolean'],
        ]);

        $workingHour = DB::table('working_hours')
            ->where('id', $id)
            ->whereBetween('day_of_week', [0, 6])
            ->first();

        if (!$workingHour) {
            return response()->json([
                'message' => 'Không tìm thấy cấu hình giờ làm việc.',
            ], 404);
        }

        if ($data['is_active'] && $data['max_slots'] < 1) {
            throw ValidationException::withMessages([
                'max_slots' => ['Ngày hoạt động phải có ít nhất 1 lịch mỗi khung giờ.'],
            ]);
        }

        DB::table('working_hours')
            ->where('id', $id)
            ->update($data);

        return response()->json([
            'message' => 'Cập nhật giờ làm việc thành công.',
            'data' => DB::table('working_hours')->where('id', $id)->first(),
        ]);
    }
}