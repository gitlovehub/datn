<?php

use App\Http\Controllers\Api\AdminMaintenancePackageController;
use App\Http\Controllers\Api\AdminServiceController;
use App\Http\Controllers\Api\AdvisorAppointmentController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatbotController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\CustomerRepairOrderController;
use App\Http\Controllers\Api\CustomerReviewController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\InspectionController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\MaintenancePackageController;
use App\Http\Controllers\Api\PartController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\QuotationController;
use App\Http\Controllers\Api\RepairOrderController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\TechnicianController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\WorkingHoursController;
use App\Http\Controllers\Api\WorkItemController;
use App\Models\Account;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public
|--------------------------------------------------------------------------
*/

Route::controller(AuthController::class)->group(function (): void {

    Route::post('register', 'register')->middleware('throttle:5,1');

    Route::post('login', 'login')->middleware('throttle:5,1');

    Route::post('verify-email-otp', 'verifyEmailOtp')->middleware('throttle:5,1');

    Route::post('resend-email-otp', 'resendEmailOtp')->middleware('throttle:3,1');

    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');

    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
});

Route::get('services', [ServiceController::class, 'index']);
Route::get('services/{service}', [ServiceController::class, 'show']);
Route::get('maintenance-packages', [MaintenancePackageController::class, 'index']);
Route::get('maintenance-packages/{maintenancePackage}', [MaintenancePackageController::class, 'show']);

Route::get('/working-hours', [WorkingHoursController::class, 'index']);

Route::post('chatbot', [ChatbotController::class, 'chat'])->middleware('throttle:20,1');

