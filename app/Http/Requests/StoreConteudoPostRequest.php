<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreConteudoPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /*
             * Compatibilidade temporária com clientes antigos.
             */
            'categoria_id'=>[
                'nullable',
                'uuid',
                Rule::exists(
                    'conteudo_categorias',
                    'id'
                ),
            ],

            'categoria_ids'=>[
                'sometimes',
                'array',
                'max:10',
            ],

            'categoria_ids.*'=>[
                'uuid',
                'distinct',
                Rule::exists(
                    'conteudo_categorias',
                    'id'
                ),
            ],

            'tipo'=>[
                'required',
                Rule::in([
                    'artigo',
                    'noticia',
                ]),
            ],

            'titulo'=>[
                'required',
                'string',
                'max:255',
            ],

            /*
             * slug NÃO é recebido.
             * O backend gera automaticamente pelo título.
             */

            'resumo'=>[
                'nullable',
                'string',
                'max:1000',
            ],

            'conteudo'=>[
                'required',
                'string',
            ],

            'imagem_destaque_path'=>[
                'nullable',
                'string',
                'max:500',
            ],

            'imagem_capa_path'=>[
                'nullable',
                'string',
                'max:500',
            ],

            'status'=>[
                'sometimes',
                Rule::in([
                    'rascunho',
                    'agendado',
                    'publicado',
                    'arquivado',
                ]),
            ],

            'publicado_em'=>[
                'nullable',
                'date',
            ],

            'seo_title'=>[
                'nullable',
                'string',
                'max:255',
            ],

            'seo_description'=>[
                'nullable',
                'string',
                'max:500',
            ],

            'canonical_url'=>[
                'nullable',
                'url',
                'max:500',
            ],

            'og_image_path'=>[
                'nullable',
                'string',
                'max:500',
            ],

            'robots'=>[
                'nullable',
                'string',
                'max:100',
            ],

            'tags'=>[
                'sometimes',
                'array',
                'max:30',
            ],

            'tags.*'=>[
                'string',
                'max:80',
            ],
        ];
    }
}