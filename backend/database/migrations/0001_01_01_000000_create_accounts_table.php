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
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();

            // Email dùng để đăng nhập, không được trùng.
            $table->string('email', 150)->unique();

            // Mật khẩu phải lưu dưới dạng hash, tuyệt đối không lưu mật khẩu thô.
            $table->string('password_hash', 255);

            // Hệ thống CarService chỉ có 4 Actor / Role.
            // CUSTOMER   = Khách hàng
            // ADVISOR    = Cố vấn
            // TECHNICIAN = Kỹ thuật viên
            // ADMIN      = Quản trị viên
            $table->string('role', 30);

            // ACTIVE   = đang hoạt động
            // LOCKED   = bị khóa
            // INACTIVE = ngừng hoạt động
            $table->string('status', 20)->default('ACTIVE');

            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('accounts');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
