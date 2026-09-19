import {
    PointerEvent,
    useEffect,
    useRef,
} from 'react';
import {
    Eraser,
    PenLine,
} from 'lucide-react';

interface Props {
    label: string;
    onChange: (
        value: string
    ) => void;
    disabled?: boolean;
}

export default function SignaturePad({
    label,
    onChange,
    disabled = false,
}: Props) {
    const canvasRef =
        useRef<HTMLCanvasElement | null>(
            null
        );

    const drawing =
        useRef(false);

    useEffect(() => {
        const canvas =
            canvasRef.current;

        if (!canvas) {
            return;
        }

        const rect =
            canvas.getBoundingClientRect();

        const ratio =
            window.devicePixelRatio ||
            1;

        canvas.width =
            rect.width * ratio;

        canvas.height =
            180 * ratio;

        const context =
            canvas.getContext('2d');

        if (!context) {
            return;
        }

        context.scale(
            ratio,
            ratio
        );

        context.lineWidth = 2;
        context.lineCap =
            'round';

        context.lineJoin =
            'round';

        context.strokeStyle =
            '#0f172a';
    }, []);

    function coordinates(
        event: PointerEvent<HTMLCanvasElement>
    ) {
        const canvas =
            canvasRef.current!;

        const rect =
            canvas.getBoundingClientRect();

        return {
            x:
                event.clientX -
                rect.left,
            y:
                event.clientY -
                rect.top,
        };
    }

    function start(
        event: PointerEvent<HTMLCanvasElement>
    ) {
        if (disabled) {
            return;
        }

        const canvas =
            canvasRef.current;

        const context =
            canvas?.getContext('2d');

        if (
            !canvas ||
            !context
        ) {
            return;
        }

        canvas.setPointerCapture(
            event.pointerId
        );

        const point =
            coordinates(event);

        context.beginPath();

        context.moveTo(
            point.x,
            point.y
        );

        drawing.current =
            true;
    }

    function move(
        event: PointerEvent<HTMLCanvasElement>
    ) {
        if (
            !drawing.current ||
            disabled
        ) {
            return;
        }

        const context =
            canvasRef.current?.getContext(
                '2d'
            );

        if (!context) {
            return;
        }

        const point =
            coordinates(event);

        context.lineTo(
            point.x,
            point.y
        );

        context.stroke();
    }

    function finish() {
        if (
            !drawing.current
        ) {
            return;
        }

        drawing.current =
            false;

        const canvas =
            canvasRef.current;

        if (!canvas) {
            return;
        }

        onChange(
            canvas.toDataURL(
                'image/png'
            )
        );
    }

    function clear() {
        const canvas =
            canvasRef.current;

        const context =
            canvas?.getContext('2d');

        if (
            !canvas ||
            !context
        ) {
            return;
        }

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        onChange('');
    }

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <PenLine className="w-4 h-4" />
                    {label}
                </label>

                <button
                    type="button"
                    onClick={clear}
                    disabled={disabled}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 disabled:opacity-50"
                >
                    <Eraser className="w-4 h-4" />
                    Limpar
                </button>
            </div>

            <canvas
                ref={canvasRef}
                onPointerDown={
                    start
                }
                onPointerMove={
                    move
                }
                onPointerUp={
                    finish
                }
                onPointerCancel={
                    finish
                }
                className="block h-[180px] w-full touch-none rounded-xl border border-slate-200 bg-white cursor-crosshair"
            />

            <p className="mt-1.5 text-xs text-slate-400">
                Assine no campo acima utilizando o rato, touchpad ou ecrã tátil.
            </p>
        </div>
    );
}
