<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AppointmentControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        for ($day = 0; $day <= 6; $day++) {
            DB::table('working_hours')->updateOrInsert(
                ['day_of_week' => $day],
                [
                    'open_time' => '08:00:00',
                    'close_time' => '17:00:00',
                    'max_slots' => 5,
                    'is_active' => true,
                ]
            );
        }
    }

    public function test_creates_a_booking_for_a_new_vehicle_without_a_saved_vehicle(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();

        $response = $this->withToken($customer['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-123.45',
                'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
            ],
            'appointment_date' => now()->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'service_name' => 'Bảo dưỡng định kỳ',
        ]);

        $response->assertCreated();

        $vehicle = Vehicle::query()
            ->where('customer_id', $customer['customer']->id)
            ->with('model.brand')
            ->firstOrFail();

        $this->assertSame('30A-123.45', $vehicle->license_plate);
        $this->assertSame('Vios', $vehicle->model->name);
        $this->assertSame('Toyota', $vehicle->model->brand->name);
        $this->assertSame('SEDAN', $vehicle->model->body_type);
        $this->assertDatabaseHas('appointments', [
            'vehicle_id' => $vehicle->id,
            'customer_id' => $customer['customer']->id,
        ]);
    }

    public function test_allows_a_new_vehicle_booking_without_a_license_plate(): void
    {
        $customer = $this->createAuthenticatedCustomer();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])->assertCreated();

        $this->assertDatabaseHas('vehicles', [
            'customer_id' => $customer['customer']->id,
            'license_plate' => null,
        ]);
    }

    public function test_rejects_the_sixth_booking_for_a_time_slot(): void
    {
        $this->travelTo(now()->startOfDay());
        $bookingDate = now()->addDays(2)->toDateString();

        // Năm khách khác nhau lấp đầy 5 suất; khách thứ sáu bị từ chối vì khung giờ đầy.
        for ($bookingNumber = 1; $bookingNumber <= 5; $bookingNumber++) {
            Auth::forgetGuards();
            $this->withToken($this->createAuthenticatedCustomer()['token'])->postJson('/api/appointments', [
                'new_vehicle' => [
                    'brand' => 'Toyota',
                    'model' => 'Vios',
                    'license_plate' => sprintf('30A-100.%02d', $bookingNumber),
                    'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
                ],
                'appointment_date' => $bookingDate,
                'appointment_time' => '09:00',
                'request_type' => 'MAINTENANCE',
            ])->assertCreated();
        }

        Auth::forgetGuards();
        $this->withToken($this->createAuthenticatedCustomer()['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-100.06',
                'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
            ],
            'appointment_date' => $bookingDate,
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Khung giờ đã đầy.')
            ->assertJsonPath('errors.appointment_time.0', 'Khung giờ đã đầy.');
    }

    public function test_booking_with_existing_vehicle_does_not_create_duplicate_vehicle(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-555.55',
                'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])->assertCreated();

        $vehicle = Vehicle::where('customer_id', $customer['customer']->id)->firstOrFail();
        $vehicleCount = Vehicle::count();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(3)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])->assertCreated()->assertJsonPath('data.vehicle_id', $vehicle->id);

        $this->assertSame($vehicleCount, Vehicle::count());
    }

    public function test_customer_cannot_book_another_customers_vehicle(): void
    {
        $this->travelTo(now()->startOfDay());
        $owner = $this->createAuthenticatedCustomer();

        $this->withToken($owner['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-666.66',
                'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])->assertCreated();

        $vehicle = Vehicle::where('customer_id', $owner['customer']->id)->firstOrFail();
        $otherCustomer = $this->createAuthenticatedCustomer();
        $this->app['auth']->forgetGuards();

        $this->withToken($otherCustomer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(3)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('appointments', [
            'customer_id' => $otherCustomer['customer']->id,
            'vehicle_id' => $vehicle->id,
        ]);
    }

    public function test_failed_booking_does_not_save_new_vehicle(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $vehicleCount = Vehicle::count();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-777.77',
                'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '23:00',
            'request_type' => 'MAINTENANCE',
        ])->assertUnprocessable();

        $this->assertSame($vehicleCount, Vehicle::count());
        $this->assertDatabaseMissing('vehicles', ['license_plate' => '30A-777.77']);
    }

    public function test_rejects_both_existing_and_new_vehicle_in_same_booking(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
        $before = Vehicle::count();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-888.88',
                'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])->assertUnprocessable();

        $this->assertSame($before, Vehicle::count());
        $this->assertDatabaseCount('appointments', 0);
    }

    public function test_rejects_booking_with_soft_deleted_vehicle(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
        $vehicle->delete();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])->assertUnprocessable();

        $this->assertDatabaseCount('appointments', 0);
    }

    public function test_rejects_duplicate_booking_for_same_vehicle_and_time(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
        $payload = [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ];

        $this->withToken($customer['token'])->postJson('/api/appointments', $payload)->assertCreated();
        $this->withToken($customer['token'])->postJson('/api/appointments', $payload)->assertUnprocessable();

        $this->assertDatabaseCount('appointments', 1);
    }

    /**
     * @return array{customer: Customer, token: string}
     */
    /**
     * @return array<string, mixed>
     */
    private function bookingFor(Vehicle $vehicle, string $time, int $daysAhead = 1): array
    {
        return [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays($daysAhead)->toDateString(),
            'appointment_time' => $time,
            'request_type' => 'MAINTENANCE',
        ];
    }

    public function test_customer_cannot_hold_more_active_appointments_than_the_limit(): void
    {
        config(['carservice.max_active_appointments' => 3, 'carservice.booking_requests_per_minute' => 100]);
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);

        foreach (['09:00', '10:00', '11:00'] as $time) {
            $this->withToken($customer['token'])->postJson('/api/appointments', $this->bookingFor($vehicle, $time))->assertCreated();
        }

        $this->withToken($customer['token'])->postJson('/api/appointments', $this->bookingFor($vehicle, '13:00'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('appointment_date');

        Appointment::query()->where('customer_id', $customer['customer']->id)->first()->update(['status' => 'CANCELLED']);

        $this->withToken($customer['token'])->postJson('/api/appointments', $this->bookingFor($vehicle, '13:00'))->assertCreated();
    }

    public function test_booking_requests_are_rate_limited_per_account(): void
    {
        config(['carservice.max_active_appointments' => 100, 'carservice.booking_requests_per_minute' => 3]);
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);

        foreach (['09:00', '10:00', '11:00'] as $time) {
            $this->withToken($customer['token'])->postJson('/api/appointments', $this->bookingFor($vehicle, $time))->assertCreated();
        }

        $this->withToken($customer['token'])->postJson('/api/appointments', $this->bookingFor($vehicle, '13:00'))->assertTooManyRequests();
        $this->assertSame(3, Appointment::query()->count());
    }

    public function test_resending_a_booking_with_the_same_idempotency_key_does_not_create_a_duplicate(): void
    {
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
        $headers = ['Idempotency-Key' => 'booking-key-0001'];

        $first = $this->withToken($customer['token'])->withHeaders($headers)
            ->postJson('/api/appointments', $this->bookingFor($vehicle, '09:00'))->assertCreated();

        $this->withToken($customer['token'])->withHeaders($headers)
            ->postJson('/api/appointments', $this->bookingFor($vehicle, '09:00'))
            ->assertCreated()
            ->assertHeader('Idempotent-Replayed', 'true')
            ->assertJsonPath('data.id', $first->json('data.id'));

        $this->assertSame(1, Appointment::query()->count());
    }

    public function test_same_idempotency_key_from_another_account_is_not_replayed(): void
    {
        $first = $this->createAuthenticatedCustomer();
        $this->withToken($first['token'])->withHeaders(['Idempotency-Key' => 'shared-key-0001'])
            ->postJson('/api/appointments', $this->bookingFor(Vehicle::factory()->create(['customer_id' => $first['customer']->id]), '09:00'))
            ->assertCreated();

        Auth::forgetGuards();
        $second = $this->createAuthenticatedCustomer();
        $this->withToken($second['token'])->withHeaders(['Idempotency-Key' => 'shared-key-0001'])
            ->postJson('/api/appointments', $this->bookingFor(Vehicle::factory()->create(['customer_id' => $second['customer']->id]), '10:00'))
            ->assertCreated()
            ->assertHeaderMissing('Idempotent-Replayed');

        $this->assertSame(2, Appointment::query()->count());
    }

    /**
     * Tạo lịch hẹn trực tiếp trong DB cho một xe vào ngày mai lúc $time.
     */
    private function createAppointment(Vehicle $vehicle, string $time, string $status = 'PENDING'): Appointment
    {
        return Appointment::query()->create([
            'appointment_code' => 'APT-'.uniqid(),
            'customer_id' => $vehicle->customer_id,
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDay()->toDateString(),
            'appointment_time' => $time.':00',
            'request_type' => 'MAINTENANCE',
            'status' => $status,
        ]);
    }

    public function test_rescheduling_into_a_full_slot_is_rejected_like_booking(): void
    {
        $customer = $this->createAuthenticatedCustomer();
        $mine = $this->createAppointment(Vehicle::factory()->create(['customer_id' => $customer['customer']->id]), '09:00');
        DB::table('working_hours')->update(['max_slots' => 2]);
        $this->createAppointment(Vehicle::factory()->create(), '10:00');
        $this->createAppointment(Vehicle::factory()->create(), '10:00', 'NO_SHOW');
        $this->createAppointment(Vehicle::factory()->create(), '10:00');

        $this->withToken($customer['token'])
            ->patchJson("/api/appointments/{$mine->id}", ['appointment_time' => '10:00'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['appointment_time' => 'Khung giờ đã đầy.']);
    }

    public function test_rescheduling_ignores_no_show_when_counting_slots(): void
    {
        $customer = $this->createAuthenticatedCustomer();
        $mine = $this->createAppointment(Vehicle::factory()->create(['customer_id' => $customer['customer']->id]), '09:00');
        DB::table('working_hours')->update(['max_slots' => 1]);
        $this->createAppointment(Vehicle::factory()->create(), '10:00', 'NO_SHOW');

        $this->withToken($customer['token'])
            ->patchJson("/api/appointments/{$mine->id}", ['appointment_time' => '10:00'])
            ->assertOk();

        $this->assertSame('10:00:00', substr((string) $mine->fresh()->appointment_time, 0, 8));
    }

    public function test_rescheduling_rejects_vehicle_already_booked_in_that_slot(): void
    {
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
        $mine = $this->createAppointment($vehicle, '09:00');
        $this->createAppointment($vehicle, '11:00');

        $this->withToken($customer['token'])
            ->patchJson("/api/appointments/{$mine->id}", ['appointment_time' => '11:00'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['vehicle_id' => 'Xe đã có lịch hẹn tại khung giờ này.']);
    }

    public function test_rescheduling_to_another_customers_vehicle_is_rejected(): void
    {
        $customer = $this->createAuthenticatedCustomer();
        $mine = $this->createAppointment(Vehicle::factory()->create(['customer_id' => $customer['customer']->id]), '09:00');

        $this->withToken($customer['token'])
            ->patchJson("/api/appointments/{$mine->id}", ['vehicle_id' => Vehicle::factory()->create()->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('vehicle_id');
    }

    public function test_invalid_time_format_returns_vietnamese_message(): void
    {
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDay()->toDateString(),
            'appointment_time' => '9h',
            'request_type' => 'MAINTENANCE',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['appointment_time' => 'Giờ hẹn phải đúng định dạng HH:MM (ví dụ 09:00).']);

        $mine = $this->createAppointment($vehicle, '09:00');
        $this->withToken($customer['token'])
            ->patchJson("/api/appointments/{$mine->id}", ['appointment_time' => '9h'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['appointment_time' => 'Giờ hẹn phải đúng định dạng HH:MM (ví dụ 09:00).']);
    }

    private function createAuthenticatedCustomer(): array
    {
        $account = Account::factory()->customer()->create();
        $customer = Customer::factory()->create(['account_id' => $account->id]);

        return [
            'customer' => $customer,
            'token' => $account->createToken('booking-test')->plainTextToken,
        ];
    }
}
