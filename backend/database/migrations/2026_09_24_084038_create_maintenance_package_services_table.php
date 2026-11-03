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
        Schema::create('maintenance_package_services', function (Blueprint $table) {

            $table->foreignId('package_id')
                ->constrained('maintenance_packages')
                ->cascadeOnDelete();

            $table->foreignId('service_id')
                ->constrained('services');

            $table->integer('quantity')->default(1);

            $table->primary(['package_id', 'service_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_package_services');
    }
};
