<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['repair_order_id', 'checked_by_employee_id', 'result', 'note', 'checked_at'])]
class QualityCheck extends Model
{
    public const PASSED = 'PASSED';

    public const FAILED = 'FAILED';

    protected function casts(): array
    {
        return [
            'checked_at' => 'datetime',
        ];
    }

    public function repairOrder(): BelongsTo
    {
        return $this->belongsTo(RepairOrder::class);
    }

    public function checkedBy(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'checked_by_employee_id');
    }
}
