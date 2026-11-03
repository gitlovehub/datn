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
        Schema::create('work_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('repair_order_id')
                ->constrained('repair_orders')
                ->cascadeOnDelete();

            // Có thể liên kết tới dịch vụ trong catalog.
            $table->foreignId('service_id')
                ->nullable()
                ->constrained('services');

            // KTV trực tiếp thực hiện hạng mục.
            $table->foreignId('technician_id')
                ->nullable()
                ->constrained('technician_profiles');

            $table->string('description', 255);

            // PENDING
            // IN_PROGRESS
            // COMPLETED
            // CANCELLED
            $table->string('status', 30)->default('PENDING');

            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_items');
    }
};
