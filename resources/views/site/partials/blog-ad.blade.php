@php
    $creative=$ad['creative'];
    $isFooter=($variant??'sidebar')==='footer';
@endphp

<div
    data-public-ad
    data-delivery-token="{{ $ad['delivery_token'] }}"
    class="{{ $isFooter?'overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm':'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm' }}">

    <div class="border-b border-slate-100 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        Publicidade
    </div>

    <div class="{{ $isFooter?'grid md:grid-cols-[16rem_minmax(0,1fr)] md:items-center':'' }}">
        @if($creative['media_type']==='image' && $creative['image_url'])
            <div class="{{ $isFooter?'aspect-[16/9] md:h-full md:aspect-auto':'aspect-[16/10]' }} overflow-hidden bg-slate-100">
                <picture>
                    @if($creative['mobile_image_url'])
                        <source
                            media="(max-width:640px)"
                            srcset="{{ $creative['mobile_image_url'] }}">
                    @endif

                    <img
                        src="{{ $creative['image_url'] }}"
                        alt="{{ $creative['alt_text'] ?: ($creative['headline'] ?: 'Publicidade') }}"
                        loading="lazy"
                        class="h-full w-full object-cover">
                </picture>
            </div>
        @endif

        <div class="{{ $isFooter?'p-6':'p-4' }}">
            <div class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {{ $ad['advertiser']['name'] }}
            </div>

            @if($creative['headline'])
                <div class="{{ $isFooter?'mt-2 text-xl':'mt-2 text-base' }} font-bold leading-snug text-slate-950">
                    {{ $creative['headline'] }}
                </div>
            @endif

            @if($creative['body'])
                <p class="mt-2 text-sm leading-6 text-slate-600">
                    {{ $creative['body'] }}
                </p>
            @endif

            @if($creative['click_url'] && $creative['cta_label'])
                <a
                    href="{{ $creative['click_url'] }}"
                    @if($creative['destination_type']!=='phone')
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                    @endif
                    class="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-indigo-600">
                    {{ $creative['cta_label'] }}
                </a>
            @endif
        </div>
    </div>
</div>