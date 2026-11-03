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
        Schema::create('inventories', function (Blueprint $table) {
            $table->id();

            // CarService hiện chỉ quản lý 1 garage,
            // vì vậy không có branch_id / warehouse_id.
            $table->foreignId('part_id')
                ->unique()
                ->constrained('parts');

            $table->integer('quantity')->default(0);

            // Ngưỡng cảnh báo tồn kho thấp.
            $table->integer('min_quantity')->default(0);

            $table->timestamp('updated_at')
                ->useCurrent()
                ->useCurrentOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventories');
    }
};
