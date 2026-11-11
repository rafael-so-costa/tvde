import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';
import { useEffect, useMemo, useState } from 'react';

interface Props {
    value: string | null | undefined;
    onChange: (value: string) => void;
    id?: string;
    name?: string;
    className?: string;
    required?: boolean;
    disabled?: boolean;
}

const DEFAULT_COUNTRY: CountryCode = 'PT';
const countries = getCountries();
const labels = (() => {
    try {
        return new Intl.DisplayNames(['pt-PT', 'pt'], { type: 'region' });
    } catch {
        return null;
    }
})();

function flag(code: CountryCode): string {
    return [...code].map((letter) =>
        String.fromCodePoint(127397 + letter.charCodeAt(0))
    ).join('');
}

function digits(value: string): string {
    return value.replace(/\D/g, '');
}

export default function InternationalPhoneInput({
    value, onChange, id, name, className, required, disabled,
}: Props) {
    const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
    const raw = String(value ?? '').trim();

    const international = useMemo(() => {
        const text = raw.startsWith('00') ? `+${raw.slice(2)}` : raw;
        return text.startsWith('+') ? parsePhoneNumberFromString(text) : undefined;
    }, [raw]);

    useEffect(() => {
        if (international?.country && international.country !== country) {
            setCountry(international.country);
        }
    }, [international?.country]);

    const dial = getCountryCallingCode(country);
    const national = useMemo(() => {
        const prefix = `+${dial}`;
        if (raw.startsWith(prefix)) return digits(raw.slice(prefix.length));
        if (international) return international.nationalNumber;
        return digits(raw);
    }, [raw, dial, international]);

    const formatted = useMemo(
        () => new AsYouType(country).input(national),
        [national, country],
    );

    const options = useMemo(() => countries.map((code) => ({
        code,
        name: labels?.of(code) ?? code,
        dial: getCountryCallingCode(code),
    })).sort((a, b) => a.code === 'PT' ? -1 : b.code === 'PT' ? 1 : a.name.localeCompare(b.name, 'pt')), []);

    function emit(code: CountryCode, input: string) {
        const callingCode = getCountryCallingCode(code);
        const numbers = digits(input).slice(0, 15 - callingCode.length);
        onChange(numbers ? `+${callingCode}${numbers}` : '');
    }

    function onNumberChange(text: string) {
        const compact = text.trim().replace(/^00/, '+');
        if (compact.startsWith('+')) {
            const parsed = parsePhoneNumberFromString(compact);
            if (parsed?.country) {
                setCountry(parsed.country);
                emit(parsed.country, parsed.nationalNumber);
                return;
            }
        }
        emit(country, text);
    }

    return (
        <div className="flex w-full min-w-0 gap-2">
            <div className="relative flex shrink-0 items-center rounded-xl border border-slate-200 bg-white px-2 text-sm">
                <span aria-hidden="true">{flag(country)} +{dial}</span>
                <select
                    aria-label="País e indicativo telefónico"
                    title="Selecionar país"
                    value={country}
                    disabled={disabled}
                    onChange={(event) => {
                        const next = event.target.value as CountryCode;
                        setCountry(next);
                        emit(next, national);
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                >
                    {options.map((item) => (
                        <option key={item.code} value={item.code}>
                            {flag(item.code)} {item.name} (+{item.dial})
                        </option>
                    ))}
                </select>
            </div>
            <input
                id={id}
                name={name}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={formatted}
                onChange={(event) => onNumberChange(event.target.value)}
                required={required}
                disabled={disabled}
                placeholder="912 345 678"
                className={`${className ?? ''} min-w-0 flex-1`}
            />
        </div>
    );
}