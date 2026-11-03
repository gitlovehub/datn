<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['part_id', 'quantity', 'min_quantity'])]
class Inventory extends Model
{
    public const CREATED_AT = null;

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }
}
