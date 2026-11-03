<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Chống ghi trùng khi người dùng bấm lại / mạng gửi lại request.
 *
 * Client gửi header `Idempotency-Key` (UUID mới cho mỗi lần thao tác). Request đầu tiên được xử lý
 * và kết quả thành công được lưu lại; các request sau cùng key (cùng tài khoản, cùng đường dẫn)
 * nhận lại đúng kết quả cũ kèm header `Idempotent-Replayed: true`, không tạo bản ghi mới.
 * Hai request cùng key đến đồng thời: request sau nhận 409 thay vì chạy song song.
 * Không có header thì request chạy bình thường (giữ tương thích client cũ).
 */
class EnsureIdempotentRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('Idempotency-Key');

        if (! $key) {
            return $next($request);
        }

        if (! preg_match('/^[A-Za-z0-9_-]{8,100}$/', $key)) {
            return response()->json(['message' => 'Idempotency-Key không hợp lệ.'], 422);
        }

        $cacheKey = 'idempotency:'.sha1(($request->user('sanctum')?->id ?? 'guest').'|'.$request->method().'|'.$request->path().'|'.$key);

        if ($cached = Cache::get($cacheKey)) {
            return $this->replay($cached);
        }

        $lock = Cache::lock($cacheKey.':lock', 30);

        if (! $lock->get()) {
            return response()->json(['message' => 'Yêu cầu đang được xử lý, vui lòng chờ.'], 409);
        }

        try {
            if ($cached = Cache::get($cacheKey)) {
                return $this->replay($cached);
            }

            $response = $next($request);

            if ($response->isSuccessful()) {
                Cache::put($cacheKey, [
                    'status' => $response->getStatusCode(),
                    'body' => $response->getContent(),
                ], now()->addHours(config('carservice.idempotency_ttl_hours')));
            }

            return $response;
        } finally {
            $lock->release();
        }
    }

    /**
     * @param  array{status: int, body: string}  $cached
     */
    private function replay(array $cached): JsonResponse
    {
        return (new JsonResponse(json_decode($cached['body'], true), $cached['status']))
            ->header('Idempotent-Replayed', 'true');
    }
}
