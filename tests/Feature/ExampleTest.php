<?php

test('a aplicação está operacional', function () {
    $response = $this->get('/up');

    $response->assertStatus(200);
});
