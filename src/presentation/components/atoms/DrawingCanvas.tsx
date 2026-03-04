import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
} from "react";

export interface DrawingCanvasHandle {
	clear(): void;
	isEmpty(): boolean;
}

interface Props {
	width?: number;
	height?: number;
	strokeColor?: string;
	strokeWidth?: number;
	disabled?: boolean;
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(
	function DrawingCanvas(
		{
			width = 280,
			height = 280,
			strokeColor = "var(--color-text)",
			strokeWidth = 4,
			disabled = false,
		},
		ref,
	) {
		const canvasRef = useRef<HTMLCanvasElement>(null);
		const isDrawingRef = useRef(false);
		const hasStrokesRef = useRef(false);

		const clear = useCallback(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const ctx = canvas.getContext("2d");
			if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
			hasStrokesRef.current = false;
		}, []);

		useImperativeHandle(ref, () => ({
			clear,
			isEmpty: () => !hasStrokesRef.current,
		}));

		const getPos = useCallback((e: PointerEvent) => {
			const canvas = canvasRef.current;
			if (!canvas) return { x: 0, y: 0 };
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			return {
				x: (e.clientX - rect.left) * scaleX,
				y: (e.clientY - rect.top) * scaleY,
			};
		}, []);

		useEffect(() => {
			const canvas = canvasRef.current;
			if (!canvas || disabled) return;

			const ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.lineCap = "round";
				ctx.lineJoin = "round";
				ctx.lineWidth = strokeWidth;
				ctx.strokeStyle = strokeColor;
			}

			const onPointerDown = (e: PointerEvent) => {
				isDrawingRef.current = true;
				canvas.setPointerCapture(e.pointerId);
				if (!ctx) return;
				const pos = getPos(e);
				ctx.beginPath();
				ctx.moveTo(pos.x, pos.y);
			};

			const onPointerMove = (e: PointerEvent) => {
				if (!isDrawingRef.current || !ctx) return;
				const pos = getPos(e);
				ctx.lineTo(pos.x, pos.y);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(pos.x, pos.y);
				hasStrokesRef.current = true;
			};

			const onPointerUp = () => {
				isDrawingRef.current = false;
			};

			canvas.addEventListener("pointerdown", onPointerDown);
			canvas.addEventListener("pointermove", onPointerMove);
			canvas.addEventListener("pointerup", onPointerUp);
			canvas.addEventListener("pointerleave", onPointerUp);
			canvas.addEventListener("pointercancel", onPointerUp);

			return () => {
				canvas.removeEventListener("pointerdown", onPointerDown);
				canvas.removeEventListener("pointermove", onPointerMove);
				canvas.removeEventListener("pointerup", onPointerUp);
				canvas.removeEventListener("pointerleave", onPointerUp);
				canvas.removeEventListener("pointercancel", onPointerUp);
			};
		}, [disabled, strokeColor, strokeWidth, getPos]);

		return (
			<div className="relative inline-block">
				<canvas
					ref={canvasRef}
					width={width}
					height={height}
					className="rounded-xl border"
					aria-label="Drawing area for writing Thai characters"
					role="img"
					style={{
						touchAction: "none",
						borderColor: "var(--color-border)",
						background: "var(--color-surface-2)",
						width: `${width}px`,
						height: `${height}px`,
						cursor: disabled ? "default" : "crosshair",
						opacity: disabled ? 0.5 : 1,
					}}
				/>
				{!disabled && (
					<button
						type="button"
						onClick={clear}
						className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium transition-colors"
						style={{
							background: "var(--color-surface)",
							color: "var(--color-text-muted)",
							border: "1px solid var(--color-border)",
						}}
					>
						Clear
					</button>
				)}
			</div>
		);
	},
);
