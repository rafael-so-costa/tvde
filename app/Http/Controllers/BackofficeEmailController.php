<?php

namespace App\Http\Controllers;

use App\Mail\EmailTestMail;
use App\Models\EmailLog;
use App\Services\EmailConfigurationService;
use App\Services\EmailDispatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class BackofficeEmailController extends Controller
{
    public function __construct(
        private EmailConfigurationService $configuration,
        private EmailDispatchService $emailDispatch
    ){}

    public function configuration():JsonResponse
    {
        return response()->json([
            'data'=>
                $this
                    ->configuration
                    ->publicConfiguration(),
        ]);
    }

    public function updateConfiguration(
        Request $request
    ):JsonResponse{
        $validated=
            $request->validate([
                'enabled'=>[
                    'required',
                    'boolean',
                ],

                'host'=>[
                    'required',
                    'string',
                    'max:190',
                ],

                'port'=>[
                    'required',
                    'integer',
                    'min:1',
                    'max:65535',
                ],

                'scheme'=>[
                    'nullable',
                    'string',
                    'in:smtp,smtps',
                ],

                'username'=>[
                    'nullable',
                    'string',
                    'max:190',
                ],

                'smtp_password'=>[
                    'nullable',
                    'string',
                    'max:1000',
                ],

                'clear_password'=>[
                    'sometimes',
                    'boolean',
                ],

                'from_address'=>[
                    'required',
                    'email',
                    'max:190',
                ],

                'from_name'=>[
                    'required',
                    'string',
                    'max:190',
                ],
            ]);

        $this
            ->configuration
            ->save(
                $validated,
                $request->user()?->id
            );

        return response()->json([
            'message'=>
                'Configuração de e-mail atualizada com sucesso.',

            'data'=>
                $this
                    ->configuration
                    ->publicConfiguration(),
        ]);
    }

    public function test(
        Request $request
    ):JsonResponse{
        $validated=
            $request->validate([
                'email'=>[
                    'required',
                    'email',
                    'max:190',
                ],
            ]);

        try{
            $this
                ->emailDispatch
                ->send(
                    to:
                        $validated['email'],

                    mailable:
                        new EmailTestMail(
                            recipientName:
                                $request
                                    ->user()
                                    ?->name
                                    ?: 'Administrador'
                        ),

                    subject:
                        'Teste de envio — FrotaPRO',

                    category:
                        'system_test',

                    initiatedByUserId:
                        $request
                            ->user()
                            ?->id
                );

            $this
                ->configuration
                ->recordTest(
                    true
                );
        }
        catch(Throwable $exception){
            $this
                ->configuration
                ->recordTest(
                    false,
                    $exception
                        ->getMessage()
                );

            return response()->json([
                'message'=>
                    'Falha ao enviar o e-mail de teste.',

                'error'=>
                    $exception
                        ->getMessage(),
            ],422);
        }

        return response()->json([
            'message'=>
                'E-mail de teste enviado com sucesso.',
        ]);
    }

    public function summary():JsonResponse
    {
        $now=
            now();

        return response()->json([
            'data'=>[
                'configuration'=>
                    $this
                        ->configuration
                        ->publicConfiguration(),

                'metrics'=>[
                    'total'=>
                        EmailLog::query()
                            ->count(),

                    'sent'=>
                        EmailLog::query()
                            ->where(
                                'status',
                                'sent'
                            )
                            ->count(),

                    'failed'=>
                        EmailLog::query()
                            ->where(
                                'status',
                                'failed'
                            )
                            ->count(),

                    'blocked'=>
                        EmailLog::query()
                            ->where(
                                'status',
                                'blocked'
                            )
                            ->count(),

                    'processing'=>
                        EmailLog::query()
                            ->where(
                                'status',
                                'processing'
                            )
                            ->count(),

                    'sent_24h'=>
                        EmailLog::query()
                            ->where(
                                'status',
                                'sent'
                            )
                            ->where(
                                'created_at',
                                '>=',
                                $now
                                    ->copy()
                                    ->subDay()
                            )
                            ->count(),

                    'failed_24h'=>
                        EmailLog::query()
                            ->where(
                                'status',
                                'failed'
                            )
                            ->where(
                                'created_at',
                                '>=',
                                $now
                                    ->copy()
                                    ->subDay()
                            )
                            ->count(),
                ],

                'latest'=>
                    EmailLog::query()
                        ->with([
                            'tenant:id,nome',
                            'initiatedBy:id,name,email',
                        ])
                        ->latest()
                        ->limit(10)
                        ->get(),
            ],
        ]);
    }

    public function logs(
        Request $request
    ):JsonResponse{
        $validated=
            $request->validate([
                'search'=>[
                    'nullable',
                    'string',
                    'max:190',
                ],

                'status'=>[
                    'nullable',
                    'string',
                    'in:processing,sent,failed,blocked',
                ],

                'category'=>[
                    'nullable',
                    'string',
                    'max:80',
                ],

                'tenant_id'=>[
                    'nullable',
                    'uuid',
                ],

                'date_from'=>[
                    'nullable',
                    'date',
                ],

                'date_to'=>[
                    'nullable',
                    'date',
                ],

                'per_page'=>[
                    'nullable',
                    'integer',
                    'min:1',
                    'max:100',
                ],
            ]);

        $query=
            EmailLog::query()
                ->with([
                    'tenant:id,nome',
                    'initiatedBy:id,name,email',
                ])
                ->latest();

        if(
            filled(
                $validated['search']
                ?? null
            )
        ){
            $term=
                trim(
                    $validated['search']
                );

            $query->where(
                function($query) use(
                    $term
                ){
                    $query
                        ->where(
                            'recipient_email',
                            'like',
                            '%'.$term.'%'
                        )
                        ->orWhere(
                            'subject',
                            'like',
                            '%'.$term.'%'
                        );
                }
            );
        }

        foreach(
            [
                'status',
                'category',
                'tenant_id',
            ] as $field
        ){
            if(
                filled(
                    $validated[$field]
                    ?? null
                )
            ){
                $query->where(
                    $field,
                    $validated[$field]
                );
            }
        }

        if(
            filled(
                $validated['date_from']
                ?? null
            )
        ){
            $query->whereDate(
                'created_at',
                '>=',
                $validated['date_from']
            );
        }

        if(
            filled(
                $validated['date_to']
                ?? null
            )
        ){
            $query->whereDate(
                'created_at',
                '<=',
                $validated['date_to']
            );
        }

        $paginator=
            $query->paginate(
                (int)(
                    $validated['per_page']
                    ?? 25
                )
            );

        return response()->json([
            'data'=>
                $paginator->items(),

            'meta'=>[
                'current_page'=>
                    $paginator
                        ->currentPage(),

                'last_page'=>
                    $paginator
                        ->lastPage(),

                'per_page'=>
                    $paginator
                        ->perPage(),

                'total'=>
                    $paginator
                        ->total(),
            ],
        ]);
    }
}