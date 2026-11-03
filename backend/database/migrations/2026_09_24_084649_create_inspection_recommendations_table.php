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
        Schema::create('inspection_recommendations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('inspection_id')
                ->constrained('inspections')
                ->cascadeOnDelete();

            // SERVICE hoặc PART.
            $table->string('item_type', 20);

            // item_type = SERVICE:
            // service_id có giá trị, part_id = NULL.
            $table->foreignId('service_id')
                ->nullable()
                ->constrained('services');

            // item_type = PART:
            // part_id có giá trị, service_id = NULL.
            $table->foreignId('part_id')
                ->nullable()
                ->constrained('parts');

            $table->integer('quantity')->default(1);

            $table->text('note')->nullable();

            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inspection_recommendations');
    }
};
