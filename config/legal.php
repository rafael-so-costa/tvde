<?php

return [
    'entity_name' => env('LEGAL_ENTITY_NAME', 'FrotaPRO'),
    'nif' => env('LEGAL_NIF'),
    'address' => env('LEGAL_ADDRESS'),
    'email' => env('LEGAL_EMAIL'),
    'privacy_email' => env(
        'LEGAL_PRIVACY_EMAIL',
        env('LEGAL_EMAIL')
    ),
    'last_updated' => env(
        'LEGAL_LAST_UPDATED',
        '2026-10-12'
    ),
];