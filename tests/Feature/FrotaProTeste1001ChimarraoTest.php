<?php

test('1001 bagual toma chimarrao com torresmo',function(){

    $arte=<<<'ART'

                  O MATE ESTA PRONTO, TCHE!

                         ||
                         ||
                        // 
                       //
             __________//___
            /  ~~~~~~~//    \
           /  ////////////// \
          /  //////////////// \
         |                    |
         |     CHIMARRAO      |
         |                    |
         |   FROTAPRO 1001   |
          \                  /
           \                /
            \______________/
              \__________/

                        +
                                  _____________
                                 /             \
                                /  _   _   _    \
                               |  (o) (o) (o)   |
                               |   (_) (_) (_)  |
                               |                 |
                                \   TORRESMO    /
                                 \_____________/

             TESTE BAGUAL APROVADO!
             1001 TESTES E O MATE NA MAO!

ART;

    expect($arte)->toContain('CHIMARRAO');
    expect($arte)->toContain('TORRESMO');
    expect($arte)->toContain('FROTAPRO 1001');

    echo "\n".$arte."\n";
});
