<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['inspection_id', 'item_type', 'service_id', 'part_id', 'quantity', 'note'])]
class InspectionRecommendation extends Model
{
    public const UPDATED_AT = null;

    public const TYPE_SERVICE = 'SERVICE';

    public const TYPE_PART = 'PART';

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }
}
