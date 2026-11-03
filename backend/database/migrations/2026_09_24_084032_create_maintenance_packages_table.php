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
        Schema::create('maintenance_packages', function (Blueprint $table) {
            $table->id();

            // NULL = gói có thể áp dụng chung.
            // Có model_id = gói dành cho model xe cụ thể.
            $table->foreignId('vehicle_model_id')
                ->nullable()
                ->constrained('vehicle_models');

            $table->string('name', 150);

            // Ví dụ: bảo dưỡng 10.000 km.
            $table->integer('mileage_milestone')->nullable();

            // Ví dụ: bảo dưỡng sau 6 tháng.
            $table->integer('month_milestone')->nullable();

            $table->text('description')->nullable();

            // ACTIVE, INACTIVE
            $table->string('status', 20)->default('ACTIVE');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_packages');
    }
};
