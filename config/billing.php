<?php

return [
    'payment_due_days' => (int) env(
        'BILLING_PAYMENT_DUE_DAYS',
        7
    ),

    'default_provider' => env(
        'BILLING_DEFAULT_PROVIDER',
        'ifthenpay'
    ),

    'providers' => [
        'ifthenpay' => [
            'enabled' => filter_var(
                env('IFTHENPAY_ENABLED', true),
                FILTER_VALIDATE_BOOL
            ),

            'sandbox' => filter_var(
                env('IFTHENPAY_SANDBOX', true),
                FILTER_VALIDATE_BOOL
            ),

            'mb_key' => env(
                'IFTHENPAY_MB_KEY'
            ),

            'backoffice_key' => env(
                'IFTHENPAY_BACKOFFICE_KEY'
            ),

            'callback_key' => env(
                'IFTHENPAY_CALLBACK_KEY'
            ),

            'mbway_key' => env(
                'IFTHENPAY_MBWAY_KEY'
            ),

            'direct_debit_key' => env(
                'IFTHENPAY_DD_KEY'
            ),
        ],
    ],
];