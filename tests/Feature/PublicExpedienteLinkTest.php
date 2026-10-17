<?php

namespace Tests\Feature;

use Tests\TestCase;

class PublicExpedienteLinkTest extends TestCase
{
    public function test_link_publico_de_expediente_respeita_app_url_com_subdiretorio(): void
    {
        config([
            'app.url'=>
                'https://example.test/sistemas/frotapro',
        ]);

        $response=
            $this->get('/');

        $response->assertOk();

        $response->assertSee(
            'href="https://example.test/sistemas/frotapro/registo-expediente-publico"',
            false
        );

        $response->assertDontSee(
            'href="/registo-expediente-publico"',
            false
        );
    }
}