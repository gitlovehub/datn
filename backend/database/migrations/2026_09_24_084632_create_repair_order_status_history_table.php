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
        Schema::create('repair_order_status_history', function (Blueprint $table) {
            $table->id();

            // Lưu lịch sử thay đổi trạng thái Phiếu sửa chữa.
            $table->foreignId('repair_order_id')
                ->constrained('repair_orders')
                ->cascadeOnDelete();

            $table->string('status', 30);

            // Tài khoản thực hiện thay đổi.
            // Có thể NULL đối với thay đổi tự động từ hệ thống.
            $table->foreignId('changed_by_account_id')
                ->nullable()
                ->constrained('accounts');

            $table->text('note')->nullable();

            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('repair_order_status_history');
    }
};
