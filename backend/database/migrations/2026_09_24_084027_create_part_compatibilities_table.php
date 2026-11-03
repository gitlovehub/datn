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
        Schema::create('part_compatibilities', function (Blueprint $table) {
            $table->id();

            // Phụ tùng nào...
            $table->foreignId('part_id')
                ->constrained('parts');

            // ...tương thích với model xe nào.
            $table->foreignId('vehicle_model_id')
                ->constrained('vehicle_models');

            // Có thể giới hạn theo đời xe.
            $table->integer('year_from')->nullable();
            $table->integer('year_to')->nullable();

            $table->string('note', 255)->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->unique(
                ['part_id', 'vehicle_model_id', 'year_from', 'year_to'],
                'uk_part_compatibility'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('part_compatibilities');
    }
};
