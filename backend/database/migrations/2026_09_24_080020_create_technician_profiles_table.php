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
        Schema::create('technician_profiles', function (Blueprint $table) {
            $table->id();

            // Chỉ nhân viên có accounts.role = TECHNICIAN
            // mới được có hồ sơ kỹ thuật viên.
            //
            // Quy tắc này sẽ được kiểm tra ở Backend/Service Layer.
            $table->foreignId('employee_id')
                ->unique()
                ->constrained('employees');

            // Ví dụ:
            // Động cơ
            // Điện - điều hòa
            // Gầm - phanh - lốp
            $table->string('specialty', 150)->nullable();

            // JUNIOR, SENIOR, EXPERT
            $table->string('level', 20)->default('JUNIOR');

            // KTV hiện có sẵn sàng nhận công việc hay không.
            $table->boolean('is_available')->default(true);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('technician_profiles');
    }
};
