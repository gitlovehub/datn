<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->role === 'CUSTOMER';
    }

    public function rules(): array
    {
        return [
            'vehicle_id' => [
                'required_without:new_vehicle',
                'prohibited_unless:new_vehicle,null',
                'integer',
                'exists:vehicles,id',
            ],

            'new_vehicle' => [
                'required_without:vehicle_id',
                'prohibited_unless:vehicle_id,null',
                'array',
            ],

            'new_vehicle.brand' => ['required_with:new_vehicle', 'string', 'max:100'],
            'new_vehicle.model' => ['required_with:new_vehicle', 'string', 'max:100'],
            'new_vehicle.vehicle_type' => ['required_with:new_vehicle', Rule::in(['Sedan / Hatchback (4-5 chỗ)', 'SUV / Crossover (5-7 chỗ)', 'MPV', 'PICKUP'])],
            'new_vehicle.license_plate' => ['nullable', 'string', 'max:20', 'unique:vehicles,license_plate'],
            'appointment_date' => ['required', 'date_format:Y-m-d'],
            'appointment_time' => ['required', 'date_format:H:i'],
            'request_type' => ['required', Rule::in(['DIAGNOSIS', 'REPAIR', 'MAINTENANCE', 'REPLACEMENT'])],
            'symptom_description' => ['nullable', 'string', 'max:5000'],
            'note' => ['nullable', 'string', 'max:5000'],
            'service_ids' => ['sometimes', 'array'],
            'service_ids.*' => ['integer', 'distinct', Rule::exists('services', 'id')->where('status', 'ACTIVE')],
            'package_ids' => ['sometimes', 'array'],
            'package_ids.*' => ['integer', 'distinct', 'exists:maintenance_packages,id'],
            'service_name' => ['sometimes', Rule::in(['Bảo dưỡng định kỳ', 'Kiểm tra tổng quát', 'Thay dầu động cơ'])],
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
