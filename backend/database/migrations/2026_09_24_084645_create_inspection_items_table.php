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
        Schema::create('inspection_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('inspection_id')
                ->constrained('inspections')
                ->cascadeOnDelete();

            // Ví dụ:
            // Má phanh trước
            // Dầu phanh
            // Lốp
            // Ắc quy
            $table->string('item_name', 150);

            // NORMAL
            // WARNING
            // NEEDS_SERVICE
            // NEEDS_REPLACEMENT
            $table->string('condition_status', 30)->nullable();

            $table->string('condition_description', 255)->nullable();

            $table->text('note')->nullable();

            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inspection_items');
    }
};
