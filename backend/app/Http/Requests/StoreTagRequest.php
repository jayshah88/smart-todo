<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required', 'string', 'max:50',
                Rule::unique('tags', 'name')->where('user_id', $this->user()->id),
            ],
            'color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6,8}$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'You already have a tag with this name.',
            'name.required' => 'A tag name is required.',
        ];
    }
}
