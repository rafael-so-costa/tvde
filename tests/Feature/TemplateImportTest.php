<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use App\Models\PerfilTemplate;
use App\Models\TemplateContrato;
use Illuminate\Support\Facades\Storage;


uses(RefreshDatabase::class);

function templateImportHeaders(): array
{
    return [
        'Origin' => 'http://localhost:8000',
        'Referer' => 'http://localhost:8000/',
        'Accept' => 'application/json',
    ];
}

function templateImportUser(
    string $nivel = 'configurar'
): User {
    $tenant = Tenant::create([
        'nome' => 'Tenant Import',
        'slug' =>
            'tenant-import-'.
            strtolower(
                str()->random(8)
            ),
        'ativo' => true,
    ]);

    $user = User::factory()->create([
        'email' =>
            strtolower(
                str()->random(10)
            ).
            '@import.test',

        'password' => Hash::make(
            'SenhaTeste123!'
        ),

        'ativo' => true,
    ]);

    TenantUser::create([
        'tenant_id' =>
            $tenant->id,

        'user_id' =>
            $user->id,

        'status' =>
            'ativo',

        'principal' =>
            true,
    ]);

    $role = Role::firstOrCreate(
        [
            'codigo' =>
                'funcionario',
        ],
        [
            'nome' =>
                'Funcionário',

            'sistema' =>
                true,
        ]
    );

    UserRole::create([
        'user_id' =>
            $user->id,

        'role_id' =>
            $role->id,

        'tenant_id' =>
            $tenant->id,
    ]);

    $permission = Permission::firstOrCreate(
        [
            'codigo' =>
                'templates',
        ],
        [
            'modulo' =>
                'templates',

            'nome' =>
                'Templates',
        ]
    );

    RolePermission::updateOrCreate(
        [
            'role_id' =>
                $role->id,

            'permission_id' =>
                $permission->id,
        ],
        [
            'nivel' =>
                $nivel,
        ]
    );

    return $user;
}

function templateImportLogin(
    $test,
    User $user
): void {
    $test->postJson(
        '/login',
        [
            'email' =>
                $user->email,

            'password' =>
                'SenhaTeste123!',
        ]
    )->assertOk();
}

function templateImportDocx(): array
{
    $path = tempnam(
        sys_get_temp_dir(),
        'frotapro_docx_'
    );

    if ($path === false) {
        throw new RuntimeException(
            'Não foi possível criar arquivo temporário.'
        );
    }

    $zip = new ZipArchive();

    if (
        $zip->open(
            $path,
            ZipArchive::CREATE |
            ZipArchive::OVERWRITE
        ) !== true
    ) {
        throw new RuntimeException(
            'Não foi possível criar DOCX de teste.'
        );
    }

    $xml = <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        <w:p>
            <w:r><w:t>Motorista: </w:t></w:r>
            <w:r><w:t>{{NOME_</w:t></w:r>
            <w:r><w:t>MOTORISTA}}</w:t></w:r>
        </w:p>
        <w:p>
            <w:r><w:t>NIF: {{NIF_MOTORISTA}}</w:t></w:r>
        </w:p>
        <w:p>
            <w:r><w:t>Data: {{DATA_INICIO}}</w:t></w:r>
        </w:p>
    </w:body>
</w:document>
XML;

    $zip->addFromString(
        'word/document.xml',
        $xml
    );

    $zip->close();

    return [
        new UploadedFile(
            $path,
            'contrato.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            null,
            true
        ),
        $path,
    ];
}

