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
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();

            $table->string('appointment_code', 30)->unique();

            $table->foreignId('customer_id')
                ->constrained('customers');

            $table->foreignId('vehicle_id')
                ->constrained('vehicles');

            $table->date('appointment_date');
            $table->time('appointment_time');

            // DIAGNOSIS   = cần kiểm tra/chẩn đoán
            // REPAIR      = sửa chữa
            // MAINTENANCE = bảo dưỡng
            // REPLACEMENT = nhu cầu thay thế
            $table->string('request_type', 30);

            $table->text('symptom_description')->nullable();
            $table->text('note')->nullable();

            // PENDING   = chờ xác nhận
            // CONFIRMED = đã xác nhận
            // CHECKED_IN = khách đã mang xe đến garage
            // CANCELLED = lịch bị hủy
            // NO_SHOW   = khách không đến
            $table->string('status', 30)->default('PENDING');

            $table->string('cancel_reason', 255)->nullable();

            $table->timestamps();

            $table->index(
                ['appointment_date', 'appointment_time'],
                'idx_appointments_datetime'
            );

            $table->index('status', 'idx_appointments_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
