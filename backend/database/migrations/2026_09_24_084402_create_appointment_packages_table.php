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
        Schema::create('appointment_packages', function (Blueprint $table) {

            // Gói khách dự kiến lựa chọn khi đặt lịch.
            //
            // Việc chọn gói KHÔNG giữ/trừ phụ tùng trong
            // maintenance_package_parts.
            $table->foreignId('appointment_id')
                ->constrained('appointments')
                ->cascadeOnDelete();

            $table->foreignId('package_id')
                ->constrained('maintenance_packages');

            $table->primary(['appointment_id', 'package_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointment_packages');
    }
};