function templateImportPdf(): array
{
    $path = tempnam(
        sys_get_temp_dir(),
        'frotapro_pdf_'
    );

    if ($path === false) {
        throw new RuntimeException(
            'Não foi possível criar PDF temporário.'
        );
    }

    $stream = implode("\n", [
        'BT',
        '/F1 12 Tf',
        '72 720 Td',
        '(Motorista: {{NOME_MOTORISTA}}) Tj',
        '0 -20 Td',
        '(NIF: {{NIF_MOTORISTA}}) Tj',
        '0 -20 Td',
        '(Data: {{DATA_INICIO}}) Tj',
        'ET',
    ]);

    $objects = [
        1 => '<< /Type /Catalog /Pages 2 0 R >>',

        2 => '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',

        3 => implode(' ', [
            '<<',
            '/Type /Page',
            '/Parent 2 0 R',
            '/MediaBox [0 0 612 792]',
            '/Resources << /Font << /F1 5 0 R >> >>',
            '/Contents 4 0 R',
            '>>',
        ]),

        4 => sprintf(
            "<< /Length %d >>\nstream\n%s\nendstream",
            strlen($stream),
            $stream
        ),

        5 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];

    $pdf = "%PDF-1.4\n";
    $offsets = [0];

    foreach ($objects as $number => $object) {
        $offsets[$number] =
            strlen($pdf);

        $pdf .= sprintf(
            "%d 0 obj\n%s\nendobj\n",
            $number,
            $object
        );
    }

    $xrefOffset = strlen($pdf);

    $pdf .= "xref\n";
    $pdf .= "0 6\n";
    $pdf .= "0000000000 65535 f \n";

    for ($i = 1; $i <= 5; $i++) {
        $pdf .= sprintf(
            "%010d 00000 n \n",
            $offsets[$i]
        );
    }

    $pdf .= "trailer\n";
    $pdf .= "<< /Size 6 /Root 1 0 R >>\n";
    $pdf .= "startxref\n";
    $pdf .= $xrefOffset."\n";
    $pdf .= "%%EOF\n";

    if (
        file_put_contents(
            $path,
            $pdf
        ) === false
    ) {
        @unlink($path);

        throw new RuntimeException(
            'Não foi possível gravar PDF temporário.'
        );
    }

    return [
        new UploadedFile(
            $path,
            'contrato.pdf',
            'application/pdf',
            null,
            true
        ),
        $path,
    ];
}

test('preview exige autenticação', function () {
    $file = UploadedFile::fake()
        ->createWithContent(
            'contrato.txt',
            '{{NOME_MOTORISTA}}'
        );

    $this->withHeaders(
        templateImportHeaders()
    )
        ->post(
            '/api/templates-contrato/importar/preview',
            [
                'arquivo' => $file,
            ]
        )
        ->assertUnauthorized();
});

