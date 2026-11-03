<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['repair_order_id', 'work_item_id', 'part_id', 'quantity', 'unit_price', 'used_at'])]
class UsedPart extends Model
{
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'unit_price' => 'decimal:2',
            'used_at' => 'datetime',
        ];
    }

    public function repairOrder(): BelongsTo
    {
        return $this->belongsTo(RepairOrder::class);
    }

    public function workItem(): BelongsTo
    {
        return $this->belongsTo(WorkItem::class);
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }
}
