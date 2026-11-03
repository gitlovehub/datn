<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kiểm tra chất lượng (nghiệm thu) trước khi hoàn thành phiếu, và biên bản bàn giao
     * (ai nhận xe — có thể là người nhận hộ).
     */
    public function up(): void
    {
        Schema::create('quality_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('repair_order_id')->constrained('repair_orders');

            // Nhân viên đủ chuyên môn thực hiện nghiệm thu.
            $table->foreignId('checked_by_employee_id')->nullable()->constrained('employees');

            // PASSED = đạt, FAILED = không đạt, phải sửa lại.
            $table->string('result', 20);
            $table->text('note')->nullable();
            $table->timestamp('checked_at')->useCurrent();
            $table->timestamps();

            $table->index(['repair_order_id', 'checked_at']);
        });

        Schema::table('repair_orders', function (Blueprint $table) {
            $table->string('handed_over_to_name', 100)->nullable()->after('handed_over_at');
            $table->string('handed_over_to_phone', 20)->nullable()->after('handed_over_to_name');
            $table->text('handover_note')->nullable()->after('handed_over_to_phone');
        });
    }

    public function down(): void
    {
        Schema::table('repair_orders', function (Blueprint $table) {
            $table->dropColumn(['handed_over_to_name', 'handed_over_to_phone', 'handover_note']);
        });

        Schema::dropIfExists('quality_checks');
    }
};
