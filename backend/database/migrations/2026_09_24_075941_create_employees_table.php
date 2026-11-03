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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();

            // Mỗi nhân viên bắt buộc có một tài khoản đăng nhập.
            // employees KHÔNG phải Actor thứ 5.
            //
            // Actor thực tế được xác định bằng accounts.role:
            // ADVISOR    = Cố vấn
            // TECHNICIAN = Kỹ thuật viên
            // ADMIN      = Quản trị viên
            $table->foreignId('account_id')
                ->unique()
                ->constrained('accounts');

            $table->string('full_name', 100);
            $table->string('phone', 20)->nullable();

            // Trạng thái làm việc của nhân viên.
            $table->string('status', 20)->default('ACTIVE');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
