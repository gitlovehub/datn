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
        Schema::create('assignments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('repair_order_id')
                ->constrained('repair_orders')
                ->cascadeOnDelete();

            $table->foreignId('technician_id')
                ->constrained('technician_profiles');

            // ASSIGNED
            // IN_PROGRESS
            // COMPLETED
            // CANCELLED
            $table->string('status', 20)->default('ASSIGNED');

            $table->text('note')->nullable();

            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamps();

            // Một KTV không được phân công trùng hai lần
            // trên cùng một Phiếu sửa chữa.
            $table->unique(
                ['repair_order_id', 'technician_id'],
                'uk_assignment'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assignments');
    }
};
