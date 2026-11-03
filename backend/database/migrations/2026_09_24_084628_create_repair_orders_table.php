<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('repair_orders', function (Blueprint $table) {
            $table->id();

            $table->string('repair_order_code', 30)->unique();

            // NULL = khách Walk-in, không có lịch hẹn trước.
            // UNIQUE = một Appointment chỉ sinh tối đa một Phiếu sửa chữa.
            $table->foreignId('appointment_id')
                ->nullable()
                ->unique()
                ->constrained('appointments');

            $table->foreignId('customer_id')
                ->constrained('customers');

            $table->foreignId('vehicle_id')
                ->constrained('vehicles');

            // Cố vấn là người tiếp nhận và quản lý Phiếu sửa chữa.
            // advisor_id trỏ tới employees.
            // Backend phải kiểm tra account.role = ADVISOR.
            $table->foreignId('advisor_id')
                ->constrained('employees');

            $table->integer('mileage_received')->nullable();

            // Tình trạng xe ghi nhận lúc tiếp nhận.
            $table->text('initial_condition')->nullable();

            // RECEIVED          = đã tiếp nhận xe
            // INSPECTING        = đang kiểm tra/chẩn đoán
            // WAITING_APPROVAL  = chờ khách duyệt báo giá
            // WAITING_FOR_PARTS = đang chờ phụ tùng
            // IN_PROGRESS       = đang sửa chữa
            // COMPLETED         = đã hoàn thành công việc
            // HANDED_OVER       = đã bàn giao xe
            // CLOSED            = đóng phiếu do không tiếp tục xử lý
            $table->string('status', 30)->default('RECEIVED');

            $table->timestamp('received_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('handed_over_at')->nullable();
            $table->timestamp('closed_at')->nullable();

            // Chỉ dùng khi status = CLOSED.
            //
            // CUSTOMER_REQUEST
            // PART_UNAVAILABLE
            // CUSTOMER_DECLINED_QUOTE
            // OTHER
            $table->string('close_reason', 50)->nullable();

            $table->text('note')->nullable();

            $table->timestamps();

            $table->index('status', 'idx_repair_orders_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('repair_orders');
    }
};
