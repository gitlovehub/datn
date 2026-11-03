<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['inspection_id', 'item_name', 'condition_status', 'condition_description', 'note'])]
class InspectionItem extends Model
{
    public const UPDATED_AT = null;

    public const PASSED = 'PASSED';

    public const WARNING = 'WARNING';

    public const FAILED = 'FAILED';

    public const NORMAL = 'NORMAL';

    public const NEEDS_SERVICE = 'NEEDS_SERVICE';

    public const NEEDS_REPLACEMENT = 'NEEDS_REPLACEMENT';

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }
}
