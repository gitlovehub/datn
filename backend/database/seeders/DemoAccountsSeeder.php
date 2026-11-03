<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Employee;
use App\Models\TechnicianProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $passwordHash = Hash::make('CarService123!');

        DB::transaction(function () use ($passwordHash): void {
            $accounts = [
                [
                    'email' => 'admin.demo@carservice.test',
                    'role' => Account::ROLE_ADMIN,
                    'name' => 'Quản trị viên Demo',
                    'phone' => '0901000101',
                ],
                [
                    'email' => 'advisor.demo@carservice.test',
                    'role' => Account::ROLE_ADVISOR,
                    'name' => 'Cố vấn Demo',
                    'phone' => '0901000102',
                ],
                [
                    'email' => 'technician.demo@carservice.test',
                    'role' => Account::ROLE_TECHNICIAN,
                    'name' => 'Kỹ thuật viên Demo',
                    'phone' => '0901000103',
                ],
                [
                    'email' => 'customer.demo@carservice.test',
                    'role' => Account::ROLE_CUSTOMER,
                    'name' => 'Khách hàng Demo',
                    'phone' => '0901000104',
                ],
            ];

            foreach ($accounts as $data) {
                $account = Account::query()->updateOrCreate(
                    ['email' => $data['email']],
                    [
                        'email_verified_at' => now(),
                        'password_hash' => $passwordHash,
                        'role' => $data['role'],
                        'status' => Account::STATUS_ACTIVE,
                    ],
                );

                if ($data['role'] === Account::ROLE_CUSTOMER) {
                    \App\Models\Customer::query()->updateOrCreate(
                        ['account_id' => $account->id],
                        [
                            'full_name' => $data['name'],
                            'phone' => $data['phone'],
                            'email' => $data['email'],
                        ],
                    );
                    continue;
                }

                $employee = Employee::query()->updateOrCreate(
                    ['account_id' => $account->id],
                    [
                        'full_name' => $data['name'],
                        'phone' => $data['phone'],
                        'status' => 'ACTIVE',
                    ],
                );

                if ($data['role'] === Account::ROLE_TECHNICIAN) {
                    TechnicianProfile::query()->firstOrCreate(
                        ['employee_id' => $employee->id],
                        [
                            'specialty' => 'Bảo dưỡng tổng quát',
                            'level' => 'JUNIOR',
                            'is_available' => true,
                        ],
                    );
                }
            }
        });
    }
}
