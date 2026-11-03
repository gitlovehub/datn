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
        Schema::create('services', function (Blueprint $table) {
            $table->id();

            // Danh mục dịch vụ của garage.
            // Ví dụ: thay dầu, kiểm tra phanh, cân bằng động...
            $table->string('name', 150);
            $table->string('category', 100)->nullable();
            $table->text('description')->nullable();

            // Giá cơ bản. Giá thực tế khi sửa được chốt qua báo giá.
            $table->decimal('base_price', 12, 2)->default(0);

            // Thời gian dự kiến thực hiện dịch vụ.
            $table->integer('estimated_minutes')->nullable();

            // ACTIVE, INACTIVE
            $table->string('status', 20)->default('ACTIVE');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
