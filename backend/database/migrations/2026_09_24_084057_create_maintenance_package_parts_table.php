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
        Schema::create('maintenance_package_parts', function (Blueprint $table) {

            $table->foreignId('package_id')
                ->constrained('maintenance_packages')
                ->cascadeOnDelete();

            $table->foreignId('part_id')
                ->constrained('parts');

            // Đây CHỈ là cấu thành phụ tùng dự kiến của gói.
            //
            // KHÔNG có nghĩa khách đã đặt phụ tùng.
            // KHÔNG giữ hàng khi khách đặt lịch.
            // KHÔNG trừ tồn kho khi khách chọn gói.
            //
            // Phụ tùng thực tế chỉ được xác định sau khi xe được
            // tiếp nhận, kiểm tra/chẩn đoán và khách duyệt báo giá.
            $table->integer('quantity')->default(1);

            $table->primary(['package_id', 'part_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_package_parts');
    }
};
