<?php

test('testes nunca usam o banco MariaDB online', function () {
    expect(app()->environment())->toBe('testing')
        ->and(config('database.default'))->toBe('sqlite')
        ->and(config('database.connections.sqlite.database'))->toBe(':memory:')
        ->and(config('database.connections.mysql.database'))->not->toBe('estaqui1_tvde');
});
