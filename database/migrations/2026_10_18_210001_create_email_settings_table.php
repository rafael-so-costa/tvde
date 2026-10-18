<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up():void
    {
        Schema::create(
            'email_settings',
            function(Blueprint $table){
                $table->uuid('id')->primary();

                $table
                    ->boolean('enabled')
                    ->default(true);

                $table
                    ->string('mailer',50)
                    ->default('smtp');

                $table
                    ->string('host',190)
                    ->nullable();

                $table
                    ->unsignedInteger('port')
                    ->nullable();

                $table
                    ->string('scheme',20)
                    ->nullable();

                $table
                    ->string('username',190)
                    ->nullable();

                $table
                    ->text('smtp_password')
                    ->nullable();

                $table
                    ->string('from_address',190)
                    ->nullable();

                $table
                    ->string('from_name',190)
                    ->nullable();

                $table
                    ->timestamp('last_test_at')
                    ->nullable();

                $table
                    ->string('last_test_status',30)
                    ->nullable();

                $table
                    ->text('last_test_error')
                    ->nullable();

                $table
                    ->foreignUuid('updated_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamps();
            }
        );
    }

    public function down():void
    {
        Schema::dropIfExists(
            'email_settings'
        );
    }
};