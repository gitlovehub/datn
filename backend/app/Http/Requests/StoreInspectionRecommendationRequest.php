<?php

namespace App\Http\Requests;

use App\Models\InspectionRecommendation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInspectionRecommendationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Hỗ trợ gửi mảng recommendations
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

            // Hoặc gửi 1 recommendation trực tiếp ở root object
            'item_type' => ['required_without:recommendations', 'string', Rule::in([
                InspectionRecommendation::TYPE_SERVICE,
                InspectionRecommendation::TYPE_PART,
            ])],
            'service_id' => [
                'required_if:item_type,'.InspectionRecommendation::TYPE_SERVICE,
                'nullable',
                'integer',
                'exists:services,id',
            ],
            'part_id' => [
                'required_if:item_type,'.InspectionRecommendation::TYPE_PART,
                'nullable',
                'integer',
                'exists:parts,id',
            ],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'note' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'item_type.required_without' => 'Vui lòng chọn loại đề xuất (SERVICE hoặc PART).',
            'item_type.in' => 'Loại đề xuất phải là SERVICE hoặc PART.',
            'service_id.required_if' => 'Vui lòng chọn dịch vụ đề xuất.',
            'service_id.exists' => 'Dịch vụ đề xuất không tồn tại trong hệ thống.',
            'part_id.required_if' => 'Vui lòng chọn phụ tùng đề xuất.',
            'part_id.exists' => 'Phụ tùng đề xuất không tồn tại trong hệ thống.',
            'quantity.min' => 'Số lượng đề xuất phải lớn hơn hoặc bằng 1.',
            'recommendations.*.item_type.required_with' => 'Loại đề xuất không được để trống.',
            'recommendations.*.item_type.in' => 'Loại đề xuất phải là SERVICE hoặc PART.',
            'recommendations.*.service_id.required_if' => 'Vui lòng chọn dịch vụ đề xuất.',
            'recommendations.*.service_id.exists' => 'Dịch vụ đề xuất không tồn tại trong hệ thống.',
            'recommendations.*.part_id.required_if' => 'Vui lòng chọn phụ tùng đề xuất.',
            'recommendations.*.part_id.exists' => 'Phụ tùng đề xuất không tồn tại trong hệ thống.',
            'recommendations.*.quantity.min' => 'Số lượng đề xuất phải lớn hơn hoặc bằng 1.',
        ];
    }
}