/*
|--------------------------------------------------------------------------
| Authenticated
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function (): void {

    /*
    |--------------------------------------------------------------------------
    | Auth
    |--------------------------------------------------------------------------
    */

    Route::controller(AuthController::class)->group(function (): void {
        Route::get('me', 'me');
        Route::patch('me/profile', 'updateProfile');
        Route::post('me/change-password', 'changePassword');
        Route::post('logout', 'logout');
    });

    /*
    |--------------------------------------------------------------------------
    | Customer
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:'.Account::ROLE_CUSTOMER)->group(function (): void {

        // Phiếu sửa chữa, báo giá và hóa đơn của khách hàng hiện tại
        Route::controller(CustomerRepairOrderController::class)->prefix('me')->group(function (): void {
            Route::get('repair-orders', 'index');
            Route::get('repair-orders/{repairOrder}', 'show');
            Route::get('repair-orders/{repairOrder}/invoice', 'invoice');
            Route::post('quotations/{quotation}/respond', 'respondQuotation');
        });

        // Đánh giá dịch vụ
        Route::controller(CustomerReviewController::class)->prefix('me/reviews')->group(function (): void {
            Route::get('/', 'index');
            Route::post('/', 'store');
        });

        // Hồ sơ cá nhân
        Route::controller(CustomerController::class)->prefix('me/customer')->group(function (): void {
            Route::get('/', 'me');
            Route::patch('/', 'updateMe');
        });

        // Xe của tôi
        Route::controller(VehicleController::class)->prefix('me/vehicles')->group(function (): void {
            Route::get('/', 'myVehicles');
            Route::post('/', 'storeMyVehicle');
            Route::get('/{vehicle}', 'showMyVehicle');
            Route::patch('/{vehicle}', 'updateMyVehicle');
            Route::delete('/{vehicle}', 'destroyMyVehicle');
        });

        // Quản lý lịch hẹn của khách hàng
        Route::controller(AppointmentController::class)->prefix('appointments')->group(function (): void {
            Route::get('/', 'index');                 // GET /api/appointments
            Route::post('/', 'store')                 // POST /api/appointments
                ->middleware(['throttle:booking', 'idempotent']);
            Route::get('/{appointment}', 'show');     // GET /api/appointments/{id}
            Route::patch('/{appointment}', 'update'); // PATCH /api/appointments/{id}
            Route::post('/{appointment}/cancel', 'cancel'); // POST /api/appointments/{id}/cancel
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Advisor + Admin
    |--------------------------------------------------------------------------
    */

    Route::middleware(
        'role:'.Account::ROLE_ADVISOR.','.Account::ROLE_ADMIN
    )->group(function (): void {

        // Quản lý lịch hẹn của cố vấn
        // Quản lý lịch hẹn phía Cố vấn
        Route::prefix('advisor/appointments')->group(function (): void {
            Route::get('/', [AdvisorAppointmentController::class, 'index']);
            Route::get('/{id}', [AdvisorAppointmentController::class, 'show']);
            Route::post('/{id}/confirm', [AdvisorAppointmentController::class, 'confirm']);
            Route::post('/{id}/check-in', [AdvisorAppointmentController::class, 'checkIn']);
            Route::post('/{id}/no-show', [AdvisorAppointmentController::class, 'noShow']);
            Route::post('/{id}/cancel', [AdvisorAppointmentController::class, 'cancel']);
        });

        // Số liệu tổng hợp cho bàn điều hành (tính trực tiếp từ DB)
        Route::get('dashboard/summary', [DashboardController::class, 'summary']);

        // Customer CRUD
        Route::apiResource('customers', CustomerController::class)
            ->only(['index', 'store', 'show', 'update']);

        // Vehicle CRUD
        Route::apiResource('vehicles', VehicleController::class)
            ->only(['index', 'store', 'show', 'update', 'destroy']);

        // Xe của một khách hàng
        Route::get(
            'customers/{customerId}/vehicles',
            [VehicleController::class, 'byCustomer']
        );
    });

    /*
    |--------------------------------------------------------------------------
    | Admin
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:'.Account::ROLE_ADMIN)->group(function (): void {

        // Xóa khách hàng
        Route::delete(
            'customers/{customer}',
            [CustomerController::class, 'destroy']
        );

        // Quản trị danh mục dịch vụ (DELETE = xóa mềm, status = INACTIVE)
        Route::apiResource('admin/services', AdminServiceController::class)
            ->parameters(['services' => 'service'])
            ->names('admin.services');

        // Quản trị gói bảo dưỡng (DELETE = xóa mềm, status = INACTIVE)
        Route::prefix('admin/maintenance-packages')->group(function (): void {
            Route::put(
                '{maintenancePackage}/services',
                [AdminMaintenancePackageController::class, 'syncServices']
            );
            Route::put(
                '{maintenancePackage}/parts',
                [AdminMaintenancePackageController::class, 'syncParts']
            );
        });

        Route::apiResource('admin/maintenance-packages', AdminMaintenancePackageController::class)
            ->parameters(['maintenance-packages' => 'maintenancePackage'])
            ->names('admin.maintenance-packages');

        Route::get('/admin/working-hours', [WorkingHoursController::class, 'index']);

        Route::put('/admin/working-hours/{id}', [WorkingHoursController::class, 'update']);
    });

    /*
    |--------------------------------------------------------------------------
    | Advisor + Technician
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:'.Account::ROLE_ADVISOR.','.Account::ROLE_TECHNICIAN)->group(function (): void {

        Route::controller(RepairOrderController::class)->group(function (): void {
            Route::get('repair-orders', 'index');
            Route::get('repair-orders/{repairOrder}', 'show');
        });

        Route::controller(WorkItemController::class)->group(function (): void {
            Route::get('repair-orders/{repairOrder}/work-items', 'index');
            Route::patch('work-items/{workItem}/status', 'updateStatus');
            Route::post('repair-orders/{repairOrder}/used-parts', 'storeUsedPart');
        });

        Route::get('repair-orders/{repairOrder}/inspections', [InspectionController::class, 'show']);

        // Danh mục phụ tùng (đề xuất khi chẩn đoán, lập báo giá)
        Route::get('parts', [PartController::class, 'index']);
    });

    /*
    |--------------------------------------------------------------------------
    | Advisor
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:'.Account::ROLE_ADVISOR)->group(function (): void {

        /*
        |--------------------------------------------------------------------------
        | Repair Orders
        |--------------------------------------------------------------------------
        */

        Route::get('technicians', [TechnicianController::class, 'index']);
        Route::patch('work-items/{workItem}/technician', [WorkItemController::class, 'assignTechnician']);

        Route::controller(RepairOrderController::class)->group(function (): void {

            Route::post('repair-orders', 'store')->middleware('idempotent');

            Route::prefix('repair-orders/{repairOrder}')->group(function (): void {
                Route::post('assign-technician', 'assignTechnician');
                Route::post('start-repair', 'startRepair');
                Route::post('waiting-for-parts', 'markWaitingForParts');
                Route::post('resume', 'resume');
                Route::post('review', 'review');
                Route::post('complete', 'complete');
                Route::post('close', 'close');
                Route::post('hand-over', 'handOver');
            });
        });

        /*
        |--------------------------------------------------------------------------
        | Quotations
        |--------------------------------------------------------------------------
        */

        Route::controller(QuotationController::class)->group(function (): void {

            Route::post(
                'repair-orders/{repairOrder}/quotations',
                'store'
            );

            Route::prefix('quotations/{quotation}')->group(function (): void {
                Route::post('send', 'send');
                Route::post('respond', 'respond');
            });
        });

        /*
        |--------------------------------------------------------------------------
        | Invoice
        |--------------------------------------------------------------------------
        */

        Route::controller(InvoiceController::class)->prefix('repair-orders/{repairOrder}/invoice')->group(function (): void {
            Route::get('/', 'show');
            Route::post('/', 'store');
        });

        /*
        |--------------------------------------------------------------------------
        | Payment
        |--------------------------------------------------------------------------
        */

        Route::controller(PaymentController::class)->group(function (): void {

            // Ghi nhận thanh toán DIRECT / QR
            Route::post(
                'invoices/{invoice}/payments',
                'store'
            )->middleware('idempotent');

            // Tạm thời Advisor xác nhận QR
            Route::post(
                'payments/{payment}/confirm-qr',
                'confirmQr'
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Inspections: KTV hoặc Cố vấn ghi kết quả kiểm tra / chẩn đoán
    |--------------------------------------------------------------------------
    | Gara không dùng màn hình KTV thì Cố vấn nhập thay. KTV chỉ thao tác
    | trên phiếu mình được giao (InspectionController::denyUnassignedTechnician).
    */

    Route::middleware('role:'.Account::ROLE_ADVISOR.','.Account::ROLE_TECHNICIAN)->group(function (): void {

        Route::controller(InspectionController::class)->group(function (): void {

            Route::post(
                'repair-orders/{repairOrder}/inspections',
                'store'
            );

            Route::post(
                'repair-orders/{repairOrder}/inspections/recommendations',
                'addRecommendation'
            );

            Route::post(
                'repair-orders/{repairOrder}/inspections/complete',
                'complete'
            );
        });
    });
});
