export interface ContinuousZoomRuntime {
	setInterval(callback: () => void, delay: number): number;
	clearInterval(interval: number): void;
}

export interface ContinuousZoomController {
	readonly active: boolean;
	start(): void;
	stop(): void;
}

/**
 * Repeat zoom steps while the key is held. Starting is idempotent so duplicate
 * listener paths cannot create a second zoom timer for the same Window.
 */
export function createContinuousZoomController(
	runtime: ContinuousZoomRuntime,
	isKeyDown: () => boolean,
	getStep: () => number,
	zoom: (step: number) => void,
	intervalMs = 50,
): ContinuousZoomController {
	let interval: number | undefined;

	const stop = () => {
		if (interval === undefined) return;
		runtime.clearInterval(interval);
		interval = undefined;
	};

	const tick = () => {
		if (!isKeyDown()) {
			stop();
			return;
		}
		zoom(getStep());
	};

	return {
		get active() {
			return interval !== undefined;
		},
		start() {
			if (interval !== undefined) return;
			tick();
			if (isKeyDown()) interval = runtime.setInterval(tick, intervalMs);
		},
		stop,
	};
}
