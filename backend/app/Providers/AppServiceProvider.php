<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Chống spam đặt lịch: giới hạn theo tài khoản và theo IP (cấu hình trong config/carservice.php).
        RateLimiter::for('booking', function (Request $request): array {
            $tooMany = fn () => response()->json([
                'message' => 'Bạn gửi yêu cầu đặt lịch quá nhanh. Vui lòng thử lại sau ít phút.',
            ], 429);

            return [
                Limit::perMinute(config('carservice.booking_requests_per_minute'))
                    ->by('booking:user:'.($request->user('sanctum')?->id ?? $request->ip()))
                    ->response($tooMany),
                Limit::perMinute(config('carservice.booking_requests_per_minute_per_ip'))
                    ->by('booking:ip:'.$request->ip())
                    ->response($tooMany),
            ];
        });
    }
}
