<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use App\Mail\EmailVerificationOtpMail;
use App\Models\EmailVerificationOtp;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\PasswordResetOtpMail;
use App\Models\PasswordResetOtp;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['email'] = strtolower(trim((string) $data['email']));
        $data['full_name'] = trim((string) $data['full_name']);
        $data['phone'] = trim((string) $data['phone']);

        $account = DB::transaction(function () use ($data) {
            $account = Account::query()->create([
                'email' => $data['email'],
                'password_hash' => Hash::make($data['password']),
                'role' => Account::ROLE_CUSTOMER,
                'status' => Account::STATUS_PENDING,
            ]);

            // Luôn tạo hồ sơ riêng; chỉ liên kết hồ sơ walk-in sau khi xác thực OTP email.
            Customer::query()->create([
                'account_id' => $account->id,
                'full_name' => $data['full_name'],
                'phone' => $data['phone'],
                'email' => $data['email'],
            ]);

            return $account;
        });

        $otp = (string) random_int(100000, 999999);

        EmailVerificationOtp::query()
            ->where('account_id', $account->id)
            ->whereNull('used_at')
            ->delete();

        EmailVerificationOtp::query()->create([
            'account_id' => $account->id,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(5),
        ]);

        Log::info("[OTP ĐĂNG KÝ] Email: {$account->email} | Mã OTP: {$otp}");

        try {
            Mail::to($account->email)->send(new EmailVerificationOtpMail($otp));
        } catch (\Throwable $e) {
            Log::error("[OTP EMAIL ERROR] " . $e->getMessage());
        }

        return response()->json([
            'message' => 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.',
            'email' => $account->email,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $email = strtolower(trim((string) $data['email']));
        $account = Account::query()->whereRaw('LOWER(email) = ?', [$email])->first();

        if (! $account || ! Hash::check($data['password'], $account->getAuthPassword())) {
            throw ValidationException::withMessages([
                'email' => ['Email hoặc mật khẩu không đúng.'],
            ]);
        }

        if ($account->status === Account::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'email' => [
                    'Tài khoản chưa xác thực email. Vui lòng nhập mã OTP.'
                ],
            ]);
        }

        if (! $account->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['Tài khoản đang bị khóa hoặc ngừng hoạt động.'],
            ]);
        }

        // Frontend React luôn xác thực bằng Bearer token (local và deploy như nhau)
        $token = $account->createToken(
            $data['device_name'] ?? 'carservice-web'
        )->plainTextToken;

        return response()->json([
            'token' => $token,
            'account' => $this->formatAccount($account),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'account' => $this->formatAccount($this->authenticatedAccount($request)),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $account = $this->authenticatedAccount($request);
        $accessToken = $account->currentAccessToken();

        if ($accessToken instanceof PersonalAccessToken) {
            $accessToken->delete();
        }

        return response()->json(['message' => 'Đã đăng xuất.']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $account = $this->authenticatedAccount($request);

        $validated = $request->validate([
            'full_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'avatar' => ['sometimes', 'nullable', 'string'],
        ], [
            'full_name.max' => 'Họ và tên không được vượt quá 100 ký tự.',
            'phone.max' => 'Số điện thoại không được vượt quá 20 ký tự.',
            'address.max' => 'Địa chỉ không được vượt quá 255 ký tự.',
        ]);

        if (array_key_exists('avatar', $validated)) {
            $account->avatar = $validated['avatar'];
            $account->save();
        }

        if ($account->role === Account::ROLE_CUSTOMER) {
            if (!$account->customer) {
                Customer::query()->create([
                    'account_id' => $account->id,
                    'full_name' => $validated['full_name'] ?? 'Khách hàng',
                    'phone' => $validated['phone'] ?? '',
                    'email' => $account->email,
                    'address' => $validated['address'] ?? null,
                ]);
            } else {
                $customerUpdates = [];
                if (array_key_exists('full_name', $validated) && $validated['full_name'] !== null) {
                    $customerUpdates['full_name'] = $validated['full_name'];
                }
                if (array_key_exists('phone', $validated) && $validated['phone'] !== null) {
                    $customerUpdates['phone'] = $validated['phone'];
                }
                if (array_key_exists('address', $validated)) {
                    $customerUpdates['address'] = $validated['address'];
                }
                if (!empty($customerUpdates)) {
                    $account->customer->update($customerUpdates);
                }
            }
        } else {
            if (!$account->employee) {
                Employee::query()->create([
                    'account_id' => $account->id,
                    'full_name' => $validated['full_name'] ?? 'Nhân viên',
                    'phone' => $validated['phone'] ?? '',
                    'status' => 'ACTIVE',
                ]);
            } else {
                $employeeUpdates = [];
                if (array_key_exists('full_name', $validated) && $validated['full_name'] !== null) {
                    $employeeUpdates['full_name'] = $validated['full_name'];
                }
                if (array_key_exists('phone', $validated) && $validated['phone'] !== null) {
                    $employeeUpdates['phone'] = $validated['phone'];
                }
                if (!empty($employeeUpdates)) {
                    $account->employee->update($employeeUpdates);
                }
            }
        }

        $freshAccount = $account->fresh(['employee.technicianProfile', 'customer']);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông tin thành công.',
            'account' => $this->formatAccount($freshAccount),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $account = $this->authenticatedAccount($request);

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
            ],
            'new_password_confirmation' => ['required', 'string'],
        ], [
            'current_password.required' => 'Vui lòng nhập mật khẩu hiện tại.',
            'new_password.required' => 'Vui lòng nhập mật khẩu mới.',
            'new_password.min' => 'Mật khẩu mới phải có ít nhất 8 ký tự.',
            'new_password.confirmed' => 'Xác nhận mật khẩu mới không khớp.',
            'new_password.regex' => 'Mật khẩu mới phải bao gồm chữ thường, chữ hoa và chữ số.',
            'new_password_confirmation.required' => 'Vui lòng xác nhận mật khẩu mới.',
        ]);

        if (!Hash::check($validated['current_password'], $account->getAuthPassword())) {
            throw ValidationException::withMessages([
                'current_password' => ['Mật khẩu hiện tại không chính xác.'],
            ]);
        }

        if (Hash::check($validated['new_password'], $account->getAuthPassword())) {
            throw ValidationException::withMessages([
                'new_password' => ['Mật khẩu mới không được trùng với mật khẩu hiện tại.'],
            ]);
        }

        $account->password_hash = Hash::make($validated['new_password']);
        $account->save();

        return response()->json([
            'success' => true,
            'message' => 'Đổi mật khẩu thành công.',
        ]);
    }

    private function authenticatedAccount(Request $request): Account
    {
        $account = $request->user();

        if (! ($account instanceof Account)) {
            throw new AuthenticationException;
        }

        return $account;
    }

    /**
     * @return array<string, mixed>
     */
    private function formatAccount(Account $account): array
    {
        $account->loadMissing(['employee.technicianProfile', 'customer']);

        return [
            'id' => $account->id,
            'email' => $account->email,
            'role' => $account->role,
            'status' => $account->status,
            'avatar' => $account->avatar,
            'created_at' => $account->created_at,
            'employee' => $account->employee ? [
                'id' => $account->employee->id,
                'full_name' => $account->employee->full_name,
                'phone' => $account->employee->phone,
                'technician_profile_id' => $account->employee->technicianProfile?->id,
            ] : null,
            'customer' => $account->customer ? [
                'id' => $account->customer->id,
                'full_name' => $account->customer->full_name,
                'phone' => $account->customer->phone,
                'email' => $account->customer->email,
                'address' => $account->customer->address,
            ] : null,
        ];
    }

    public function verifyEmailOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'digits:6'],
        ]);

        $email = strtolower(trim($data['email']));

        $account = Account::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (! $account) {
            throw ValidationException::withMessages([
                'email' => ['Không tìm thấy tài khoản.'],
            ]);
        }

        $otpRecord = EmailVerificationOtp::query()
            ->where('account_id', $account->id)
            ->whereNull('used_at')
            ->latest('id')
            ->first();

        if (! $otpRecord) {
            throw ValidationException::withMessages([
                'otp' => ['Không tìm thấy mã OTP. Vui lòng yêu cầu gửi lại mã.'],
            ]);
        }

        if ($otpRecord->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'otp' => ['Mã OTP đã hết hạn.'],
            ]);
        }

        if (! Hash::check($data['otp'], $otpRecord->otp_hash)) {
            throw ValidationException::withMessages([
                'otp' => ['Mã OTP không chính xác.'],
            ]);
        }

        DB::transaction(function () use ($account, $otpRecord) {
            $otpRecord->update([
                'used_at' => now(),
            ]);

            if ($account->email_verified_at === null) {
                $account->update([
                    'email_verified_at' => now(),
                    'status' => Account::STATUS_ACTIVE,
                ]);

                $this->linkWalkInCustomerByVerifiedEmail($account);
            }
        });

        $token = $account->createToken('default')->plainTextToken;

        return response()->json([
            'message' => 'Xác thực email thành công.',
            'token' => $token,
            'account' => $this->formatAccount($account->fresh()),
        ]);
    }

    private function linkWalkInCustomerByVerifiedEmail(Account $account): void
    {
        $walkInCustomer = Customer::query()
            ->whereNull('account_id')
            ->whereRaw('LOWER(email) = ?', [strtolower(trim($account->email))])
            ->lockForUpdate()
            ->first();

        if (! $walkInCustomer) {
            return;
        }

        $existingCustomer = Customer::withTrashed()
            ->where('account_id', $account->id)
            ->first();

        if ($existingCustomer) {
            $hasData = $existingCustomer->vehicles()->withTrashed()->exists()
                || $existingCustomer->appointments()->exists()
                || $existingCustomer->repairOrders()->exists();

            if ($hasData) {
                return;
            }

            $existingCustomer->forceDelete();
        }

        $walkInCustomer->update([
            'account_id' => $account->id,
            'email' => strtolower(trim((string) $account->email)),
        ]);
    }

    public function resendEmailOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower(trim($data['email']));

        $account = Account::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (! $account) {
            throw ValidationException::withMessages([
                'email' => ['Không tìm thấy tài khoản.'],
            ]);
        }

        $otp = (string) random_int(100000, 999999);

        EmailVerificationOtp::query()
            ->where('account_id', $account->id)
            ->whereNull('used_at')
            ->delete();

        EmailVerificationOtp::query()->create([
            'account_id' => $account->id,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(5),
        ]);

        Log::info("[OTP GỬI LẠI] Email: {$account->email} | Mã OTP: {$otp}");

        try {
            Mail::to($account->email)->send(new EmailVerificationOtpMail($otp));
        } catch (\Throwable $e) {
            Log::error("[OTP EMAIL ERROR] " . $e->getMessage());
        }

        return response()->json([
            'message' => 'Mã OTP mới đã được gửi đến email.',
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $account = Account::whereRaw('LOWER(email) = ?', [
            strtolower($request->email)
        ])->first();

        // Không tiết lộ email có tồn tại trong hệ thống hay không
        if (!$account) {
            return response()->json([
                'message' => 'Nếu email tồn tại trong hệ thống, mã OTP sẽ được gửi đến email.'
            ]);
        }

        // Hủy các OTP cũ chưa sử dụng
        PasswordResetOtp::where('account_id', $account->id)
            ->whereNull('used_at')
            ->delete();

        // Tạo OTP 6 số
        $otp = (string) random_int(100000, 999999);

        // Lưu OTP dưới dạng hash
        PasswordResetOtp::create([
            'account_id' => $account->id,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(5),
        ]);

        Log::info("[OTP QUÊN MẬT KHẨU] Email: {$account->email} | Mã OTP: {$otp}");

        try {
            Mail::to($account->email)->send(new PasswordResetOtpMail($otp));
        } catch (\Throwable $e) {
            Log::error("[OTP EMAIL ERROR] " . $e->getMessage());
        }

        return response()->json([
            'message' => 'Nếu email tồn tại trong hệ thống, mã OTP sẽ được gửi đến email.',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);

        $account = Account::whereRaw('LOWER(email) = ?', [
            strtolower($request->email)
        ])->first();

        if (!$account) {
            return response()->json([
                'message' => 'Mã OTP không hợp lệ hoặc đã hết hạn.'
            ], 422);
        }

        // Lấy OTP mới nhất chưa sử dụng
        $passwordResetOtp = PasswordResetOtp::where('account_id', $account->id)
            ->whereNull('used_at')
            ->latest()
            ->first();

        if (!$passwordResetOtp) {
            return response()->json([
                'message' => 'Mã OTP không hợp lệ hoặc đã hết hạn.'
            ], 422);
        }

        // Kiểm tra OTP đã hết hạn chưa
        if ($passwordResetOtp->expires_at->isPast()) {
            return response()->json([
                'message' => 'Mã OTP không hợp lệ hoặc đã hết hạn.'
            ], 422);
        }

        // Kiểm tra OTP
        if (!Hash::check($request->otp, $passwordResetOtp->otp_hash)) {
            return response()->json([
                'message' => 'Mã OTP không hợp lệ hoặc đã hết hạn.'
            ], 422);
        }

        // Kiểm tra mật khẩu không được trùng cũ
        if (Hash::check($request->password, $account->password_hash)) {
            return response()->json([
                'message' => 'Mật khẩu mới không được trùng với mật khẩu cũ.'
            ], 422);
        }

        DB::transaction(function () use ($account, $passwordResetOtp, $request) {
            // Đổi mật khẩu
            $account->password_hash = Hash::make($request->password);
            $account->save();

            // OTP không được sử dụng lại
            $passwordResetOtp->used_at = now();
            $passwordResetOtp->save();

            // Đăng xuất tất cả thiết bị/token cũ
            $account->tokens()->delete();
        });

        return response()->json([
            'message' => 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.'
        ]);
    }
}
