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
        if (!Schema::hasColumn('accounts', 'avatar')) {
            Schema::table('accounts', function (Blueprint $table) {
                $table->mediumText('avatar')->nullable()->after('status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('accounts', 'avatar')) {
            Schema::table('accounts', function (Blueprint $table) {
                $table->dropColumn('avatar');
            });
        }
    }
};
