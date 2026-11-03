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
        Schema::create('customers', function (Blueprint $table) {
            $table->id();

            // Có thể NULL đối với khách Walk-in chưa có tài khoản online.
            // Khi khách đăng ký tài khoản sau này, account_id có thể được liên kết
            // với hồ sơ khách hàng đã tồn tại.
            $table->foreignId('account_id')
                ->nullable()
                ->unique()
                ->constrained('accounts');

            // Thông tin nghiệp vụ của khách hàng.
            $table->string('full_name', 100);
            $table->string('phone', 20);
            $table->string('email', 150)->nullable();
            $table->string('address', 255)->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
