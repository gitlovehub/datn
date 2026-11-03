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
        Schema::create('vehicle_models', function (Blueprint $table) {
            $table->id();

            // Mỗi dòng xe thuộc một hãng xe.
            $table->foreignId('brand_id')
                ->constrained('vehicle_brands');

            // Ví dụ: Camry, Civic, X5, C-Class...
            $table->string('name', 100);

            // SEDAN, SUV, HATCHBACK, MPV, PICKUP, OTHER
            $table->string('body_type', 50)->nullable();

            // Khoảng năm mà phiên bản/model này áp dụng.
            $table->integer('year_from')->nullable();
            $table->integer('year_to')->nullable();

            // ACTIVE, INACTIVE
            $table->string('status', 20)->default('ACTIVE');

            $table->timestamp('created_at')->useCurrent();

            // Tránh khai báo trùng cùng model và khoảng năm.
            $table->unique(
                ['brand_id', 'name', 'year_from', 'year_to'],
                'uk_vehicle_model'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicle_models');
    }
};
