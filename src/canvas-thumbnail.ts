import type { CanvasReferenceEdge, CanvasReferenceNode, CanvasSnapshot } from "./canvas-reference-model";

const SVG_NS = "http://www.w3.org/2000/svg";
let markerSequence = 0;
let clipSequence = 0;

export function renderCanvasThumbnail(
	parent: HTMLElement,
	snapshot: CanvasSnapshot,
	options: { focusNodeId?: string; className?: string } = {},
): SVGSVGElement {
	const bounds = canvasSnapshotBounds(snapshot.nodes);
	const ownerDocument = parent.ownerDocument;
	const svg = ownerDocument.createElementNS(SVG_NS, "svg");
	svg.setAttribute("viewBox", `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
	svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
	svg.setAttribute("aria-hidden", "true");
	if (options.className) svg.classList.add(options.className);
	const defs = ownerDocument.createElementNS(SVG_NS, "defs");
	const marker = ownerDocument.createElementNS(SVG_NS, "marker");
	marker.setAttribute("id", `arc-canvas-arrow-${++markerSequence}`);
	marker.setAttribute("markerWidth", "5");
	marker.setAttribute("markerHeight", "5");
	marker.setAttribute("refX", "4");
	marker.setAttribute("refY", "2.5");
	marker.setAttribute("orient", "auto");
	const arrow = ownerDocument.createElementNS(SVG_NS, "path");
	arrow.setAttribute("d", "M0,0 L5,2.5 L0,5 Z");
	arrow.setAttribute("fill", "currentColor");
	marker.appendChild(arrow);
	defs.appendChild(marker);
	svg.appendChild(defs);
	const markerId = marker.getAttribute("id") ?? "";

	const nodes = new Map(snapshot.nodes.map((node) => [node.id, node]));
	const edgeLayer = ownerDocument.createElementNS(SVG_NS, "g");
	edgeLayer.classList.add("arc-canvas-thumbnail-edges");
	for (const edge of snapshot.edges) {
		const from = nodes.get(edge.fromNode);
		const to = nodes.get(edge.toNode);
		if (!from || !to) continue;
		edgeLayer.appendChild(renderEdge(ownerDocument, edge, from, to, markerId));
	}
	svg.appendChild(edgeLayer);

	const nodeLayer = ownerDocument.createElementNS(SVG_NS, "g");
	nodeLayer.classList.add("arc-canvas-thumbnail-nodes");
	for (const node of snapshot.nodes) nodeLayer.appendChild(renderNode(ownerDocument, node, node.id === options.focusNodeId));
	svg.appendChild(nodeLayer);
	parent.appendChild(svg);
	return svg;
}

function renderNode(ownerDocument: Document, node: CanvasReferenceNode, focused: boolean): SVGGElement {
	const group = ownerDocument.createElementNS(SVG_NS, "g");
	group.classList.add("arc-canvas-thumbnail-node");
	if (focused) group.classList.add("is-reference-target");
	const rect = ownerDocument.createElementNS(SVG_NS, "rect");
	rect.setAttribute("x", String(node.x));
	rect.setAttribute("y", String(node.y));
	rect.setAttribute("width", String(Math.max(2, node.width)));
	rect.setAttribute("height", String(Math.max(2, node.height)));
	rect.setAttribute("rx", node.type === "group" ? "1" : "3");
	rect.setAttribute("fill", canvasColor(node.color));
	rect.setAttribute("fill-opacity", node.type === "group" ? "0.12" : "0.78");
	rect.setAttribute("stroke", focused ? "var(--interactive-accent, #65b785)" : "currentColor");
	rect.setAttribute("stroke-opacity", focused ? "1" : "0.48");
	rect.setAttribute("stroke-width", focused ? "4" : "1.5");
	group.appendChild(rect);
	const previewText = nodePreviewText(node);
	if (previewText && node.width >= 34 && node.height >= 20) {
		const clipId = `arc-canvas-node-clip-${++clipSequence}`;
		const defs = ownerDocument.createElementNS(SVG_NS, "defs");
		const clip = ownerDocument.createElementNS(SVG_NS, "clipPath");
		clip.id = clipId;
		const clipRect = ownerDocument.createElementNS(SVG_NS, "rect");
		clipRect.setAttribute("x", String(node.x + 5));
		clipRect.setAttribute("y", String(node.y + 3));
		clipRect.setAttribute("width", String(Math.max(0, node.width - 10)));
		clipRect.setAttribute("height", String(Math.max(0, node.height - 6)));
		clip.appendChild(clipRect);
		defs.appendChild(clip);
		group.appendChild(defs);
		const text = ownerDocument.createElementNS(SVG_NS, "text");
		text.setAttribute("x", String(node.x + 8));
		text.setAttribute("y", String(node.y + Math.min(node.height - 4, 17)));
		text.setAttribute("font-size", String(Math.max(8, Math.min(15, node.height * 0.2))));
		text.setAttribute("fill", "var(--text-normal, #e5ebe7)");
		text.setAttribute("fill-opacity", node.type === "group" ? "0.5" : "0.78");
		text.setAttribute("clip-path", `url(#${clipId})`);
		text.textContent = previewText;
		group.appendChild(text);
	}
	return group;
}

function nodePreviewText(node: CanvasReferenceNode): string {
	const source = node.type === "file" ? node.file : node.text || node.label;
	if (!source) return "";
	const normalized = source
		.replace(/^\s*#{1,6}\s*/, "")
		.replace(/^\s*[-*+]\s+/, "")
		.replace(/!?(\[\[([^\]|]+)(?:\|([^\]]+))?\]\])/g, (_match, _whole: string, path: string, alias?: string) => alias?.trim() || path.split("/").pop() || path)
		.replace(/\s+/g, " ")
		.trim();
	return normalized.length > 48 ? `${normalized.slice(0, 47)}…` : normalized;
}

