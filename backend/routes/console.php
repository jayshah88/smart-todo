<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Dispatch due task reminders every 5 minutes
Schedule::command('reminders:send')->everyFiveMinutes();

// Daily productivity summary email (06:00)
Schedule::command('summaries:daily')->dailyAt('06:00');

// Weekly productivity summary email (Monday 07:00)
Schedule::command('summaries:weekly')->weeklyOn(1, '07:00');
