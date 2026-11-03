<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['inventory_id', 'repair_order_id', 'used_part_id', 'transaction_type', 'quantity', 'note'])]
class InventoryTransaction extends Model
{
    public const UPDATED_AT = null;

    public const TYPE_OUT = 'OUT';

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class);
    }
}
