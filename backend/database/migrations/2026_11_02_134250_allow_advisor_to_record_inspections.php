<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cố vấn tự ghi kết quả kiểm tra khi gara không dùng màn hình KTV:
     * phiếu kiểm tra có thể không gắn KTV, và lưu nhân viên đã nhập.
     */
    public function up(): void
    {
        Schema::table('inspections', function (Blueprint $table) {
            $table->foreignId('technician_id')->nullable()->change();

            $table->foreignId('recorded_by_employee_id')
                ->nullable()
                ->after('technician_id')
                ->constrained('employees');
        });
    }

    public function down(): void
    {
        Schema::table('inspections', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recorded_by_employee_id');
            $table->foreignId('technician_id')->nullable(false)->change();
        });
    }
};
