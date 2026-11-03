<?php

namespace Database\Seeders;

use App\Models\Inventory;
use App\Models\Part;
use Illuminate\Database\Seeder;

class PartInventorySeeder extends Seeder
{
    /**
     * Danh mục phụ tùng phổ biến kèm tồn kho ban đầu, đủ để demo luồng
     * chẩn đoán → báo giá → sửa chữa (xuất kho). Chạy lại không tạo trùng.
     */
    public function run(): void
    {
        $parts = [
            ['sku' => 'OIL-5W30-4L', 'name' => 'Dầu động cơ 5W-30 (4 lít)', 'category' => 'Dầu nhớt', 'unit' => 'Can', 'cost_price' => 650000, 'sell_price' => 850000, 'stock' => 40],
            ['sku' => 'FLT-OIL-01', 'name' => 'Lọc dầu động cơ', 'category' => 'Lọc', 'unit' => 'Cái', 'cost_price' => 90000, 'sell_price' => 150000, 'stock' => 50],
            ['sku' => 'FLT-AIR-01', 'name' => 'Lọc gió động cơ', 'category' => 'Lọc', 'unit' => 'Cái', 'cost_price' => 150000, 'sell_price' => 250000, 'stock' => 30],
            ['sku' => 'FLT-CAB-01', 'name' => 'Lọc gió điều hòa', 'category' => 'Lọc', 'unit' => 'Cái', 'cost_price' => 140000, 'sell_price' => 220000, 'stock' => 30],
            ['sku' => 'BRK-PAD-F', 'name' => 'Má phanh trước', 'category' => 'Phanh', 'unit' => 'Bộ', 'cost_price' => 550000, 'sell_price' => 850000, 'stock' => 12],
            ['sku' => 'BRK-FLD-01', 'name' => 'Dầu phanh DOT4 (1 lít)', 'category' => 'Phanh', 'unit' => 'Chai', 'cost_price' => 120000, 'sell_price' => 200000, 'stock' => 20],
            ['sku' => 'BAT-12V-60', 'name' => 'Ắc quy 12V 60Ah', 'category' => 'Điện', 'unit' => 'Bình', 'cost_price' => 1600000, 'sell_price' => 2100000, 'stock' => 6],
            ['sku' => 'WPR-BLD-01', 'name' => 'Lưỡi gạt mưa (cặp)', 'category' => 'Phụ kiện', 'unit' => 'Cặp', 'cost_price' => 180000, 'sell_price' => 300000, 'stock' => 15],
            ['sku' => 'CLT-01', 'name' => 'Nước làm mát (1 lít)', 'category' => 'Dầu nhớt', 'unit' => 'Chai', 'cost_price' => 80000, 'sell_price' => 140000, 'stock' => 25],
            ['sku' => 'SPK-PLG-01', 'name' => 'Bugi đánh lửa', 'category' => 'Động cơ', 'unit' => 'Cái', 'cost_price' => 120000, 'sell_price' => 190000, 'stock' => 2],
        ];

        foreach ($parts as $data) {
            $stock = $data['stock'];
            unset($data['stock']);

            $part = Part::query()->updateOrCreate(['sku' => $data['sku']], [...$data, 'status' => 'ACTIVE']);

            Inventory::query()->firstOrCreate(['part_id' => $part->id], ['quantity' => $stock, 'min_quantity' => 5]);
        }
    }
}
