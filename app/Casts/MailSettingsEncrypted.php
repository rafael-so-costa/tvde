<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\Crypt;
use RuntimeException;
use Throwable;

class MailSettingsEncrypted implements CastsAttributes
{
    public function get(
        Model $model,
        string $key,
        mixed $value,
        array $attributes
    ):?string{
        if($value===null||$value===''){
            return $value;
        }

        try{
            return $this
                ->encrypter()
                ->decryptString(
                    $value
                );
        }catch(DecryptException $dedicatedException){
            /*
             * Compatibilidade temporária com valores
             * anteriormente cifrados pela APP_KEY.
             */
            try{
                return Crypt::decryptString(
                    $value
                );
            }catch(Throwable){
                throw $dedicatedException;
            }
        }
    }

    public function set(
        Model $model,
        string $key,
        mixed $value,
        array $attributes
    ):?string{
        if($value===null||$value===''){
            return $value;
        }

        return $this
            ->encrypter()
            ->encryptString(
                (string)$value
            );
    }

    private function encrypter():Encrypter
    {
        $configured=
            (string)config(
                'mail.settings_key',
                ''
            );

        if($configured===''){
            throw new RuntimeException(
                'MAIL_SETTINGS_KEY não está configurada.'
            );
        }

        if(
            str_starts_with(
                $configured,
                'base64:'
            )
        ){
            $decoded=
                base64_decode(
                    substr(
                        $configured,
                        7
                    ),
                    true
                );
        }else{
            $decoded=$configured;
        }

        if(
            !is_string($decoded)||
            strlen($decoded)!==32
        ){
            throw new RuntimeException(
                'MAIL_SETTINGS_KEY deve conter exatamente 32 bytes.'
            );
        }

        return new Encrypter(
            $decoded,
            'AES-256-CBC'
        );
    }
}