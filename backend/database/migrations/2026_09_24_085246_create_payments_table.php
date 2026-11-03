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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            // Một Invoice có thể có nhiều lần thử thanh toán.
            $table->foreignId('invoice_id')
                ->constrained('invoices');

            $table->decimal('amount', 12, 2);

            // DIRECT = thanh toán trực tiếp tại garage
            // QR     = website hiển thị QR để khách quét
            $table->string('payment_method', 30);

            // Mã giao dịch do hệ thống/cổng thanh toán trả về.
            $table->string('transaction_code', 100)->nullable();

            // Chỉ lưu mã/tham chiếu QR.
            // KHÔNG lưu ảnh QR trong Database.
            $table->string('qr_reference', 255)->nullable();

            // PENDING
            // SUCCESS
            // FAILED
            // CANCELLED
            $table->string('status', 20)->default('PENDING');

            $table->timestamp('paid_at')->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index(
                ['invoice_id', 'status'],
                'idx_payments_invoice_status'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
