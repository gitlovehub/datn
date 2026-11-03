<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $fullName = $this->input('full_name');
        $phone = $this->input('phone');
        $email = $this->input('email');

        if (is_string($fullName)) {
            $this->merge(['full_name' => trim($fullName)]);
        }

        if (is_string($phone)) {
            $this->merge(['phone' => trim($phone)]);
        }

        if (is_string($email)) {
            $this->merge(['email' => strtolower(trim($email))]);
        }
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:100'],
            'phone' => [
                'required',
                'string',
                'regex:/^(0|\+84)[3|5|7|8|9][0-9]{8}$/',
                'max:20',
            ],
            'email' => ['required', 'email', 'max:150', 'unique:accounts,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed', 'max:255'],
            'device_name' => ['nullable', 'string', 'max:100'],
            'accept_terms' => ['required', 'accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'full_name.required' => 'Họ và tên không được để trống.',
            'phone.required' => 'Số điện thoại không được để trống.',
            'phone.regex' => 'Số điện thoại không đúng định dạng Việt Nam.',
            'email.required' => 'Email không được để trống.',
            'email.email' => 'Email không đúng định dạng.',
            'email.unique' => 'Email này đã được sử dụng.',
            'password.required' => 'Mật khẩu không được để trống.',
            'password.min' => 'Mật khẩu phải có ít nhất 8 ký tự.',
            'password.confirmed' => 'Mật khẩu xác nhận không khớp.',
            'accept_terms.required' => 'Bạn phải đồng ý với điều khoản sử dụng.',
            'accept_terms.accepted' => 'Bạn phải đồng ý với điều khoản sử dụng.',
        ];
    }
}
