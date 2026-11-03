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
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();

            // Xe bắt buộc thuộc một khách hàng.
            $table->foreignId('customer_id')
                ->constrained('customers');

            // Model xe lấy từ danh mục vehicle_models.
            $table->foreignId('model_id')
                ->constrained('vehicle_models');

            // Phiên bản xe, ví dụ: 1.5G CVT, 2.0 Turbo...
            $table->string('variant', 100)->nullable();

            $table->integer('year')->nullable();

            // Cho phép NULL vì xe mới có thể chưa có biển số.
            $table->string('license_plate', 20)
                ->nullable()
                ->unique();

            // VIN cũng có thể chưa được nhập khi khách tạo xe.
            $table->string('vin', 50)
                ->nullable()
                ->unique();

            // Số km hiện tại của xe.
            $table->integer('mileage')->nullable();

            $table->text('note')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
