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
        Schema::table('user_settings', function (Blueprint $table) {
            $table->boolean('push_enabled')->default(false)->after('daily_capacity_minutes');
            $table->boolean('whatsapp_enabled')->default(false)->after('push_enabled');
            $table->string('whatsapp_phone', 32)->nullable()->after('whatsapp_enabled');
            $table->string('quiet_hours_start', 5)->nullable()->after('whatsapp_phone'); // HH:MM format
            $table->string('quiet_hours_end', 5)->nullable()->after('quiet_hours_start');
            $table->boolean('digest_mode')->default(false)->after('quiet_hours_end');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_settings', function (Blueprint $table) {
            $table->dropColumn([
                'push_enabled',
                'whatsapp_enabled',
                'whatsapp_phone',
                'quiet_hours_start',
                'quiet_hours_end',
                'digest_mode',
            ]);
        });
    }
};
