<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'vehicle_id' => ['sometimes', 'integer', Rule::exists('vehicles', 'id')->whereNull('deleted_at')],
            'appointment_date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:today'],
            'appointment_time' => ['sometimes', 'date_format:H:i'],
            'request_type' => ['sometimes', Rule::in(['DIAGNOSIS', 'REPAIR', 'MAINTENANCE', 'REPLACEMENT'])],
            'symptom_description' => ['nullable', 'string', 'max:1000'],
            'note' => ['nullable', 'string', 'max:500'],
            'service_ids' => ['nullable', 'array'],
            'service_ids.*' => ['integer', 'distinct', Rule::exists('services', 'id')->where('status', 'ACTIVE')],
            'package_ids' => ['nullable', 'array'],
            'package_ids.*' => ['integer', 'distinct', 'exists:maintenance_packages,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'vehicle_id.required_without' => 'Vui lòng chọn xe có sẵn hoặc khai báo xe mới.',
            'vehicle_id.prohibited_unless' => 'Chỉ chọn xe có sẵn hoặc khai báo xe mới, không chọn cả hai.',
            'vehicle_id.integer' => 'Xe đã chọn không hợp lệ.',
            'vehicle_id.exists' => 'Xe không tồn tại hoặc đã bị xóa.',
            'new_vehicle.required_without' => 'Vui lòng chọn xe có sẵn hoặc khai báo xe mới.',
            'new_vehicle.prohibited_unless' => 'Chỉ chọn xe có sẵn hoặc khai báo xe mới, không chọn cả hai.',
            'new_vehicle.brand.required_with' => 'Vui lòng nhập hãng xe.',
            'new_vehicle.model.required_with' => 'Vui lòng nhập dòng xe.',
            'new_vehicle.vehicle_type.required_with' => 'Vui lòng chọn loại xe.',
            'new_vehicle.vehicle_type.in' => 'Loại xe không hợp lệ.',
            'new_vehicle.license_plate.unique' => 'Biển số đã tồn tại.',
            'new_vehicle.license_plate.max' => 'Biển số không được quá 20 ký tự.',
            'appointment_date.required' => 'Vui lòng chọn ngày hẹn.',
            'appointment_date.date_format' => 'Ngày hẹn phải đúng định dạng YYYY-MM-DD.',
            'appointment_date.after_or_equal' => 'Ngày hẹn không được ở quá khứ.',
            'appointment_time.required' => 'Vui lòng chọn giờ hẹn.',
            'appointment_time.date_format' => 'Giờ hẹn phải đúng định dạng HH:MM (ví dụ 09:00).',
            'request_type.required' => 'Vui lòng chọn loại yêu cầu.',
            'request_type.in' => 'Loại yêu cầu không hợp lệ.',
            'symptom_description.max' => 'Mô tả triệu chứng quá dài.',
            'note.max' => 'Ghi chú quá dài.',
            'service_ids.*.exists' => 'Dịch vụ đã chọn không tồn tại hoặc ngừng hoạt động.',
            'service_ids.*.distinct' => 'Dịch vụ bị chọn trùng.',
            'package_ids.*.exists' => 'Gói bảo dưỡng đã chọn không tồn tại.',
            'package_ids.*.distinct' => 'Gói bảo dưỡng bị chọn trùng.',
            'service_name.in' => 'Dịch vụ đã chọn không hợp lệ.',
        ];
    }
}
