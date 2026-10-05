<?php

namespace App\Providers;

use App\Services\AuditService;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->scoped(
            TenantContext::class,
            fn()=>new TenantContext()
        );
    }

    public function boot(): void
    {
        foreach([
            'created',
            'updated',
            'deleted',
        ] as $action){
            Event::listen(
                "eloquent.{$action}: *",
                function(
                    string $eventName,
                    array $data
                ) use(
                    $action
                ){
                    $model=
                        $data[0]??
                        null;

                    if(
                        !$model instanceof Model
                    ){
                        return;
                    }

                    app(
                        AuditService::class
                    )->capture(
                        $model,
                        $action
                    );
                }
            );
        }
    }
}
