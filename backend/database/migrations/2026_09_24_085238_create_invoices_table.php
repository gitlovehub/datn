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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();

            // Mỗi Phiếu sửa chữa chỉ có một hóa đơn chính thức.
            $table->foreignId('repair_order_id')
                ->unique()
                ->constrained('repair_orders');

            $table->string('invoice_code', 30)->unique();

            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);

            // UNPAID
            // PARTIALLY_PAID
            // PAID
            // CANCELLED
            $table->string('status', 20)->default('UNPAID');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
