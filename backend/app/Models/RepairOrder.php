<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'repair_order_code', 'appointment_id', 'customer_id', 'vehicle_id', 'advisor_id',
    'mileage_received', 'initial_condition', 'status', 'received_at', 'completed_at',
    'handed_over_at', 'handed_over_to_name', 'handed_over_to_phone', 'handover_note', 'closed_at', 'close_reason', 'note',
])]
class RepairOrder extends Model
{
    public const RECEIVED = 'RECEIVED';

    public const INSPECTING = 'INSPECTING';

    public const QUOTING = 'QUOTING';

    public const WAITING_APPROVAL = 'WAITING_APPROVAL';

    public const WAITING_FOR_PARTS = 'WAITING_FOR_PARTS';

    public const IN_PROGRESS = 'IN_PROGRESS';

    public const COMPLETED = 'COMPLETED';

    public const HANDED_OVER = 'HANDED_OVER';

    public const CLOSED = 'CLOSED';

    public const REVIEW_TEST = 'REVIEW_TEST';

    public const TRANSITIONS = [
        self::RECEIVED => [self::INSPECTING, self::CLOSED],
        self::INSPECTING => [self::QUOTING, self::WAITING_APPROVAL, self::CLOSED],
        self::QUOTING => [self::WAITING_APPROVAL, self::CLOSED],
        self::WAITING_APPROVAL => [self::IN_PROGRESS, self::CLOSED],
        self::IN_PROGRESS => [self::WAITING_FOR_PARTS, self::COMPLETED, self::CLOSED],
        self::WAITING_FOR_PARTS => [self::IN_PROGRESS, self::CLOSED],
        self::COMPLETED => [self::HANDED_OVER],
        self::HANDED_OVER => [],
        self::CLOSED => [],
    ];

    public const CLOSE_REASONS = [
        'CUSTOMER_REQUEST',
        'PART_UNAVAILABLE',
        'CUSTOMER_DECLINED_QUOTE',
        'OTHER',
    ];

    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
            'completed_at' => 'datetime',
            'handed_over_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'advisor_id');
    }

    public function qualityChecks(): HasMany
    {
        return $this->hasMany(QualityCheck::class)->latest('id');
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(RepairOrderStatusHistory::class, 'repair_order_id')
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class);
    }

    public function inspections(): HasMany
    {
        return $this->hasMany(Inspection::class);
    }

    public function inspection(): HasOne
    {
        return $this->hasOne(Inspection::class)->latestOfMany();
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class)->orderByDesc('version');
    }

    public function latestQuotation(): HasOne
    {
        return $this->hasOne(Quotation::class)->latestOfMany('version');
    }

    public function workItems(): HasMany
    {
        return $this->hasMany(WorkItem::class);
    }

    public function usedParts(): HasMany
    {
        return $this->hasMany(UsedPart::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }
}
