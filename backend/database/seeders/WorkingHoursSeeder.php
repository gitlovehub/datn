<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WorkingHoursSeeder extends Seeder
{
    /**
     * Add default reception hours only when a weekday has no configuration.
     * Carbon dayOfWeek: Sunday = 0, Monday = 1, ..., Saturday = 6.
     */
    public function run(): void
    {
        $defaults = [
            0 => ['open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 0, 'is_active' => false],
            1 => ['open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 5, 'is_active' => true],
            2 => ['open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 5, 'is_active' => true],
            3 => ['open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 5, 'is_active' => true],
            4 => ['open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 5, 'is_active' => true],
            5 => ['open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 5, 'is_active' => true],
            6 => ['open_time' => '08:00:00', 'close_time' => '12:00:00', 'max_slots' => 3, 'is_active' => true],
        ];

        foreach ($defaults as $dayOfWeek => $hours) {
            DB::table('working_hours')->insertOrIgnore([
                'day_of_week' => $dayOfWeek,
                ...$hours,
            ]);
        }
    }
}
