<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Appointment extends Model
{
    use HasFactory;

    protected $table = 'appointments';

    protected $fillable = [
        'appointment_code',
        'customer_id',
        'vehicle_id',
        'appointment_date',
        'appointment_time',
        'request_type',
        'symptom_description',
        'note',
        'status',
        'cancel_reason',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'appointment_services', 'appointment_id', 'service_id');
    }

    public function packages(): BelongsToMany
    {
        return $this->belongsToMany(
            MaintenancePackage::class,
            'appointment_packages',
            'appointment_id',
            'package_id'
        );
    }
}