<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'quotation_code', 'repair_order_id', 'advisor_id', 'version', 'subtotal',
    'discount_amount', 'total_amount', 'status', 'valid_until', 'customer_response_at',
])]
class Quotation extends Model
{
    public const DRAFT = 'DRAFT';

    public const SENT = 'SENT';

    public const APPROVED = 'APPROVED';

    public const PARTIALLY_APPROVED = 'PARTIALLY_APPROVED';

    public const REJECTED = 'REJECTED';

    public const CANCELLED = 'CANCELLED';

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'valid_until' => 'datetime',
            'customer_response_at' => 'datetime',
        ];
    }

    public function repairOrder(): BelongsTo
    {
        return $this->belongsTo(RepairOrder::class);
    }

    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'advisor_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function recalculateTotals(): void
    {
        $subtotal = $this->items()->sum('amount');
        $this->subtotal = $subtotal;
        $this->total_amount = $subtotal - $this->discount_amount;
        $this->save();
    }
}
