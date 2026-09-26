<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alert_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->string('code', 120);
            $table->string('name', 160);
            $table->string('category', 60);

            $table->text('description')
                ->nullable();

            $table->string('severity', 20)
                ->default('medium');

            $table->boolean('enabled')
                ->default(true);

            $table->json('channels')
                ->nullable();

            $table->json('recipient_config')
                ->nullable();

            $table->json('trigger_config')
                ->nullable();

            $table->json('repeat_config')
                ->nullable();

            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignUuid('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->unique(
                ['tenant_id', 'code'],
                'alert_rules_tenant_code_unique'
            );

            $table->index(
                ['tenant_id', 'category', 'enabled'],
                'alert_rules_tenant_category_index'
            );
        });

        Schema::create('alerts', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('rule_id')
                ->nullable()
                ->constrained('alert_rules')
                ->nullOnDelete();

            $table->string('rule_code', 120);

            $table->string('source_type', 80);

            $table->string('source_id', 191)
                ->nullable();

            $table->string('dedup_key', 191);

            /*
             * fingerprint identifica a condição lógica.
             * active_key identifica apenas a ocorrência atualmente aberta.
             *
             * Ao resolver:
             * active_key = null
             *
             * Se a mesma condição voltar no futuro:
             * nasce uma nova ocorrência com o mesmo fingerprint.
             */
            $table->char('fingerprint', 64);

            $table->char('active_key', 64)
                ->nullable();

            $table->string('category', 60);
            $table->string('severity', 20);

            $table->string('status', 20)
                ->default('open');

            $table->string('title');
            $table->text('message')
                ->nullable();

            $table->timestamp('due_at')
                ->nullable();

            $table->timestamp('triggered_at')
                ->useCurrent();

            $table->timestamp('resolved_at')
                ->nullable();

            $table->string('resolution_type', 30)
                ->nullable();

            $table->text('resolution_note')
                ->nullable();

            $table->string('action_url', 500)
                ->nullable();

            $table->json('metadata')
                ->nullable();

            $table->foreignUuid('resolved_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->unique(
                ['tenant_id', 'active_key'],
                'alerts_tenant_active_key_unique'
            );

            $table->index(
                ['tenant_id', 'status', 'severity'],
                'alerts_tenant_status_severity_index'
            );

            $table->index(
                ['tenant_id', 'category', 'status'],
                'alerts_tenant_category_status_index'
            );

            $table->index(
                ['tenant_id', 'fingerprint'],
                'alerts_tenant_fingerprint_index'
            );

            $table->index(
                ['tenant_id', 'due_at'],
                'alerts_tenant_due_index'
            );

            $table->index(
                ['source_type', 'source_id'],
                'alerts_source_index'
            );
        });

        Schema::create('alert_recipients', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('alert_id')
                ->constrained('alerts')
                ->cascadeOnDelete();

            $table->foreignUuid('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->boolean('active')
                ->default(true);

            $table->timestamp('read_at')
                ->nullable();

            $table->timestamp('acknowledged_at')
                ->nullable();

            $table->timestamp('snoozed_until')
                ->nullable();

            $table->timestamps();

            $table->unique(
                ['alert_id', 'user_id'],
                'alert_recipients_alert_user_unique'
            );

            $table->index(
                ['tenant_id', 'user_id', 'active'],
                'alert_recipients_user_index'
            );

            $table->index(
                ['user_id', 'read_at'],
                'alert_recipients_read_index'
            );

            $table->index(
                ['user_id', 'snoozed_until'],
                'alert_recipients_snooze_index'
            );
        });

        Schema::create('alert_deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            $table->foreignUuid('alert_recipient_id')
                ->constrained('alert_recipients')
                ->cascadeOnDelete();

            $table->string('channel', 30);

            $table->string('status', 30)
                ->default('queued');

            $table->unsignedSmallInteger('attempts')
                ->default(0);

            $table->string('provider', 80)
                ->nullable();

            $table->string('provider_message_id', 191)
                ->nullable();

            $table->timestamp('queued_at')
                ->nullable();

            $table->timestamp('sent_at')
                ->nullable();

            $table->timestamp('delivered_at')
                ->nullable();

            $table->timestamp('failed_at')
                ->nullable();

            $table->text('error')
                ->nullable();

            $table->json('metadata')
                ->nullable();

            $table->timestamps();

            $table->index(
                ['tenant_id', 'status'],
                'alert_deliveries_tenant_status_index'
            );

            $table->index(
                ['alert_recipient_id', 'channel'],
                'alert_deliveries_recipient_channel_index'
            );

            $table->index(
                ['provider', 'provider_message_id'],
                'alert_deliveries_provider_index'
            );
        });

        Schema::create(
            'notification_preferences',
            function (Blueprint $table) {
                $table->uuid('id')->primary();

                $table->foreignUuid('tenant_id')
                    ->constrained('tenants')
                    ->cascadeOnDelete();

                $table->foreignUuid('user_id')
                    ->constrained('users')
                    ->cascadeOnDelete();

                /*
                 * "*" representa preferência geral.
                 * Também poderemos usar categorias:
                 * document, maintenance, diagnostic...
                 */
                $table->string('category', 60)
                    ->default('*');

                $table->string('channel', 30);

                $table->boolean('enabled')
                    ->default(true);

                $table->string(
                    'minimum_severity',
                    20
                )->default('low');

                $table->string(
                    'delivery_mode',
                    20
                )->default('immediate');

                $table->time('quiet_hours_start')
                    ->nullable();

                $table->time('quiet_hours_end')
                    ->nullable();

                $table->string('timezone', 64)
                    ->nullable();

                $table->timestamps();

                $table->unique(
                    [
                        'tenant_id',
                        'user_id',
                        'category',
                        'channel',
                    ],
                    'notification_preferences_unique'
                );

                $table->index(
                    ['tenant_id', 'user_id'],
                    'notification_preferences_user_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'notification_preferences'
        );

        Schema::dropIfExists(
            'alert_deliveries'
        );

        Schema::dropIfExists(
            'alert_recipients'
        );

        Schema::dropIfExists(
            'alerts'
        );

        Schema::dropIfExists(
            'alert_rules'
        );
    }
};
