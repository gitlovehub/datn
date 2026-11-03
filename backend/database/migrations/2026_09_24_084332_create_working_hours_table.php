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
        Schema::create('working_hours', function (Blueprint $table) {
            $table->id();

            // 0 = Chủ nhật ... 6 = Thứ 7
            $table->tinyInteger('day_of_week');

            $table->time('open_time');
            $table->time('close_time');

            // Số lịch tối đa garage có thể tiếp nhận đồng thời.
            $table->integer('max_slots')->default(5);

            $table->boolean('is_active')->default(true);

            $table->unique('day_of_week', 'uk_working_day');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('working_hours');
    }
};
