<?php

namespace App\Services;

use App\Models\ChecklistRecord;
use App\Models\Documento;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class ChecklistPdfService
{
    public function __construct(
        private DocumentoRegistryService $documentoRegistryService
    ) {}

    public function prepare(
        ChecklistRecord $checklist
    ): array {
        $checklist=
            $this->load(
                $checklist
            );

        if(
            $checklist->estado!==
            'finalizado'
        ){
            throw ValidationException::withMessages([
                'checklist'=>
                    'Finalize o checklist antes de gerar o PDF.',
            ]);
        }

        if(
            filled(
                $checklist->pdf_url
            ) &&
            Storage::disk('local')
                ->exists(
                    $checklist->pdf_url
                )
        ){
            return $this->references(
                $checklist
            );
        }

        return $this->generate(
            $checklist
        );
    }

    public function generate(
        ChecklistRecord $checklist
    ): array {
        $checklist=
            $this->load(
                $checklist
            );

        if(
            $checklist->estado!==
            'finalizado'
        ){
            throw ValidationException::withMessages([
                'checklist'=>
                    'Finalize o checklist antes de gerar o PDF.',
            ]);
        }

        $entregaDocumento=null;

        if(
            $checklist->tipo===
                'recolha' &&
            $checklist
                ->entregaVinculada
        ){
            $entregaDocumento=
                $this
                    ->documentoRegistryService
                    ->sync(
                        $checklist
                            ->entregaVinculada
                    );
        }

        $documento=
            $this
                ->documentoRegistryService
                ->sync(
                    $checklist
                );

        if(!$documento){
            throw new RuntimeException(
                'Não foi possível obter o código documental do checklist.'
            );
        }

        $photos=
            $checklist
                ->mediaFiles
                ->where(
                    'tipo',
                    'foto'
                )
                ->map(
                    fn($media)=>[
                        'titulo'=>
                            $media->titulo
                            ?: $media
                                ->arquivo_nome,

                        'arquivo_nome'=>
                            $media
                                ->arquivo_nome,

                        'parte'=>
                            data_get(
                                $media
                                    ->metadados,
                                'parte_nome'
                            ),

                        'contexto'=>
                            $media
                                ->contexto,

                        'capturado_em'=>
                            $media
                                ->capturado_em,

                        'hash'=>
                            $media
                                ->hash_arquivo,

                        'data_uri'=>
                            $this
                                ->dataUri(
                                    $media
                                        ->arquivo_path,
                                    $media
                                        ->arquivo_mime
                                ),
                    ]
                )
                ->filter(
                    fn($item)=>
                        filled(
                            $item[
                                'data_uri'
                            ]
                        )
                )
                ->values()
                ->all();

        $videos=
            $checklist
                ->mediaFiles
                ->where(
                    'tipo',
                    'video'
                )
                ->map(
                    fn($media)=>[
                        'titulo'=>
                            $media->titulo
                            ?: $media
                                ->arquivo_nome,

                        'arquivo_nome'=>
                            $media
                                ->arquivo_nome,

                        'hash'=>
                            $media
                                ->hash_arquivo,

                        'contexto'=>
                            $media
                                ->contexto,

                        'capturado_em'=>
                            $media
                                ->capturado_em,

                        'arquivo_mime'=>
                            $media
                                ->arquivo_mime,

                        'arquivo_tamanho'=>
                            $media
                                ->arquivo_tamanho,
                    ]
                )
                ->values()
                ->all();

        $assinaturaEmpresa=
            $this->dataUri(
                $checklist
                    ->assinatura_empresa_path,
                'image/png'
            );

        $assinaturaMotorista=
            $this->dataUri(
                $checklist
                    ->assinatura_motorista_path,
                'image/png'
            );

        $pdf=
            Pdf::loadView(
                'pdf.checklist',
                [
                    'checklist'=>$checklist,

                    'documento'=>
                        $documento,

                    'entregaDocumento'=>
                        $entregaDocumento,

                    'photos'=>
                        $photos,

                    'videos'=>
                        $videos,

                    'assinaturaEmpresa'=>
                        $assinaturaEmpresa,

                    'assinaturaMotorista'=>
                        $assinaturaMotorista,

                    'generatedAt'=>
                        now(),
                ]
            )
                ->setPaper(
                    'a4',
                    'portrait'
                )
                ->setOptions([
                    'isRemoteEnabled'=>
                        false,

                    'isPhpEnabled'=>
                        false,

                    'defaultFont'=>
                        'DejaVu Sans',
                ]);

        $binary=
            $pdf->output();

        if(
            $binary==='' ||
            !str_starts_with(
                $binary,
                '%PDF-'
            )
        ){
            throw new RuntimeException(
                'Não foi possível gerar um PDF válido para o checklist.'
            );
        }

        $path=
            'checklist-pdfs/'.
            $checklist->tenant_id.
            '/'.
            $checklist->id.
            '/'.
            Str::uuid().
            '.pdf';

        if(
            !Storage::disk('local')
                ->put(
                    $path,
                    $binary
                )
        ){
            throw new RuntimeException(
                'Não foi possível guardar o PDF do checklist.'
            );
        }

        $hash=
            hash(
                'sha256',
                $binary
            );

        $oldPath=
            $checklist->pdf_url;

        try{
            DB::transaction(
                function() use(
                    $checklist,
                    $path,
                    $hash
                ){
                    $locked=
                        ChecklistRecord::query()
                            ->where(
                                'tenant_id',
                                $checklist
                                    ->tenant_id
                            )
                            ->whereKey(
                                $checklist->id
                            )
                            ->lockForUpdate()
                            ->firstOrFail();

                    if(
                        $locked->estado!==
                        'finalizado'
                    ){
                        throw ValidationException::withMessages([
                            'checklist'=>
                                'O checklist deixou de estar finalizado durante a geração do documento.',
                        ]);
                    }

                    $locked->pdf_url=
                        $path;

                    $locked->hash_documento=
                        $hash;

                    $locked->save();
                }
            );
        }
        catch(Throwable $exception){
            Storage::disk('local')
                ->delete(
                    $path
                );

            throw $exception;
        }

        if(
            filled(
                $oldPath
            ) &&
            $oldPath!==$path
        ){
            Storage::disk('local')
                ->delete(
                    $oldPath
                );
        }

        $checklist=
            $this->load(
                ChecklistRecord::query()
                    ->whereKey(
                        $checklist->id
                    )
                    ->firstOrFail()
            );

        $documento=
            $this
                ->documentoRegistryService
                ->sync(
                    $checklist
                );

        return [
            'checklist'=>
                $checklist,

            'documento'=>
                $documento,

            'entrega_documento'=>
                $entregaDocumento,
        ];
    }

    private function references(
        ChecklistRecord $checklist
    ): array {
        $entregaDocumento=null;

        if(
            $checklist->tipo===
                'recolha' &&
            $checklist
                ->entregaVinculada
        ){
            $entregaDocumento=
                $this
                    ->documentoRegistryService
                    ->sync(
                        $checklist
                            ->entregaVinculada
                    );
        }

        $documento=
            $this
                ->documentoRegistryService
                ->sync(
                    $checklist
                );

        return [
            'checklist'=>
                $checklist,

            'documento'=>
                $documento,

            'entrega_documento'=>
                $entregaDocumento,
        ];
    }

    private function load(
        ChecklistRecord $checklist
    ): ChecklistRecord {
        return ChecklistRecord::query()
            ->where(
                'tenant_id',
                $checklist
                    ->tenant_id
            )
            ->whereKey(
                $checklist->id
            )
            ->with([
                'tenant:id,nome,nif,email,telefone',

                'motorista:id,nome_completo,nif,email,telemovel',

                'veiculo:id,matricula,marca,modelo',

                'realizadoPor:id,name',

                'mediaFiles',

                'entregaVinculada',

                'contrato:id,tipo,empresa_id',

                'contrato.empresa:id,nome_empresa,nif,email,telemovel,nome_gerente,endereco_rua,endereco_numero,endereco_complemento,endereco_cep,endereco_cidade',
            ])
            ->firstOrFail();
    }

    private function dataUri(
        ?string $path,
        ?string $mime=null
    ): ?string {
        if(
            blank(
                $path
            ) ||
            !Storage::disk('local')
                ->exists(
                    $path
                )
        ){
            return null;
        }

        $binary=
            Storage::disk('local')
                ->get(
                    $path
                );

        if($binary===''){
            return null;
        }

        $mime=
            $mime
            ?: Storage::disk('local')
                ->mimeType(
                    $path
                )
            ?: 'application/octet-stream';

        return 'data:'.
            $mime.
            ';base64,'.
            base64_encode(
                $binary
            );
    }
}