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
        Schema::create('parts', function (Blueprint $table) {
            $table->id();

            // Mã phụ tùng duy nhất.
            $table->string('sku', 50)->unique();

            $table->string('name', 150);
            $table->string('category', 100)->nullable();
            $table->text('description')->nullable();

            // Ví dụ: cái, bộ, chai, lít...
            $table->string('unit', 30);

            $table->decimal('cost_price', 12, 2)->default(0);
            $table->decimal('sell_price', 12, 2)->default(0);

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
        Schema::dropIfExists('parts');
    }
};
