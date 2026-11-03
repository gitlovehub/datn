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
        Schema::create('quotation_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('quotation_id')
                ->constrained('quotations')
                ->cascadeOnDelete();

            // SERVICE hoặc PART
            $table->string('item_type', 20);

            // Nếu item_type = SERVICE:
            // service_id NOT NULL
            // part_id NULL
            $table->foreignId('service_id')
                ->nullable()
                ->constrained('services');

            // Nếu item_type = PART:
            // part_id NOT NULL
            // service_id NULL
            $table->foreignId('part_id')
                ->nullable()
                ->constrained('parts');

            // Snapshot tên/mô tả tại thời điểm lập báo giá.
            $table->string('description', 255);

            $table->integer('quantity')->default(1);

            // Giá tại thời điểm lập báo giá.
            $table->decimal('unit_price', 12, 2);
            $table->decimal('amount', 12, 2);

            // NULL  = khách chưa phản hồi
            // TRUE  = khách đồng ý hạng mục
            // FALSE = khách từ chối hạng mục
            $table->boolean('is_approved')->nullable();

            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quotation_items');
    }
};