function renderEdge(ownerDocument: Document, edge: CanvasReferenceEdge, from: CanvasReferenceNode, to: CanvasReferenceNode, markerId: string): SVGPathElement {
	const startX = from.x + from.width / 2;
	const startY = from.y + from.height / 2;
	const endX = to.x + to.width / 2;
	const endY = to.y + to.height / 2;
	const bend = Math.max(12, Math.abs(endX - startX) * 0.25);
	const direction = endX >= startX ? 1 : -1;
	const path = ownerDocument.createElementNS(SVG_NS, "path");
	path.setAttribute("d", `M ${startX} ${startY} C ${startX + bend * direction} ${startY}, ${endX - bend * direction} ${endY}, ${endX} ${endY}`);
	path.setAttribute("fill", "none");
	path.setAttribute("stroke", canvasColor(edge.color));
	path.setAttribute("stroke-width", "2.4");
	path.setAttribute("stroke-opacity", "0.8");
	path.setAttribute("marker-end", `url(#${markerId})`);
	return path;
}

export function canvasSnapshotBounds(nodes: readonly CanvasReferenceNode[]): { x: number; y: number; width: number; height: number } {
	if (nodes.length === 0) return { x: 0, y: 0, width: 1, height: 1 };
	const minX = Math.min(...nodes.map((node) => node.x));
	const minY = Math.min(...nodes.map((node) => node.y));
	const maxX = Math.max(...nodes.map((node) => node.x + node.width));
	const maxY = Math.max(...nodes.map((node) => node.y + node.height));
	const padding = 24;
	return {
		x: minX - padding,
		y: minY - padding,
		width: Math.max(1, maxX - minX + padding * 2),
		height: Math.max(1, maxY - minY + padding * 2),
	};
}

export function canvasSnapshotAspectRatio(nodes: readonly CanvasReferenceNode[]): number {
	if (nodes.length === 0) return 1;
	const minX = Math.min(...nodes.map((node) => node.x));
	const minY = Math.min(...nodes.map((node) => node.y));
	const maxX = Math.max(...nodes.map((node) => node.x + node.width));
	const maxY = Math.max(...nodes.map((node) => node.y + node.height));
	const width = maxX - minX;
	const height = maxY - minY;
	return width > 0 && height > 0 ? width / height : 1;
}

function canvasColor(color: string | number | null | undefined): string {
	if (typeof color === "string" && (/^#[0-9a-f]{3,8}$/i.test(color) || /^(?:rgb|hsl|oklch|color)\(/i.test(color))) return color;
	const colors: Record<string, string> = {
		"1": "var(--color-red, #dd6565)",
		"2": "var(--color-orange, #df8b42)",
		"3": "var(--color-yellow, #d3b04a)",
		"4": "var(--color-green, #48a876)",
		"5": "var(--color-cyan, #4da9a7)",
		"6": "var(--color-purple, #8d72c7)",
		default: "var(--background-modifier-border, #7c8388)",
	};
	return colors[color === null || color === undefined ? "default" : String(color)] ?? colors.default!;
}
