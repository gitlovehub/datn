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
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();

            $table->string('quotation_code', 30)->unique();

            $table->foreignId('repair_order_id')
                ->constrained('repair_orders')
                ->cascadeOnDelete();

            // Cố vấn lập báo giá.
            // Backend phải kiểm tra employee này có accounts.role = ADVISOR.
            $table->foreignId('advisor_id')
                ->constrained('employees');

            // Một Phiếu sửa chữa có thể có nhiều phiên bản báo giá.
            $table->integer('version')->default(1);

            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);

            // DRAFT              = đang soạn
            // SENT               = đã gửi khách
            // APPROVED           = khách duyệt toàn bộ
            // PARTIALLY_APPROVED = khách chỉ duyệt một số hạng mục
            // REJECTED           = khách từ chối toàn bộ
            // CANCELLED          = báo giá không còn hiệu lực
            $table->string('status', 30)->default('DRAFT');

            $table->timestamp('valid_until')->nullable();
            $table->timestamp('customer_response_at')->nullable();

            $table->timestamps();

            // Không được có hai báo giá cùng version
            // trong một Phiếu sửa chữa.
            $table->unique(
                ['repair_order_id', 'version'],
                'uk_quotation_version'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quotations');
    }
};
