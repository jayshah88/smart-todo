<?php

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

Route::get('/', function () {
    return view('welcome');
});

// Named auth routes expected by the auth middleware. Web clients are
// redirected to the SPA; API clients always get a JSON 401 instead.
Route::get('/login', function () {
    return redirect()->to(config('app.frontend_url').'/login');
})->name('login');

// Email verification (SPA flow): the emailed link lands here, then
// redirects back to the frontend so the user can continue in the app.
Route::get('/email/verify/{id}/{hash}', function (Request $request, int $id) {
    if (! URL::hasValidSignature($request)) {
        abort(401, 'Invalid or expired verification link.');
    }

    $user = User::findOrFail($id);

    if (! hash_equals((string) $request->route('hash'), sha1($user->getEmailForVerification()))) {
        abort(403, 'Invalid verification link.');
    }

    if (! $user->hasVerifiedEmail()) {
        $user->markEmailAsVerified();
        event(new Verified($user));
    }

    return redirect()->to(config('app.frontend_url').'/login?verified=1');
})->name('verification.verify');
