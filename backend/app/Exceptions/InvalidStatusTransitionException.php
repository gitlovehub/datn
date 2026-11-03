<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Ném ra khi có thao tác cố chuyển Phiếu sửa chữa / Báo giá / hạng mục
 * sang một trạng thái không hợp lệ theo sơ đồ trạng thái đã định nghĩa.
 *
 * Được bắt và trả về response 422 ở Controller (xem BaseApiController).
 */
class InvalidStatusTransitionException extends RuntimeException
{
    public static function forRepairOrder(string $from, string $to): self
    {
        return new self("Không thể chuyển Phiếu sửa chữa từ trạng thái {$from} sang {$to}.");
    }

    public static function because(string $message): self
    {
        return new self($message);
    }
}
