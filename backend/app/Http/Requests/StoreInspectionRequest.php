<?php

namespace App\Http\Requests;

use App\Models\InspectionItem;
use App\Models\InspectionRecommendation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInspectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $allowedStatuses = [
            InspectionItem::PASSED,
            InspectionItem::WARNING,
            InspectionItem::FAILED,
            InspectionItem::NORMAL,
            InspectionItem::NEEDS_SERVICE,
            InspectionItem::NEEDS_REPLACEMENT,
        ];

        return [
            // KTV thực hiện kiểm tra (Cố vấn nhập thay). Bỏ trống thì dùng KTV đang phụ trách phiếu nếu có.
            'technician_id' => ['nullable', 'integer', 'exists:technician_profiles,id'],
            'condition_description' => ['nullable', 'string'],
            'diagnosis' => ['nullable', 'string'],

            // Chấp nhận cả key 'inspection_items' hoặc 'items'
            'inspection_items' => ['required_without:items', 'array'],
            'inspection_items.*.item_name' => ['required_with:inspection_items', 'string', 'max:150'],
            'inspection_items.*.status' => ['required_with:inspection_items', 'string', Rule::in($allowedStatuses)],
            'inspection_items.*.condition_description' => ['nullable', 'string', 'max:255'],
            'inspection_items.*.note' => ['nullable', 'string'],

            'items' => ['required_without:inspection_items', 'array'],
            'items.*.item_name' => ['required_with:items', 'string', 'max:150'],
            'items.*.status' => ['nullable', 'string', Rule::in($allowedStatuses)],
            'items.*.condition_status' => ['nullable', 'string', Rule::in($allowedStatuses)],
            'items.*.condition_description' => ['nullable', 'string', 'max:255'],
            'items.*.note' => ['nullable', 'string'],

            // Đề xuất phụ tùng / dịch vụ đi kèm (tùy chọn)
            'recommendations' => ['nullable', 'array'],
            'recommendations.*.item_type' => ['required_with:recommendations', 'string', Rule::in([
                InspectionRecommendation::TYPE_SERVICE,
                InspectionRecommendation::TYPE_PART,
            ])],
            'recommendations.*.service_id' => [
                'required_if:recommendations.*.item_type,'.InspectionRecommendation::TYPE_SERVICE,
                'nullable',
                'integer',
                'exists:services,id',
            ],
            'recommendations.*.part_id' => [
                'required_if:recommendations.*.item_type,'.InspectionRecommendation::TYPE_PART,
                'nullable',
                'integer',
                'exists:parts,id',
            ],
            'recommendations.*.quantity' => ['nullable', 'integer', 'min:1'],
            'recommendations.*.note' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'inspection_items.required_without' => 'Vui lòng cung cấp danh sách hạng mục kiểm tra.',
            'items.required_without' => 'Vui lòng cung cấp danh sách hạng mục kiểm tra.',
            'inspection_items.*.item_name.required_with' => 'Tên hạng mục kiểm tra không được để trống.',
            'inspection_items.*.status.required_with' => 'Tình trạng hạng mục kiểm tra không được để trống.',
            'inspection_items.*.status.in' => 'Tình trạng hạng mục kiểm tra phải là PASSED, WARNING hoặc FAILED.',
            'items.*.item_name.required_with' => 'Tên hạng mục kiểm tra không được để trống.',
            'items.*.status.in' => 'Tình trạng hạng mục kiểm tra phải là PASSED, WARNING hoặc FAILED.',
            'items.*.condition_status.in' => 'Tình trạng hạng mục kiểm tra không hợp lệ.',
            'recommendations.*.item_type.required_with' => 'Loại đề xuất không được để trống (SERVICE hoặc PART).',
            'recommendations.*.item_type.in' => 'Loại đề xuất phải là SERVICE hoặc PART.',
            'recommendations.*.service_id.required_if' => 'Vui lòng chọn dịch vụ đề xuất.',
            'recommendations.*.service_id.exists' => 'Dịch vụ đề xuất không tồn tại trong hệ thống.',
            'recommendations.*.part_id.required_if' => 'Vui lòng chọn phụ tùng đề xuất.',
            'recommendations.*.part_id.exists' => 'Phụ tùng đề xuất không tồn tại trong hệ thống.',
            'recommendations.*.quantity.min' => 'Số lượng đề xuất phải lớn hơn hoặc bằng 1.',
        ];
    }
}
