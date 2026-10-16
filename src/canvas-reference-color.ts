import type { CanvasSnapshot } from "./canvas-reference-model";
import type { ColorSemantics } from "./color-semantics";

const TASK_COLOR_HUES: Record<string, number> = {
	"1": 0,
	"2": 30,
	"3": 55,
	"4": 125,
};

/** Circular mean over only colors that ARC explicitly maps to task semantics. */
export function meanTaskHue(snapshot: CanvasSnapshot, semantics: Readonly<ColorSemantics>): number | undefined {
	let x = 0;
	let y = 0;
	let count = 0;
	for (const node of snapshot.nodes) {
		const color = node.color === null || node.color === undefined ? "" : String(node.color);
		if (!semantics[color]) continue;
		const hue = TASK_COLOR_HUES[color];
		if (hue === undefined) continue;
		const radians = hue * Math.PI / 180;
		x += Math.cos(radians);
		y += Math.sin(radians);
		count += 1;
	}
	if (count === 0 || (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9)) return undefined;
	return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
