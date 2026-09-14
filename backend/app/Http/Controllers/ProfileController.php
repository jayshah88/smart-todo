<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function update(Request $request): UserResource
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'timezone' => ['sometimes', 'string', 'max:64'],
        ]);

        $user->update($data);

        return new UserResource($user->load('settings'));
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'theme' => ['sometimes', 'in:light,dark,system'],
            'email_reminders' => ['sometimes', 'boolean'],
            'daily_summary' => ['sometimes', 'boolean'],
            'weekly_summary' => ['sometimes', 'boolean'],
            'daily_capacity_minutes' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1440'],
            'push_enabled' => ['sometimes', 'boolean'],
            'whatsapp_enabled' => ['sometimes', 'boolean'],
            'whatsapp_phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'quiet_hours_start' => ['sometimes', 'nullable', 'date_format:H:i'],
            'quiet_hours_end' => ['sometimes', 'nullable', 'date_format:H:i'],
            'digest_mode' => ['sometimes', 'boolean'],
        ]);

        $settings = $request->user()->settings()->firstOrCreate();
        $settings->update($data);

        return response()->json([
            'data' => [
                'theme' => $settings->theme,
                'emailReminders' => $settings->email_reminders,
                'dailySummary' => $settings->daily_summary,
                'weeklySummary' => $settings->weekly_summary,
                'dailyCapacityMinutes' => $settings->daily_capacity_minutes,
                'pushEnabled' => $settings->push_enabled,
                'whatsappEnabled' => $settings->whatsapp_enabled,
                'whatsappPhone' => $settings->whatsapp_phone,
                'quietHoursStart' => $settings->quiet_hours_start,
                'quietHoursEnd' => $settings->quiet_hours_end,
                'digestMode' => $settings->digest_mode,
            ],
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'password' => ['required', 'string', 'current_password:sanctum'],
        ]);

        $user = $request->user();
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Account deleted permanently.']);
    }
}
