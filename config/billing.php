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

            'multibanco_url' => env(
                'IFTHENPAY_MB_URL',
                'https://api.ifthenpay.com/multibanco/reference/init'
            ),

            'multibanco_expiry_days' => env(
                'IFTHENPAY_MB_EXPIRY_DAYS',
                7
            ),

            'timeout' => (int) env(
                'IFTHENPAY_TIMEOUT',
                15
            ),

            'reconciliation_url' => env(
                'IFTHENPAY_RECONCILIATION_URL',
                'https://api.ifthenpay.com/v2/payments/read'
            ),

            'reconciliation_timeout' => (int) env(
                'IFTHENPAY_RECONCILIATION_TIMEOUT',
                15
            ),

            'reconciliation_limit' => (int) env(
                'IFTHENPAY_RECONCILIATION_LIMIT',
                20
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