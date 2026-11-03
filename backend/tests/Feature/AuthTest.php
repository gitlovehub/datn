<?php

namespace Tests\Feature;

use App\Mail\EmailVerificationOtpMail;
use App\Models\Account;
use App\Models\Customer;
use App\Models\EmailVerificationOtp;
use App\Models\Employee;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_account_can_log_in_and_receive_a_bearer_token(): void
    {
        $account = $this->createAccount();

        $response = $this->postJson('/api/login', [
            'email' => $account->email,
            'password' => 'correct-password',
            'device_name' => 'test-client',
        ]);

        $response->assertOk()
            ->assertJsonPath('account.id', $account->id)
            ->assertJsonPath('account.role', Account::ROLE_ADVISOR)
            ->assertJsonMissingPath('account.password_hash');

        $this->assertIsString($response->json('token'));
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_invalid_credentials_do_not_create_a_token(): void
    {
        $account = $this->createAccount();

        $this->postJson('/api/login', [
            'email' => $account->email,
            'password' => 'incorrect-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email')
            ->assertJsonPath('errors.email.0', 'Email hoặc mật khẩu không đúng.');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_verified_account_can_still_receive_a_fresh_otp_for_login(): void
    {
        $account = $this->createAccount(status: Account::STATUS_ACTIVE);
        $account->forceFill(['email_verified_at' => now()])->save();

        $this->postJson('/api/resend-email-otp', [
            'email' => $account->email,
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Mã OTP mới đã được gửi đến email.');
    }

    public function test_inactive_account_cannot_log_in(): void
    {
        $account = $this->createAccount(status: Account::STATUS_LOCKED);

        $this->postJson('/api/login', [
            'email' => $account->email,
            'password' => 'correct-password',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Tài khoản đang bị khóa hoặc ngừng hoạt động.');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_current_account_endpoint_requires_authentication(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_database_seeder_does_not_depend_on_a_users_table(): void
    {
        $this->seed();

        $this->assertDatabaseMissing('accounts', ['email' => 'users@example.com']);
        $this->assertDatabaseHas('accounts', ['email' => 'admin@carservice.vn']);
    }

    public function test_authenticated_account_can_read_its_profile(): void
    {
        $account = $this->createAccount();
        $employee = Employee::query()->create([
            'account_id' => $account->id,
            'full_name' => 'Nguyen Van An',
            'phone' => '0900000000',
            'status' => 'ACTIVE',
        ]);
        $technicianProfile = TechnicianProfile::query()->create([
            'employee_id' => $employee->id,
            'specialty' => 'Engine',
            'level' => 'SENIOR',
            'is_available' => true,
        ]);
        $token = $account->createToken('test-client')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('account.employee.full_name', 'Nguyen Van An')
            ->assertJsonPath('account.employee.technician_profile_id', $technicianProfile->id)
            ->assertJsonPath('account.customer', null);
    }

    public function test_logout_revokes_the_current_bearer_token(): void
    {
        $account = $this->createAccount();
        $token = $account->createToken('test-client')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Đã đăng xuất.');

        $this->assertDatabaseCount('personal_access_tokens', 0);

        Auth::forgetGuards();
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_role_middleware_allows_advisors_and_rejects_customers(): void
    {
        Route::get('/api/test/advisor-only', fn () => response()->json(['allowed' => true]))
            ->middleware(['auth:sanctum', 'role:ADVISOR']);

        $advisor = $this->createAccount(role: Account::ROLE_ADVISOR);
        $advisorToken = $advisor->createToken('advisor-client')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$advisorToken)
            ->getJson('/api/test/advisor-only')
            ->assertOk()
            ->assertJsonPath('allowed', true);

        Auth::forgetGuards();
        $customer = $this->createAccount(
            email: 'customer@example.com',
            role: Account::ROLE_CUSTOMER,
        );
        $customerToken = $customer->createToken('customer-client')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->getJson('/api/test/advisor-only')
            ->assertForbidden()
            ->assertJsonPath('message', 'Bạn không có quyền thực hiện thao tác này.');
    }

    public function test_login_is_case_insensitive_for_email_and_trims_whitespace(): void
    {
        $account = $this->createAccount(email: 'Advisor@Example.com');

        $this->postJson('/api/login', [
            'email' => '  ADVISOR@EXAMPLE.COM  ',
            'password' => 'correct-password',
            'device_name' => 'test-client',
        ])
            ->assertOk()
            ->assertJsonPath('account.id', $account->id)
            ->assertJsonPath('account.role', Account::ROLE_ADVISOR);
    }

    public function test_role_middleware_accepts_lowercase_role_names(): void
    {
        Route::get('/api/test/advisor-only-lowercase', fn () => response()->json(['allowed' => true]))
            ->middleware(['auth:sanctum', 'role:advisor']);

        $advisor = $this->createAccount(role: Account::ROLE_ADVISOR);
        $advisorToken = $advisor->createToken('advisor-client')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$advisorToken)
            ->getJson('/api/test/advisor-only-lowercase')
            ->assertOk()
            ->assertJsonPath('allowed', true);
    }

    public function test_spa_login_from_localhost_receives_a_bearer_token_like_production(): void
    {
        config(['sanctum.stateful' => ['localhost:5173']]);
        $account = $this->createAccount();

        $token = $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/login', [
                'email' => $account->email,
                'password' => 'correct-password',
            ])
            ->assertOk()
            ->assertJsonPath('account.id', $account->id)
            ->json('token');

        $this->assertIsString($token);
        $this->assertDatabaseCount('personal_access_tokens', 1);

        Auth::forgetGuards();
        $this->withHeaders(['Origin' => 'http://localhost:5173', 'Authorization' => 'Bearer '.$token])
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('account.id', $account->id);
    }

    public function test_cors_allows_the_configured_spa_to_send_credentials(): void
    {
        $response = $this->call('OPTIONS', '/api/login', server: [
            'HTTP_ORIGIN' => 'http://localhost:5173',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        ]);

        $response->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
            ->assertHeader('Access-Control-Allow-Credentials', 'true');
    }

    public function test_customer_can_register_and_must_verify_email_before_receiving_a_token(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/register', [
            'full_name' => 'Nguyen Van B',
            'phone' => '0912345678',
            'email' => 'customer_new@example.com',
            'password' => 'Password123@',
            'password_confirmation' => 'Password123@',
            'device_name' => 'test-device',
            'accept_terms' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('email', 'customer_new@example.com')
            ->assertJsonPath('message', 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.');

        $this->assertNull($response->json('token'));
        Mail::assertSent(EmailVerificationOtpMail::class);
        $this->assertDatabaseHas('accounts', [
            'email' => 'customer_new@example.com',
            'role' => Account::ROLE_CUSTOMER,
            'status' => Account::STATUS_PENDING,
            'email_verified_at' => null,
        ]);
        $this->assertDatabaseHas('customers', [
            'email' => 'customer_new@example.com',
            'phone' => '0912345678',
            'full_name' => 'Nguyen Van B',
        ]);
    }

    public function test_customer_can_verify_email_with_the_otp_sent_during_registration(): void
    {
        Mail::fake();
        $email = 'customer_verified@example.com';

        $response = $this->postJson('/api/register', $this->registerPayload($email, '0912345678'));

        $response->assertCreated()
            ->assertJsonPath('email', $email);
        $this->assertNull($response->json('token'));

        $this->verifyEmailWithSentOtp($email);

        $account = Account::query()->where('email', $email)->firstOrFail();

        $this->assertSame(Account::STATUS_ACTIVE, $account->status);
        $this->assertNotNull($account->email_verified_at);
        $this->assertDatabaseCount('personal_access_tokens', 1);
        $this->assertNotNull(
            EmailVerificationOtp::query()
                ->where('account_id', $account->id)
                ->sole()
                ->used_at
        );
    }

    public function test_email_verification_links_walk_in_customer_by_verified_email_when_account_has_no_customer(): void
    {
        $account = $this->createAccount(
            email: 'walkin_verified@example.com',
            role: Account::ROLE_CUSTOMER,
            status: Account::STATUS_PENDING,
        );
        $walkInCustomer = Customer::query()->create([
            'account_id' => null,
            'full_name' => 'Khach Vang Lai',
            'phone' => '0988776655',
            'email' => 'WALKIN_VERIFIED@example.com',
            'address' => '123 Ha Noi',
        ]);
        EmailVerificationOtp::query()->create([
            'account_id' => $account->id,
            'otp_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(5),
        ]);

        $this->postJson('/api/verify-email-otp', [
            'email' => $account->email,
            'otp' => '123456',
        ])->assertOk();

        $walkInCustomer->refresh();
        $this->assertSame($account->id, $walkInCustomer->account_id);
        $this->assertSame('Khach Vang Lai', $walkInCustomer->full_name);
        $this->assertSame('0988776655', $walkInCustomer->phone);
    }

    public function test_email_verification_replaces_empty_account_customer_with_walk_in_profile(): void
    {
        $account = $this->createAccount(
            email: 'walkin_replace@example.com',
            role: Account::ROLE_CUSTOMER,
            status: Account::STATUS_PENDING,
        );
        $existingCustomer = Customer::query()->create([
            'account_id' => $account->id,
            'full_name' => 'Tai Khoan',
            'phone' => '0911111111',
            'email' => $account->email,
        ]);
        $walkInCustomer = Customer::query()->create([
            'account_id' => null,
            'full_name' => 'Khach Vang Lai',
            'phone' => '0922222222',
            'email' => $account->email,
        ]);
        EmailVerificationOtp::query()->create([
            'account_id' => $account->id,
            'otp_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(5),
        ]);

        $this->postJson('/api/verify-email-otp', [
            'email' => $account->email,
            'otp' => '123456',
        ])->assertOk();

        $this->assertDatabaseMissing('customers', ['id' => $existingCustomer->id]);
        $this->assertSame($account->id, $walkInCustomer->refresh()->account_id);
        $this->assertSame('Khach Vang Lai', $walkInCustomer->full_name);
        $this->assertSame('0922222222', $walkInCustomer->phone);
    }

    public function test_email_verification_keeps_existing_customer_when_it_has_a_soft_deleted_vehicle(): void
    {
        $account = $this->createAccount(
            email: 'customer_with_profile@example.com',
            role: Account::ROLE_CUSTOMER,
            status: Account::STATUS_PENDING,
        );
        $existingCustomer = Customer::query()->create([
            'account_id' => $account->id,
            'full_name' => 'Tai Khoan',
            'phone' => '0911111111',
            'email' => $account->email,
        ]);
        $walkInCustomer = Customer::query()->create([
            'account_id' => null,
            'full_name' => 'Khach Vang Lai',
            'phone' => '0922222222',
            'email' => $account->email,
        ]);
        Vehicle::factory()->for($existingCustomer)->create()->delete();
        EmailVerificationOtp::query()->create([
            'account_id' => $account->id,
            'otp_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(5),
        ]);

        $this->postJson('/api/verify-email-otp', [
            'email' => $account->email,
            'otp' => '123456',
        ])->assertOk();

        $this->assertSame($account->id, $existingCustomer->refresh()->account_id);
        $this->assertNull($walkInCustomer->refresh()->account_id);
    }

    public function test_registration_validation_rules(): void
    {
        $this->createAccount(email: 'existing@example.com');

        $response = $this->postJson('/api/register', [
            'full_name' => '',
            'phone' => '12345',
            'email' => 'existing@example.com',
            'password' => 'short',
            'password_confirmation' => 'mismatch',
            'accept_terms' => true,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['full_name', 'phone', 'email', 'password']);
    }

    public function test_verifying_otp_does_not_link_walkin_customer_matched_only_by_phone(): void
    {
        Mail::fake();

        $victim = Customer::query()->create([
            'account_id' => null,
            'full_name' => 'Khach Vang Lai',
            'phone' => '0988776655',
            'email' => 'victim@example.com',
            'address' => '123 Ha Noi',
        ]);

        $this->postJson('/api/register', $this->registerPayload('attacker@example.com', '0988776655'))
            ->assertCreated();

        $this->verifyEmailWithSentOtp('attacker@example.com');

        $this->assertNull($victim->fresh()->account_id);
        $this->assertDatabaseCount('customers', 2);
    }

    public function test_walkin_customer_is_linked_only_after_matching_email_is_verified(): void
    {
        Mail::fake();

        $walkInCustomer = Customer::query()->create([
            'account_id' => null,
            'full_name' => 'Khach Vang Lai',
            'phone' => '0988776655',
            'email' => 'Khach@Example.com',
            'address' => '123 Ha Noi',
        ]);

        $this->postJson('/api/register', $this->registerPayload('khach@example.com', '0900000001'))
            ->assertCreated();

        $this->assertNull($walkInCustomer->fresh()->account_id);

        $this->verifyEmailWithSentOtp('khach@example.com');

        $account = Account::query()->where('email', 'khach@example.com')->firstOrFail();
        $walkInCustomer->refresh();

        $this->assertSame($account->id, $walkInCustomer->account_id);
        $this->assertSame('Khach Vang Lai', $walkInCustomer->full_name);
        $this->assertSame(
            '0988776655',
            $walkInCustomer->phone,
            'Không ghi đè SĐT của hồ sơ cũ bằng dữ liệu chưa xác thực.'
        );
        $this->assertDatabaseCount('customers', 1);
    }

    public function test_spa_registration_waits_for_email_verification_without_logging_in(): void
    {
        Mail::fake();
        config(['sanctum.stateful' => ['localhost:5173']]);

        $response = $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/register', [
                'full_name' => 'Khach SPA',
                'phone' => '0933445566',
                'email' => 'spa_customer@example.com',
                'password' => 'Password123@',
                'password_confirmation' => 'Password123@',
                'accept_terms' => true,
            ]);

        $response->assertCreated()
            ->assertJsonPath('email', 'spa_customer@example.com');

        $this->assertNull($response->json('token'));
        $this->assertGuest('web');
        $this->assertDatabaseCount('personal_access_tokens', 0);
        Mail::assertSent(EmailVerificationOtpMail::class);
    }

    public function test_authenticated_account_can_update_profile_and_avatar(): void
    {
        $account = $this->createAccount(role: Account::ROLE_CUSTOMER);
        $token = $account->createToken('test-token')->plainTextToken;

        $response = $this->withToken($token)->patchJson('/api/me/profile', [
            'full_name' => 'Nguyen Van B',
            'phone' => '0912345678',
            'address' => '123 Đường ABC, Hà Nội',
            'avatar' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('account.customer.full_name', 'Nguyen Van B')
            ->assertJsonPath('account.customer.phone', '0912345678')
            ->assertJsonPath('account.customer.address', '123 Đường ABC, Hà Nội');

        $this->assertDatabaseHas('accounts', [
            'id' => $account->id,
            'avatar' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        ]);
    }

    public function test_authenticated_employee_can_update_profile(): void
    {
        $account = $this->createAccount(role: Account::ROLE_ADMIN);
        Employee::query()->create([
            'account_id' => $account->id,
            'full_name' => 'Admin Goc',
            'phone' => '0901000200',
            'status' => 'ACTIVE',
        ]);
        $token = $account->createToken('test-token')->plainTextToken;

        $response = $this->withToken($token)->patchJson('/api/me/profile', [
            'full_name' => 'Admin Moi',
            'phone' => '0909888777',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('account.employee.full_name', 'Admin Moi')
            ->assertJsonPath('account.employee.phone', '0909888777');
    }

    public function test_authenticated_account_can_change_password_with_validation(): void
    {
        $account = $this->createAccount();
        $token = $account->createToken('test-token')->plainTextToken;

        // Test wrong current password
        $this->withToken($token)->postJson('/api/me/change-password', [
            'current_password' => 'wrong-password',
            'new_password' => 'NewPass123',
            'new_password_confirmation' => 'NewPass123',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        // Test same password as current
        $this->withToken($token)->postJson('/api/me/change-password', [
            'current_password' => 'correct-password',
            'new_password' => 'correct-password',
            'new_password_confirmation' => 'correct-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('new_password');

        // Test mismatch confirmation
        $this->withToken($token)->postJson('/api/me/change-password', [
            'current_password' => 'correct-password',
            'new_password' => 'NewPass123',
            'new_password_confirmation' => 'DifferentPass123',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('new_password');

        // Test valid password change
        $response = $this->withToken($token)->postJson('/api/me/change-password', [
            'current_password' => 'correct-password',
            'new_password' => 'NewSecret123',
            'new_password_confirmation' => 'NewSecret123',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $account->refresh();
        $this->assertTrue(Hash::check('NewSecret123', $account->getAuthPassword()));
    }

    private function registerPayload(string $email, string $phone): array
    {
        return [
            'full_name' => 'Nguoi Dang Ky',
            'phone' => $phone,
            'email' => $email,
            'password' => 'Password123@',
            'password_confirmation' => 'Password123@',
            'accept_terms' => true,
        ];
    }

    /** Lấy OTP thật từ mail đã gửi để xác thực email trong test. */
    private function verifyEmailWithSentOtp(string $email): void
    {
        $otp = null;
        Mail::assertSent(EmailVerificationOtpMail::class, function ($mail) use ($email, &$otp) {
            if (! $mail->hasTo($email)) {
                return false;
            }

            $otp = $mail->otp;

            return true;
        });

        $this->assertNotNull($otp);

        $this->postJson('/api/verify-email-otp', ['email' => $email, 'otp' => (string) $otp])->assertOk();
    }

    private function createAccount(
        string $email = 'advisor@example.com',
        string $role = Account::ROLE_ADVISOR,
        string $status = Account::STATUS_ACTIVE,
    ): Account {
        return Account::query()->create([
            'email' => $email,
            'password_hash' => Hash::make('correct-password'),
            'role' => $role,
            'status' => $status,
        ]);
    }
}
