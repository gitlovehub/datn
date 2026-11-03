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
        Schema::create('used_parts', function (Blueprint $table) {
            $table->id();

            $table->foreignId('repair_order_id')
                ->constrained('repair_orders')
                ->cascadeOnDelete();

            // Có thể xác định phụ tùng được dùng cho công việc cụ thể nào.
            $table->foreignId('work_item_id')
                ->nullable()
                ->constrained('work_items');

            $table->foreignId('part_id')
                ->constrained('parts');

            // Số lượng THỰC TẾ đã sử dụng.
            $table->integer('quantity');

            // Giá tại thời điểm thực tế sử dụng.
            $table->decimal('unit_price', 12, 2);

            $table->timestamp('used_at')->nullable();

            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('used_parts');
    }
};
