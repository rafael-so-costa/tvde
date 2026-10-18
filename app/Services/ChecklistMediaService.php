<?php

namespace App\Services;

use App\Models\ChecklistMedia;
use App\Models\ChecklistRecord;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class ChecklistMediaService
{
    private const EXTENSIONS=[
        'jpg',
        'jpeg',
        'png',
        'webp',
        'mp4',
        'mov',
        'webm',
    ];

    public function store(
        ChecklistRecord $checklist,
        UploadedFile $file,
        User $user,
        array $data=[]
    ): ChecklistMedia {
        $this->ensureEditable(
            $checklist
        );

        $extension=
            strtolower(
                trim(
                    $file
                        ->getClientOriginalExtension()
                )
            );

        if(
            !in_array(
                $extension,
                self::EXTENSIONS,
                true
            )
        ){
            throw ValidationException::withMessages([
                'arquivo'=>
                    'Formato não permitido. Utilize JPG, PNG, WEBP, MP4, MOV ou WEBM.',
            ]);
        }

        $mime=
            strtolower(
                (string)$file
                    ->getMimeType()
            );

        $clientMime=
            strtolower(
                (string)$file
                    ->getClientMimeType()
            );

        if(
            !str_starts_with(
                $mime,
                'image/'
            ) &&
            !str_starts_with(
                $mime,
                'video/'
            )
        ){
            $mime=
                $clientMime;
        }

        $tipo=
            str_starts_with(
                $mime,
                'image/'
            )
                ?'foto'
                :(
                    str_starts_with(
                        $mime,
                        'video/'
                    )
                        ?'video'
                        :null
                );

        if(!$tipo){
            throw ValidationException::withMessages([
                'arquivo'=>
                    'O ficheiro deve ser uma fotografia ou vídeo válido.',
            ]);
        }

        $directory=
            'checklists/'.
            $checklist->tenant_id.
            '/'.
            $checklist->id.
            '/media';

        $storedName=
            (string)Str::uuid().
            '.'.
            $extension;

        $path=
            Storage::disk('local')
                ->putFileAs(
                    $directory,
                    $file,
                    $storedName
                );

        if(!$path){
            throw new RuntimeException(
                'Não foi possível guardar a evidência.'
            );
        }

        try{
            $absolutePath=
                Storage::disk('local')
                    ->path(
                        $path
                    );

            $hash=
                hash_file(
                    'sha256',
                    $absolutePath
                );

            if(!$hash){
                throw new RuntimeException(
                    'Não foi possível calcular a integridade da evidência.'
                );
            }

            return DB::transaction(
                function() use(
                    $checklist,
                    $file,
                    $user,
                    $data,
                    $tipo,
                    $mime,
                    $path,
                    $hash
                ){
                    $media=
                        new ChecklistMedia([
                            'tipo'=>$tipo,

                            'contexto'=>
                                trim(
                                    (string)(
                                        $data['contexto']
                                        ??
                                        'geral'
                                    )
                                )
                                ?: 'geral',

                            'titulo'=>
                                filled(
                                    $data['titulo']
                                    ??null
                                )
                                    ?trim(
                                        (string)$data['titulo']
                                    )
                                    :null,

                            'arquivo_nome'=>
                                basename(
                                    $file
                                        ->getClientOriginalName()
                                ),

                            'arquivo_path'=>
                                $path,

                            'arquivo_mime'=>
                                $mime,

                            'arquivo_tamanho'=>
                                (int)$file
                                    ->getSize(),

                            'hash_arquivo'=>
                                $hash,

                            'capturado_em'=>
                                $data['capturado_em']
                                ??now(),

                            'metadados'=>
                                $data['metadados']
                                ??null,
                        ]);

                    $media->tenant_id=
                        $checklist->tenant_id;

                    $media->checklist_record_id=
                        $checklist->id;

                    $media->uploaded_by=
                        $user->id;

                    $media->save();

                    return $media->load(
                        'uploadedBy:id,name'
                    );
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
    }

    public function destroy(
        ChecklistRecord $checklist,
        ChecklistMedia $media
    ): void {
        $this->ensureEditable(
            $checklist
        );

        if(
            $media->tenant_id!==
                $checklist->tenant_id ||
            $media->checklist_record_id!==
                $checklist->id
        ){
            abort(404);
        }

        $path=
            $media->arquivo_path;

        DB::transaction(
            fn()=>
                $media->delete()
        );

        if($path){
            Storage::disk('local')
                ->delete(
                    $path
                );
        }
    }

    private function ensureEditable(
        ChecklistRecord $checklist
    ): void {
        if(
            $checklist->estado!==
            'rascunho'
        ){
            throw ValidationException::withMessages([
                'checklist'=>
                    'Checklists finalizados não podem receber ou remover evidências.',
            ]);
        }
    }
}