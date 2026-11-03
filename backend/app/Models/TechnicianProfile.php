<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['employee_id', 'specialty', 'level', 'is_available'])]
class TechnicianProfile extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_available' => 'boolean',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class, 'technician_id');
    }

    public function workItems(): HasMany
    {
        return $this->hasMany(WorkItem::class, 'technician_id');
    }

    public function isTechnician(): bool
    {
        return $this->employee?->account?->role === Account::ROLE_TECHNICIAN;
    }
}