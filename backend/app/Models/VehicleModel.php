<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleModel extends Model
{
    use HasFactory;

    protected $table = 'vehicle_models';

    const UPDATED_AT = null;

    protected $fillable = [
        'brand_id',
        'name',
        'body_type',
        'year_from',
        'year_to',
        'status',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(VehicleBrand::class, 'brand_id');
    }
}