test('pdf real é processado e placeholders são detectados', function () {
    $user = templateImportUser();

    templateImportLogin(
        $this,
        $user
    );

    [$file, $path] =
        templateImportPdf();

    try {
        $response = $this->withHeaders(
            templateImportHeaders()
        )
            ->post(
                '/api/templates-contrato/importar/preview',
                [
                    'arquivo' =>
                        $file,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.file.extension',
                'pdf'
            )
            ->assertJsonCount(
                3,
                'data.fields'
            );

        $names = collect(
            $response->json(
                'data.fields'
            )
        )
            ->pluck('name')
            ->all();

        expect($names)->toContain(
            'NOME_MOTORISTA',
            'NIF_MOTORISTA',
            'DATA_INICIO'
        );

        expect(
            $response->json(
                'data.content'
            )
        )
            ->toContain(
                '{{NOME_MOTORISTA}}'
            )
            ->toContain(
                '{{NIF_MOTORISTA}}'
            )
            ->toContain(
                '{{DATA_INICIO}}'
            );
    } finally {
        @unlink($path);
    }
});

test('utilizador apenas visualizar não pode importar', function () {
    $user = templateImportUser(
        'visualizar'
    );

    templateImportLogin(
        $this,
        $user
    );

    $file = UploadedFile::fake()
        ->createWithContent(
            'contrato.txt',
            '{{NOME_MOTORISTA}}'
        );

    $this->withHeaders(
        templateImportHeaders()
    )
        ->post(
            '/api/templates-contrato/importar/preview',
            [
                'arquivo' => $file,
            ]
        )
        ->assertForbidden();
});

test('txt é processado e tipos dos campos são detectados', function () {
    $user = templateImportUser();

    templateImportLogin(
        $this,
        $user
    );

    $file = UploadedFile::fake()
        ->createWithContent(
            'contrato.txt',
            implode("\n", [
                'Motorista: {{NOME_MOTORISTA}}',
                'NIF: {{NIF_MOTORISTA}}',
                'Data: {{DATA_INICIO}}',
                'Valor: {{VALOR_SEMANAL}}',
                'Email: {{EMAIL_MOTORISTA}}',
                'Telefone: {{TELEMOVEL_MOTORISTA}}',
            ])
        );

    $response = $this->withHeaders(
        templateImportHeaders()
    )
        ->post(
            '/api/templates-contrato/importar/preview',
            [
                'arquivo' => $file,
            ]
        )
        ->assertOk()
        ->assertJsonPath(
            'data.file.extension',
            'txt'
        )
        ->assertJsonCount(
            6,
            'data.fields'
        );

    $fields = collect(
        $response->json(
            'data.fields'
        )
    )->keyBy('name');

    expect(
        $fields[
            'NOME_MOTORISTA'
        ]['type']
    )->toBe('text');

    expect(
        $fields[
            'NIF_MOTORISTA'
        ]['type']
    )->toBe('cpf_cnpj');

    expect(
        $fields[
            'DATA_INICIO'
        ]['type']
    )->toBe('date');

    expect(
        $fields[
            'VALOR_SEMANAL'
        ]['type']
    )->toBe('currency');

    expect(
        $fields[
            'EMAIL_MOTORISTA'
        ]['type']
    )->toBe('email');

    expect(
        $fields[
            'TELEMOVEL_MOTORISTA'
        ]['type']
    )->toBe('phone');
});

test('campos repetidos são retornados apenas uma vez', function () {
    $user = templateImportUser();

    templateImportLogin(
        $this,
        $user
    );

    $file = UploadedFile::fake()
        ->createWithContent(
            'repetido.txt',
            '{{NOME_MOTORISTA}} {{NOME_MOTORISTA}} [[NOME_MOTORISTA]]'
        );

    $this->withHeaders(
        templateImportHeaders()
    )
        ->post(
            '/api/templates-contrato/importar/preview',
            [
                'arquivo' => $file,
            ]
        )
        ->assertOk()
        ->assertJsonCount(
            1,
            'data.fields'
        )
        ->assertJsonPath(
            'data.fields.0.name',
            'NOME_MOTORISTA'
        );
});

test('docx reconstrói placeholder dividido em vários nós de texto', function () {
    $user = templateImportUser();

    templateImportLogin(
        $this,
        $user
    );

    [$file, $path] =
        templateImportDocx();

    try {
        $response = $this->withHeaders(
            templateImportHeaders()
        )
            ->post(
                '/api/templates-contrato/importar/preview',
                [
                    'arquivo' =>
                        $file,
                ]
            )
            ->assertOk()
            ->assertJsonPath(
                'data.file.extension',
                'docx'
            )
            ->assertJsonCount(
                3,
                'data.fields'
            );

        $names = collect(
            $response->json(
                'data.fields'
            )
        )
            ->pluck('name')
            ->all();

        expect($names)->toContain(
            'NOME_MOTORISTA',
            'NIF_MOTORISTA',
            'DATA_INICIO'
        );

        expect(
            $response->json(
                'data.content'
            )
        )->toContain(
            '{{NOME_MOTORISTA}}'
        );
    } finally {
        @unlink($path);
    }
});

test('formato não suportado é rejeitado', function () {
    $user = templateImportUser();

    templateImportLogin(
        $this,
        $user
    );

    $file = UploadedFile::fake()
        ->createWithContent(
            'script.exe',
            'conteudo'
        );

    $this->withHeaders(
        templateImportHeaders()
    )
        ->post(
            '/api/templates-contrato/importar/preview',
            [
                'arquivo' => $file,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'arquivo'
        );
});

test('arquivo vazio não pode produzir preview válido', function () {
    $user = templateImportUser();

    templateImportLogin(
        $this,
        $user
    );

    $file = UploadedFile::fake()
        ->createWithContent(
            'vazio.txt',
            ''
        );

    $this->withHeaders(
        templateImportHeaders()
    )
        ->post(
            '/api/templates-contrato/importar/preview',
            [
                'arquivo' => $file,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'arquivo'
        );
});

test('preview não cria template no banco', function () {
    $user = templateImportUser();

    templateImportLogin(
        $this,
        $user
    );

    $file = UploadedFile::fake()
        ->createWithContent(
            'preview.txt',
            '{{NOME_MOTORISTA}}'
        );

    $this->withHeaders(
        templateImportHeaders()
    )
        ->post(
            '/api/templates-contrato/importar/preview',
            [
                'arquivo' =>
                    $file,
            ]
        )
        ->assertOk();

    $this->assertDatabaseCount(
        'templates_contrato',
        0
    );
});

test('importação definitiva exige autenticação', function () {
    $file = UploadedFile::fake()
        ->createWithContent(
            'contrato.txt',
            '{{NOME_MOTORISTA}}'
        );

    $this->withHeaders(
        templateImportHeaders()
    )
        ->post(
            '/api/templates-contrato/importar',
            [
                'nome' =>
                    'Template',
                'arquivo' =>
                    $file,
            ]
        )
        ->assertUnauthorized();
});

test('utilizador apenas visualizar não pode concluir importação', function () {
    $user = templateImportUser(
        'visualizar'
    );

    templateImportLogin(
        $this,
        $user
    );

    $file = UploadedFile::fake()
        ->createWithContent(
            'contrato.txt',
            '{{NOME_MOTORISTA}}'
        );

    $this->withHeaders(
        templateImportHeaders()
    )
        ->post(
            '/api/templates-contrato/importar',
            [
                'nome' =>
                    'Template',
                'arquivo' =>
                    $file,
            ]
        )
        ->assertForbidden();
});

test('importação definitiva guarda original privado e cria template', function () {
    Storage::fake('local');

    $user = templateImportUser();

    templateImportLogin(
        $this,
        $user
    );

    $tenantId = TenantUser::query()
        ->where(
            'user_id',
            $user->id
        )
        ->value('tenant_id');

    $perfil = new PerfilTemplate([
        'nome' =>
            'ALUGUER DE VEÍCULOS',
        'ordem' => 0,
    ]);

    $perfil->tenant_id =
        $tenantId;

    $perfil->save();

    $originalContent =
        implode("\n", [
            'Contrato TVDE',
            'Motorista: {{NOME_MOTORISTA}}',
            'NIF: {{NIF_MOTORISTA}}',
            'Data: {{DATA_INICIO}}',
        ]);

    $file = UploadedFile::fake()
        ->createWithContent(
            'Meu Contrato Original.txt',
            $originalContent
        );

    $response = $this->withHeaders(
        templateImportHeaders()
    )
        ->post(
            '/api/templates-contrato/importar',
            [
                'nome' =>
                    ' Contrato TVDE ',
                'perfil_id' =>
                    $perfil->id,
                'arquivo' =>
                    $file,
            ]
        )
        ->assertCreated()
        ->assertJsonPath(
            'data.nome',
            'Contrato TVDE'
        )
        ->assertJsonPath(
            'data.tenant_id',
            $tenantId
        )
        ->assertJsonPath(
            'data.perfil_id',
            $perfil->id
        )
        ->assertJsonPath(
            'data.tipo_arquivo',
            'txt'
        )
        ->assertJsonCount(
            3,
            'data.campos_detectados'
        );

    $template =
        TemplateContrato::findOrFail(
            $response->json(
                'data.id'
            )
        );

    expect(
        $template->arquivo_url
    )->toStartWith(
        'contract-templates/'.
        $tenantId.
        '/'
    );

    expect(
        basename(
            $template->arquivo_url
        )
    )->not->toBe(
        'Meu Contrato Original.txt'
    );

    expect(
        $template
            ->conteudo_original
    )->toContain(
        '{{NOME_MOTORISTA}}'
    );

    expect(
        collect(
            $template
                ->campos_detectados
        )
            ->pluck('name')
            ->all()
    )->toContain(
        'NOME_MOTORISTA',
        'NIF_MOTORISTA',
        'DATA_INICIO'
    );

    Storage::disk('local')
        ->assertExists(
            $template->arquivo_url
        );

    expect(
        Storage::disk('local')
            ->get(
                $template
                    ->arquivo_url
            )
    )->toBe(
        $originalContent
    );
});

test('cliente não pode controlar conteúdo campos caminho ou tenant na importação', function () {
    Storage::fake('local');

    $user = templateImportUser();

    templateImportLogin(
        $this,
        $user
    );

    $file = UploadedFile::fake()
        ->createWithContent(
            'contrato.txt',
            '{{NOME_MOTORISTA}}'
        );

    $this->withHeaders(
        templateImportHeaders()
    )
        ->post(
            '/api/templates-contrato/importar',
            [
                'nome' =>
                    'Template Inválido',

                'arquivo' =>
                    $file,

                'tenant_id' =>
                    (string) str()->uuid(),

                'arquivo_url' =>
                    'forjado.pdf',

                'tipo_arquivo' =>
                    'exe',

                'conteudo_original' =>
                    'conteúdo forjado',

                'campos_detectados' => [
                    [
                        'name' =>
                            'FORJADO',
                    ],
                ],

                'campos_mapeados' => [
                    'FORJADO' =>
                        'forjado',
                ],
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'tenant_id',
            'arquivo_url',
            'tipo_arquivo',
            'conteudo_original',
            'campos_detectados',
            'campos_mapeados',
        ]);

    $this->assertDatabaseCount(
        'templates_contrato',
        0
    );
});

test('importação não aceita perfil pertencente a outro tenant', function () {
    Storage::fake('local');

    $user = templateImportUser();

    templateImportLogin(
        $this,
        $user
    );

    $outroTenant =
        Tenant::create([
            'nome' =>
                'Outro Tenant Import',
            'slug' =>
                'outro-tenant-import',
            'ativo' => true,
        ]);

    $perfil =
        new PerfilTemplate([
            'nome' =>
                'Perfil Externo',
            'ordem' => 0,
        ]);

    $perfil->tenant_id =
        $outroTenant->id;

    $perfil->save();

    $file = UploadedFile::fake()
        ->createWithContent(
            'contrato.txt',
            '{{NOME_MOTORISTA}}'
        );

    $this->withHeaders(
        templateImportHeaders()
    )
        ->post(
            '/api/templates-contrato/importar',
            [
                'nome' =>
                    'Template',
                'perfil_id' =>
                    $perfil->id,
                'arquivo' =>
                    $file,
            ]
        )
        ->assertUnprocessable()
        ->assertJsonValidationErrors(
            'perfil_id'
        );

    $this->assertDatabaseCount(
        'templates_contrato',
        0
    );
});

test('falha de processamento não cria template nem arquivo privado', function () {
    Storage::fake('local');

    $user = templateImportUser();

    templateImportLogin(
        $this,
        $user
    );

    $file = UploadedFile::fake()
        ->createWithContent(
            'vazio.txt',
            ''
        );

    $this->withHeaders(
        templateImportHeaders()
    )
        ->post(
            '/api/templates-contrato/importar',
            [
                'nome' =>
                    'Template Vazio',
                'arquivo' =>
                    $file,
            ]
        )
        ->assertUnprocessable();

    $this->assertDatabaseCount(
        'templates_contrato',
        0
    );

    expect(
        Storage::disk('local')
            ->allFiles()
    )->toBe([]);
});

test('excluir template importado remove arquivo privado do próprio tenant', function () {
    Storage::fake('local');

    $user = templateImportUser();

    templateImportLogin(
        $this,
        $user
    );

    $file = UploadedFile::fake()
        ->createWithContent(
            'contrato.txt',
            '{{NOME_MOTORISTA}}'
        );

    $import = $this->withHeaders(
        templateImportHeaders()
    )
        ->post(
            '/api/templates-contrato/importar',
            [
                'nome' =>
                    'Template a eliminar',
                'arquivo' =>
                    $file,
            ]
        )
        ->assertCreated();

    $template =
        TemplateContrato::findOrFail(
            $import->json('data.id')
        );

    $path =
        $template->arquivo_url;

    Storage::disk('local')
        ->assertExists($path);

    $this->withHeaders(
        templateImportHeaders()
    )
        ->deleteJson(
            "/api/templates-contrato/{$template->id}"
        )
        ->assertNoContent();

    $this->assertDatabaseMissing(
        'templates_contrato',
        [
            'id' => $template->id,
        ]
    );

    Storage::disk('local')
        ->assertMissing($path);
});

test('excluir template não remove arquivo fora da pasta privada do próprio tenant', function () {
    Storage::fake('local');

    $user = templateImportUser();

    templateImportLogin(
        $this,
        $user
    );

    $tenantId = TenantUser::query()
        ->where(
            'user_id',
            $user->id
        )
        ->value('tenant_id');

    $outroTenant =
        Tenant::create([
            'nome' =>
                'Tenant Arquivo Externo',
            'slug' =>
                'tenant-arquivo-externo',
            'ativo' => true,
        ]);

    $path =
        'contract-templates/'.
        $outroTenant->id.
        '/nao-apagar.txt';

    Storage::disk('local')
        ->put(
            $path,
            'arquivo protegido'
        );

    $template =
        new TemplateContrato([
            'nome' =>
                'Template com caminho externo',
            'arquivo_url' =>
                $path,
            'tipo_arquivo' =>
                'txt',
            'conteudo_original' =>
                '{{NOME_MOTORISTA}}',
            'campos_detectados' =>
                [],
            'campos_mapeados' =>
                [],
        ]);

    $template->tenant_id =
        $tenantId;

    $template->save();

    $this->withHeaders(
        templateImportHeaders()
    )
        ->deleteJson(
            "/api/templates-contrato/{$template->id}"
        )
        ->assertNoContent();

    $this->assertDatabaseMissing(
        'templates_contrato',
        [
            'id' => $template->id,
        ]
    );

    Storage::disk('local')
        ->assertExists($path);
});
