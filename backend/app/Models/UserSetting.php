<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserSetting extends Model
{
    protected $fillable = [
        'user_id',
        'theme',
        'email_reminders',
        'daily_summary',
        'weekly_summary',
        'daily_capacity_minutes',
        'push_enabled',
        'whatsapp_enabled',
        'whatsapp_phone',
        'quiet_hours_start',
        'quiet_hours_end',
        'digest_mode',
    ];

    protected function casts(): array
    {
        return [
            'email_reminders' => 'boolean',
            'daily_summary' => 'boolean',
            'weekly_summary' => 'boolean',
            'daily_capacity_minutes' => 'integer',
            'push_enabled' => 'boolean',
            'whatsapp_enabled' => 'boolean',
            'digest_mode' => 'boolean',
        ];
    }

    public static function getDefaultAttributes(): array
    {
        return [
            'theme' => 'system',
            'email_reminders' => true,
            'daily_summary' => true,
            'weekly_summary' => true,
            'daily_capacity_minutes' => null,
            'push_enabled' => false,
            'whatsapp_enabled' => false,
            'whatsapp_phone' => null,
            'quiet_hours_start' => null,
            'quiet_hours_end' => null,
            'digest_mode' => false,
        ];
    }
}
