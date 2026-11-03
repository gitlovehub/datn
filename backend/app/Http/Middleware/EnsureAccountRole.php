<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $account = $request->user();

        if (! $account) {
            return response()->json(['message' => 'Chưa đăng nhập.'], 401);
        }

        if (! $account->isActive()) {
            return response()->json(['message' => 'Tài khoản đang bị khóa hoặc ngừng hoạt động.'], 403);
        }

        $normalizedRoles = array_map(static fn (string $role): string => strtoupper(trim($role)), $roles);
        $accountRole = strtoupper((string) $account->role);

        if (! in_array($accountRole, $normalizedRoles, true)) {
            return response()->json(['message' => 'Bạn không có quyền thực hiện thao tác này.'], 403);
        }

        return $next($request);
    }
}
