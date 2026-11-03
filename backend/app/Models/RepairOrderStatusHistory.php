<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['repair_order_id', 'status', 'changed_by_account_id', 'note'])]
class RepairOrderStatusHistory extends Model
{
    protected $table = 'repair_order_status_history';

    public const UPDATED_AT = null;

    public function repairOrder(): BelongsTo
    {
        return $this->belongsTo(RepairOrder::class);
    }

    public function changedByAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'changed_by_account_id');
    }
}
