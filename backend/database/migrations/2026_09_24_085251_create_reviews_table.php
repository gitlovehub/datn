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
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();

            // Mỗi Phiếu sửa chữa chỉ được đánh giá một lần.
            $table->foreignId('repair_order_id')
                ->unique()
                ->constrained('repair_orders');

            $table->foreignId('customer_id')
                ->constrained('customers');

            // 1 - 5 sao
            $table->tinyInteger('overall_rating');

            // Có thể đánh giá riêng Cố vấn và KTV.
            $table->tinyInteger('advisor_rating')->nullable();
            $table->tinyInteger('technician_rating')->nullable();

            $table->text('comment')->nullable();

            // Garage/Admin có thể phản hồi đánh giá.
            $table->text('reply')->nullable();
            $table->timestamp('replied_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
