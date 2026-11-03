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
        Schema::create('inspections', function (Blueprint $table) {
            $table->id();

            $table->foreignId('repair_order_id')
                ->constrained('repair_orders')
                ->cascadeOnDelete();

            // KTV thực hiện kiểm tra/chẩn đoán.
            $table->foreignId('technician_id')
                ->constrained('technician_profiles');

            // Mô tả tình trạng xe sau khi kiểm tra.
            $table->text('condition_description')->nullable();

            // Kết luận/chẩn đoán của KTV.
            $table->text('diagnosis')->nullable();

            $table->timestamp('inspected_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inspections');
    }
};
