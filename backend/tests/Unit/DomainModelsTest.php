<?php

namespace Tests\Unit;

use App\Models\Assignment;
use App\Models\Inspection;
use App\Models\InspectionItem;
use App\Models\InspectionRecommendation;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Part;
use App\Models\Payment;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\RepairOrder;
use App\Models\RepairOrderStatusHistory;
use App\Models\Service;
use App\Models\UsedPart;
use App\Models\Vehicle;
use App\Models\WorkItem;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DomainModelsTest extends TestCase
{
    #[DataProvider('domainModelTables')]
    public function test_domain_model_maps_to_its_database_table(string $modelClass, string $table): void
    {
        $model = new $modelClass;

        $this->assertSame($table, $model->getTable());
        $this->assertNotEmpty($model->getFillable());
    }

    public function test_repair_order_status_history_uses_the_migration_foreign_key(): void
    {
        $relation = (new RepairOrder)->statusHistory();

        $this->assertSame('repair_order_status_history', $relation->getRelated()->getTable());
        $this->assertSame('repair_order_id', $relation->getForeignKeyName());
    }

    public function test_repair_order_rejects_invalid_status_transitions(): void
    {
        $repairOrder = new RepairOrder(['status' => RepairOrder::RECEIVED]);

        $this->assertTrue($repairOrder->canTransitionTo(RepairOrder::INSPECTING));
        $this->assertFalse($repairOrder->canTransitionTo(RepairOrder::COMPLETED));
    }

    public static function domainModelTables(): array
    {
        return [
            'vehicle' => [Vehicle::class, 'vehicles'],
            'service' => [Service::class, 'services'],
            'part' => [Part::class, 'parts'],
            'repair order' => [RepairOrder::class, 'repair_orders'],
            'repair order status history' => [RepairOrderStatusHistory::class, 'repair_order_status_history'],
            'assignment' => [Assignment::class, 'assignments'],
            'inspection' => [Inspection::class, 'inspections'],
            'inspection item' => [InspectionItem::class, 'inspection_items'],
            'inspection recommendation' => [InspectionRecommendation::class, 'inspection_recommendations'],
            'quotation' => [Quotation::class, 'quotations'],
            'quotation item' => [QuotationItem::class, 'quotation_items'],
            'work item' => [WorkItem::class, 'work_items'],
            'used part' => [UsedPart::class, 'used_parts'],
            'invoice' => [Invoice::class, 'invoices'],
            'invoice item' => [InvoiceItem::class, 'invoice_items'],
            'payment' => [Payment::class, 'payments'],
        ];
    }
}
