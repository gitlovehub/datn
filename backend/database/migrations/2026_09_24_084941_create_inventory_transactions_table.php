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
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('inventory_id')
                ->constrained('inventories');

            // Có thể NULL nếu giao dịch kho không liên quan sửa chữa.
            $table->foreignId('repair_order_id')
                ->nullable()
                ->constrained('repair_orders');

            // Khi xuất kho vì sử dụng phụ tùng,
            // có thể liên kết tới used_parts.
            $table->foreignId('used_part_id')
                ->nullable()
                ->constrained('used_parts');

            // IN         = nhập kho
            // OUT        = xuất kho
            // ADJUSTMENT = điều chỉnh tồn
            $table->string('transaction_type', 20);

            $table->integer('quantity');

            $table->text('note')->nullable();

            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_transactions');
    }
};
