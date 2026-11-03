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
        Schema::create('technician_schedules', function (Blueprint $table) {
            $table->id();

            $table->foreignId('technician_id')
                ->constrained('technician_profiles');

            $table->date('work_date');

            $table->time('shift_start')->nullable();
            $table->time('shift_end')->nullable();

            // TRUE = KTV nghỉ ngày này.
            $table->boolean('is_off')->default(false);

            $table->string('note', 255)->nullable();

            $table->unique(
                ['technician_id', 'work_date'],
                'uk_technician_schedule'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('technician_schedules');
    }
};
