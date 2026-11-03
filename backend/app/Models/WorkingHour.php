<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkingHour extends Model
{
    use HasFactory;

    protected $table = 'working_hours';

    public $timestamps = false;

    protected $fillable = [
        'day_of_week',
        'open_time',
        'close_time',
        'max_slots',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'max_slots' => 'integer',
        'day_of_week' => 'integer',
    ];
}