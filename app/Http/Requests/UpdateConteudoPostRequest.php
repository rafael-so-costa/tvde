<?php

namespace App\Http\Requests;

class UpdateConteudoPostRequest extends StoreConteudoPostRequest
{
    public function rules(): array
    {
        $rules=parent::rules();

        foreach($rules as $key=>$rule){
            if(in_array($key,['tipo','titulo','conteudo'],true)){
                array_unshift($rules[$key],'sometimes');
            }
        }

        return $rules;
    }
}
