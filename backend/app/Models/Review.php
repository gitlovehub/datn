<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'repair_order_id',
    'customer_id',
    'overall_rating',
    'advisor_rating',
    'technician_rating',
    'comment',
    'reply',
    'replied_at',
])]
class Review extends Model
{
    protected function casts(): array
    {
        return [
            'overall_rating' => 'integer',
            'advisor_rating' => 'integer',
            'technician_rating' => 'integer',
            'replied_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function repairOrder(): BelongsTo
    {
        return $this->belongsTo(RepairOrder::class);
    }
}
