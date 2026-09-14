<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Models\UserSetting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 *
 * @property-read UserSetting|null $settingRelation
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $setting = $this->relationLoaded('settings') ? $this->settings : null;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'emailVerified' => $this->email_verified_at !== null,
            'timezone' => $this->timezone,
            'settings' => $setting ? [
                'theme' => $setting->theme,
                'emailReminders' => $setting->email_reminders,
                'dailySummary' => $setting->daily_summary,
                'weeklySummary' => $setting->weekly_summary,
                'dailyCapacityMinutes' => $setting->daily_capacity_minutes,
                'pushEnabled' => $setting->push_enabled,
                'whatsappEnabled' => $setting->whatsapp_enabled,
                'whatsappPhone' => $setting->whatsapp_phone,
                'quietHoursStart' => $setting->quiet_hours_start,
                'quietHoursEnd' => $setting->quiet_hours_end,
                'digestMode' => $setting->digest_mode,
            ] : null,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
