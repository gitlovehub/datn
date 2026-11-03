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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();

            // Người nhận thông báo.
            $table->foreignId('account_id')
                ->constrained('accounts')
                ->cascadeOnDelete();

            // Có thể liên quan đến lịch hẹn.
            $table->foreignId('appointment_id')
                ->nullable()
                ->constrained('appointments');

            // Hoặc Phiếu sửa chữa.
            $table->foreignId('repair_order_id')
                ->nullable()
                ->constrained('repair_orders');

            $table->string('title', 150);
            $table->text('content');

            // Ví dụ:
            // APPOINTMENT_REMINDER
            // APPOINTMENT_CONFIRMED
            // APPOINTMENT_UPDATED
            // QUOTATION_READY
            // QUOTATION_UPDATED
            // SERVICE_IN_PROGRESS
            // WAITING_FOR_PARTS
            // SERVICE_COMPLETED
            // PAYMENT_SUCCESS
            // MAINTENANCE_DUE
            $table->string('type', 50);

            // V6 hiện chỉ triển khai thông báo trong website.
            $table->string('channel', 20)->default('WEB');

            // PENDING
            // SENT
            // FAILED
            // READ
            $table->string('status', 20)->default('PENDING');

            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('read_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
