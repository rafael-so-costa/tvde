<?php

namespace App\Services;

use App\Models\EmailSetting;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

class EmailConfigurationService
{
    public function setting():?EmailSetting
    {
        return EmailSetting::query()
            ->latest('created_at')
            ->first();
    }

    public function enabled(
        ?EmailSetting $setting=null
    ):bool{
        $setting ??=
            $this->setting();

        if($setting){
            return
                (bool)$setting->enabled;
        }

        return
            (bool)config(
                'mail.enabled',
                true
            );
    }

    public function mailerName(
        ?EmailSetting $setting=null
    ):string{
        $setting ??=
            $this->setting();

        if($setting){
            return 'smtp';
        }

        $mailer=
            (string)config(
                'mail.default',
                'log'
            );

        /*
         * O mailer "log" não transporta mensagens.
         * Para auditoria, representamos a intenção
         * como SMTP e o envio será bloqueado em apply().
         */
        return $mailer==='log'
            ?'smtp'
            :$mailer;
    }

    public function apply(
        ?EmailSetting $setting=null
    ):string{
        $setting ??=
            $this->setting();

        if(
            !$this->enabled(
                $setting
            )
        ){
            throw new RuntimeException(
                'O envio de e-mails está desativado no FrotaPRO.'
            );
        }

        if(!$setting){
            $mailer=
                (string)config(
                    'mail.default',
                    'log'
                );

            if($mailer==='log'){
                throw new RuntimeException(
                    'O SMTP do FrotaPRO ainda não está configurado.'
                );
            }

            return $mailer;
        }

        if(blank($setting->host)){
            throw new RuntimeException(
                'O servidor SMTP ainda não está configurado.'
            );
        }

        if(!$setting->port){
            throw new RuntimeException(
                'A porta SMTP ainda não está configurada.'
            );
        }

        if(blank($setting->from_address)){
            throw new RuntimeException(
                'O endereço do remetente ainda não está configurado.'
            );
        }

        config([
            'mail.default'=>'smtp',

            'mail.mailers.smtp'=>[
                'transport'=>'smtp',
                'scheme'=>
                    filled(
                        $setting->scheme
                    )
                        ?$setting->scheme
                        :null,

                'url'=>null,

                'host'=>
                    $setting->host,

                'port'=>
                    (int)$setting->port,

                'username'=>
                    filled(
                        $setting->username
                    )
                        ?$setting->username
                        :null,

                'password'=>
                    filled(
                        $setting->smtp_password
                    )
                        ?$setting->smtp_password
                        :null,

                'timeout'=>30,

                'local_domain'=>
                    parse_url(
                        (string)config(
                            'app.url'
                        ),
                        PHP_URL_HOST
                    ),
            ],

            'mail.from.address'=>
                $setting->from_address,

            'mail.from.name'=>
                $setting->from_name
                ?: 'FrotaPRO',
        ]);

        $root=
            Mail::getFacadeRoot();

        if(
            is_object($root) &&
            method_exists(
                $root,
                'purge'
            )
        ){
            $root->purge(
                'smtp'
            );
        }

        return 'smtp';
    }

    public function save(
        array $data,
        ?string $userId=null
    ):EmailSetting{
        $setting=
            $this->setting()
            ?? new EmailSetting();

        $setting->enabled=
            (bool)$data['enabled'];

        $setting->mailer='smtp';

        $setting->host=
            trim(
                $data['host']
            );

        $setting->port=
            (int)$data['port'];

        $setting->scheme=
            filled(
                $data['scheme']
                ?? null
            )
                ?$data['scheme']
                :null;

        $setting->username=
            filled(
                $data['username']
                ?? null
            )
                ?trim(
                    $data['username']
                )
                :null;

        if(
            ($data['clear_password']
                ?? false)===true
        ){
            $setting->smtp_password=
                null;
        }
        elseif(
            array_key_exists(
                'smtp_password',
                $data
            ) &&
            filled(
                $data['smtp_password']
            )
        ){
            $setting->smtp_password=
                $data['smtp_password'];
        }

        $setting->from_address=
            strtolower(
                trim(
                    $data['from_address']
                )
            );

        $setting->from_name=
            trim(
                $data['from_name']
            );

        $setting->updated_by=
            $userId;

        $setting->save();

        return $setting->refresh();
    }

    public function publicConfiguration():array
    {
        $setting=
            $this->setting();

        if(!$setting){
            return[
                'source'=>'environment',

                'configured'=>
                    filled(
                        config(
                            'mail.mailers.smtp.host'
                        )
                    ),

                'enabled'=>
                    (bool)config(
                        'mail.enabled',
                        true
                    ),

                'mailer'=>
                    config(
                        'mail.default',
                        'log'
                    ),

                'host'=>
                    config(
                        'mail.mailers.smtp.host'
                    ),

                'port'=>
                    config(
                        'mail.mailers.smtp.port'
                    ),

                'scheme'=>
                    config(
                        'mail.mailers.smtp.scheme'
                    ),

                'username'=>
                    config(
                        'mail.mailers.smtp.username'
                    ),

                'password_configured'=>
                    filled(
                        config(
                            'mail.mailers.smtp.password'
                        )
                    ),

                'from_address'=>
                    config(
                        'mail.from.address'
                    ),

                'from_name'=>
                    config(
                        'mail.from.name'
                    ),

                'last_test_at'=>null,
                'last_test_status'=>null,
                'last_test_error'=>null,
            ];
        }

        return[
            'source'=>'database',
            'configured'=>
                filled(
                    $setting->host
                ) &&
                filled(
                    $setting->from_address
                ),

            'enabled'=>
                $setting->enabled,

            'mailer'=>'smtp',

            'host'=>
                $setting->host,

            'port'=>
                $setting->port,

            'scheme'=>
                $setting->scheme,

            'username'=>
                $setting->username,

            'password_configured'=>
                filled(
                    $setting
                        ->smtp_password
                ),

            'from_address'=>
                $setting
                    ->from_address,

            'from_name'=>
                $setting
                    ->from_name,

            'last_test_at'=>
                $setting
                    ->last_test_at
                    ?->toISOString(),

            'last_test_status'=>
                $setting
                    ->last_test_status,

            'last_test_error'=>
                $setting
                    ->last_test_error,
        ];
    }

    public function recordTest(
        bool $successful,
        ?string $error=null
    ):void{
        $setting=
            $this->setting();

        if(!$setting){
            return;
        }

        $setting->last_test_at=
            now();

        $setting->last_test_status=
            $successful
                ?'success'
                :'failed';

        $setting->last_test_error=
            $successful
                ?null
                :mb_substr(
                    (string)$error,
                    0,
                    10000
                );

        $setting->save();
    }
}