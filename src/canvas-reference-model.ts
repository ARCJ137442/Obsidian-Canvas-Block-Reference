export type CanvasReferenceOptions = {
	includeFileNodes: boolean;
	includeTextLinks: boolean;
};

export const DEFAULT_CANVAS_REFERENCE_OPTIONS: Readonly<CanvasReferenceOptions> = {
	includeFileNodes: true,
	includeTextLinks: false,
};

export type CanvasReferenceKind = "file-node" | "text-link";
export type CanvasTextLinkSyntax = "wikilink" | "markdown" | "embed";

export type CanvasReferenceNode = {
	id: string;
	type: string;
	x: number;
	y: number;
	width: number;
	height: number;
	color?: string | number | null;
	text?: string;
	file?: string;
	label?: string;
};

export type CanvasReferenceEdge = {
	id: string;
	fromNode: string;
	toNode: string;
	color?: string | number | null;
	label?: string;
};

export type CanvasSnapshot = {
	path: string;
	nodes: CanvasReferenceNode[];
	edges: CanvasReferenceEdge[];
};

export type CanvasReferenceOccurrence = {
	sourceCanvasPath: string;
	sourceNodeId: string;
	targetCanvasPath: string;
	kind: CanvasReferenceKind;
	syntax?: CanvasTextLinkSyntax;
	entryLabel: string;
	x: number;
	y: number;
	width: number;
	height: number;
};

export type CanvasReferenceSourceGroup = {
	path: string;
	name: string;
	entries: CanvasReferenceOccurrence[];
};

export type CanvasReferenceSelectionPlan =
	| { kind: "empty" }
	| { kind: "direct"; entry: CanvasReferenceOccurrence }
	| { kind: "choose-source"; sources: CanvasReferenceSourceGroup[] }
	| { kind: "choose-entry"; source: CanvasReferenceSourceGroup };

export type ExtractedCanvasTextLink = {
	linkpath: string;
	label: string;
	syntax: CanvasTextLinkSyntax;
	offset: number;
};

export function normalizeCanvasReferenceOptions(value: unknown): CanvasReferenceOptions {
	if (!isRecord(value)) return { ...DEFAULT_CANVAS_REFERENCE_OPTIONS };
	return {
		includeFileNodes: typeof value.includeFileNodes === "boolean"
			? value.includeFileNodes
			: DEFAULT_CANVAS_REFERENCE_OPTIONS.includeFileNodes,
		includeTextLinks: typeof value.includeTextLinks === "boolean"
			? value.includeTextLinks
			: DEFAULT_CANVAS_REFERENCE_OPTIONS.includeTextLinks,
	};
}

export function parseCanvasSnapshot(rawText: string, path: string): CanvasSnapshot {
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawText);
	} catch {
		throw new Error(`Canvas JSON 无法解析：${path}`);
	}
	if (!isRecord(parsed) || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
		throw new Error(`Canvas 结构无效：${path}`);
	}
	return {
		path,
		nodes: parsed.nodes.map(normalizeNode),
		edges: parsed.edges.map((edge, index) => normalizeEdge(edge, index)),
	};
}

export function collectCanvasReferenceOccurrences(
	snapshot: CanvasSnapshot,
	resolveCanvasPath: (linkpath: string, sourcePath: string) => string | undefined,
	options: CanvasReferenceOptions,
): CanvasReferenceOccurrence[] {
	const nodesById = new Map(snapshot.nodes.map((node) => [node.id, node]));
	const neighbors = new Map<string, CanvasReferenceNode[]>();
	for (const edge of snapshot.edges) {
		const from = nodesById.get(edge.fromNode);
		const to = nodesById.get(edge.toNode);
		if (from && to) {
			pushNeighbor(neighbors, from.id, to);
			pushNeighbor(neighbors, to.id, from);
		}
	}

	const occurrences: CanvasReferenceOccurrence[] = [];
	for (const node of snapshot.nodes) {
		if (!node.id) continue;
		if (options.includeFileNodes && node.type === "file" && node.file) {
			const target = resolveCanvasPath(node.file, snapshot.path);
			if (target && target !== snapshot.path) {
				occurrences.push({
					sourceCanvasPath: snapshot.path,
					sourceNodeId: node.id,
					targetCanvasPath: target,
					kind: "file-node",
					entryLabel: fileNodeEntryLabel(node, neighbors.get(node.id) ?? [], snapshot.nodes),
					x: node.x,
					y: node.y,
					width: node.width,
					height: node.height,
				});
			}
		}
		if (options.includeTextLinks && node.type === "text" && node.text) {
			for (const link of extractCanvasTextLinks(node.text)) {
				const target = resolveCanvasPath(link.linkpath, snapshot.path);
				if (!target || target === snapshot.path) continue;
				occurrences.push({
					sourceCanvasPath: snapshot.path,
					sourceNodeId: node.id,
					targetCanvasPath: target,
					kind: "text-link",
					syntax: link.syntax,
					entryLabel: textLinkEntryLabel(link, node.text),
					x: node.x,
					y: node.y,
					width: node.width,
					height: node.height,
				});
			}
		}
	}
	return occurrences;
}

export function extractCanvasTextLinks(text: string): ExtractedCanvasTextLink[] {
	const links: ExtractedCanvasTextLink[] = [];
	const occupied: Array<[number, number]> = [];
	const wikiPattern = /!?\[\[([^\]]+)\]\]/g;
	let match: RegExpExecArray | null;
	while ((match = wikiPattern.exec(text)) !== null) {
		const raw = (match[1] ?? "").trim();
		const separator = raw.indexOf("|");
		const linkpath = (separator >= 0 ? raw.slice(0, separator) : raw).trim();
		if (!isInternalLinkpath(linkpath)) continue;
		const isEmbed = text[match.index] === "!";
		links.push({
			linkpath,
			label: separator >= 0 ? raw.slice(separator + 1).trim() : "",
			syntax: isEmbed ? "embed" : "wikilink",
			offset: match.index,
		});
		occupied.push([match.index, wikiPattern.lastIndex]);
	}

	const markdownPattern = /!?\[([^\]]*)\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\s*\)/g;
	while ((match = markdownPattern.exec(text)) !== null) {
		if (occupied.some(([start, end]) => match!.index >= start && match!.index < end)) continue;
		const rawPath = (match[2] ?? "").replace(/^<|>$/g, "").trim();
		if (!isInternalLinkpath(rawPath)) continue;
		links.push({
			linkpath: decodeMarkdownPath(rawPath),
			label: (match[1] ?? "").trim(),
			syntax: text[match.index] === "!" ? "embed" : "markdown",
			offset: match.index,
		});
	}
	return links.sort((left, right) => left.offset - right.offset);
}

export function buildCanvasReferenceGraph(
	paths: readonly string[],
	occurrences: readonly CanvasReferenceOccurrence[],
): CanvasReferenceGraphEdge[] {
	const knownPaths = new Set(paths);
	const edges = new Map<string, CanvasReferenceGraphEdge>();
	for (const occurrence of occurrences) {
		if (!knownPaths.has(occurrence.sourceCanvasPath) || !knownPaths.has(occurrence.targetCanvasPath)) continue;
		const key = `${occurrence.sourceCanvasPath}\0${occurrence.targetCanvasPath}`;
		let edge = edges.get(key);
		if (!edge) {
			edge = {
				sourceCanvasPath: occurrence.sourceCanvasPath,
				targetCanvasPath: occurrence.targetCanvasPath,
				occurrences: [],
			};
			edges.set(key, edge);
		}
		edge.occurrences.push(occurrence);
	}
	return [...edges.values()];
}

export function planCanvasReferenceSelection(occurrences: readonly CanvasReferenceOccurrence[]): CanvasReferenceSelectionPlan {
	if (occurrences.length === 0) return { kind: "empty" };
	const sources = groupCanvasReferencesBySource(occurrences);
	if (sources.length > 1) return { kind: "choose-source", sources };
	const source = sources[0]!;
	return source.entries.length === 1
		? { kind: "direct", entry: source.entries[0]! }
		: { kind: "choose-entry", source };
}

export function planCanvasReferenceSourceSelection(source: CanvasReferenceSourceGroup): Exclude<CanvasReferenceSelectionPlan, { kind: "empty" } | { kind: "choose-source" }> {
	return source.entries.length === 1
		? { kind: "direct", entry: source.entries[0]! }
		: { kind: "choose-entry", source };
}

export function groupCanvasReferencesBySource(occurrences: readonly CanvasReferenceOccurrence[]): CanvasReferenceSourceGroup[] {
	const grouped = new Map<string, CanvasReferenceOccurrence[]>();
	for (const occurrence of occurrences) {
		const entries = grouped.get(occurrence.sourceCanvasPath) ?? [];
		entries.push(occurrence);
		grouped.set(occurrence.sourceCanvasPath, entries);
	}
	return [...grouped.entries()]
		.map(([path, entries]) => ({ path, name: basename(path), entries }))
		.sort((left, right) => left.name.localeCompare(right.name, "zh-CN") || left.path.localeCompare(right.path));
}

export type CanvasReferenceGraphEdge = {
	sourceCanvasPath: string;
	targetCanvasPath: string;
	occurrences: CanvasReferenceOccurrence[];
};

function normalizeNode(value: unknown): CanvasReferenceNode {
	if (!isRecord(value)) return { id: "", type: "unknown", x: 0, y: 0, width: 0, height: 0 };
	return {
		id: typeof value.id === "string" ? value.id : "",
		type: typeof value.type === "string" ? value.type : "unknown",
		x: finiteNumber(value.x),
		y: finiteNumber(value.y),
		width: finiteNumber(value.width),
		height: finiteNumber(value.height),
		color: isColor(value.color) ? value.color : undefined,
		text: typeof value.text === "string" ? value.text : undefined,
		file: typeof value.file === "string" ? value.file : undefined,
		label: typeof value.label === "string" ? value.label : undefined,
	};
}

function normalizeEdge(value: unknown, index: number): CanvasReferenceEdge {
	if (!isRecord(value)) return { id: `edge-${index + 1}`, fromNode: "", toNode: "" };
	return {
		id: typeof value.id === "string" ? value.id : `edge-${index + 1}`,
		fromNode: typeof value.fromNode === "string" ? value.fromNode : "",
		toNode: typeof value.toNode === "string" ? value.toNode : "",
		color: isColor(value.color) ? value.color : undefined,
		label: typeof value.label === "string" ? value.label : undefined,
	};
}

function fileNodeEntryLabel(reference: CanvasReferenceNode, neighbors: CanvasReferenceNode[], allNodes: CanvasReferenceNode[]): string {
	const connected = neighbors
		.map(readableNodeLabel)
		.filter(Boolean)
		.slice(0, 2);
	if (connected.length > 0) return connected.join(" · ");

	const nearby = allNodes
		.filter((node) => node.id !== reference.id)
		.map((node) => ({
			node,
			label: readableNodeLabel(node),
			distance: nodeDistance(reference, node),
		}))
		.filter((candidate) => candidate.label && candidate.distance <= 720)
		.map((candidate) => ({ ...candidate, score: nearbyLabelScore(candidate.node, candidate.label, candidate.distance) }))
		.sort((left, right) => right.score - left.score || left.distance - right.distance);
	const meaningful = nearby.find((candidate) => candidate.score > 0);
	if (!meaningful) return nearby[0]?.label ?? "白板文件节点";

	const location = nearby
		.filter((candidate) => candidate.distance <= 180)
		.map(({ node }) => extractLocationHint(node))
		.find((hint) => hint && !meaningful.label.includes(hint));
	return location ? `${location} · ${meaningful.label}` : meaningful.label;
}

function readableNodeLabel(node: CanvasReferenceNode): string {
	const raw = node.label || node.text || (node.type === "file" ? node.file : "") || "";
	const firstLine = raw.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";
	let label = firstLine
		.replace(/^\s*#{1,6}\s*/, "")
		.replace(/^\s*[-*+]\s+/, "")
		.replace(/^\s*\[[ xX]\]\s*/, "")
		.replace(/!?\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (_match, path: string, alias?: string) => alias?.trim() || basename(path))
		.replace(/!?\[([^\]]*)\]\(([^)]*)\)/g, (_match, text: string, path: string) => text.trim() || basename(path))
		.replace(/\*\*|__|~~|`/g, "")
		.replace(/\s+/g, " ")
		.trim();
	// A short heading before a colon is usually a more useful entry name than the task body that follows it.
	const colon = label.search(/[：:]/);
	if (colon > 0 && colon <= 48) label = label.slice(0, colon).trim();
	// For dated headings, foreground the human topic instead of making the date the primary label.
	label = label.replace(/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\s*/, "").trim();
	return cleanLabel(label);
}

function nearbyLabelScore(node: CanvasReferenceNode, label: string, distance: number): number {
	const source = node.text ?? node.label ?? "";
	let score = -distance / 100;
	if (/^\s*#{1,6}\s/.test(source)) score += 3;
	if (/\[[ xX]\]|待办|任务|物资|准备|行李|计划|目标|安排|主线|项目|主题|研究|会议|工作/.test(source + label)) score += 5;
	if (/\[[ xX]\]/.test(source)) score += 3;
	if (label.length >= 5 && label.length <= 48) score += 1.5;
	if (label.length > 64) score -= 2;
	if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(?:\s*[~～—-].*)?$/.test(label)) score -= 5;
	return score;
}

function nodeDistance(left: CanvasReferenceNode, right: CanvasReferenceNode): number {
	const dx = Math.max(0, left.x - (right.x + right.width), right.x - (left.x + left.width));
	const dy = Math.max(0, left.y - (right.y + right.height), right.y - (left.y + left.height));
	return Math.hypot(dx, dy);
}

function extractLocationHint(node: CanvasReferenceNode): string | undefined {
	const source = node.text ?? node.label ?? "";
	if (!/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(source)) return undefined;
	const match = source.match(/@\s*([^@，,;；|]+)/);
	return match?.[1] ? cleanLabel(match[1]) : undefined;
}

function textLinkEntryLabel(link: ExtractedCanvasTextLink, sourceText: string): string {
	if (link.label) return cleanLabel(link.label);
	const start = Math.max(0, link.offset - 36);
	const end = Math.min(sourceText.length, link.offset + link.linkpath.length + 48);
	const excerpt = cleanLabel(sourceText.slice(start, end)
		.replace(/!?\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, alias?: string) => alias?.trim() || basename(target))
		.replace(/!?\[([^\]]*)\]\(([^)]*)\)/g, (_match, label: string, path: string) => label.trim() || basename(path)));
	return excerpt || basename(link.linkpath) || (link.syntax === "embed" ? "嵌入链接入口" : "文本链接入口");
}

function cleanLabel(value: string): string {
	return value.replace(/\s+/g, " ").trim().slice(0, 72);
}

function pushNeighbor(map: Map<string, CanvasReferenceNode[]>, id: string, node: CanvasReferenceNode): void {
	const list = map.get(id) ?? [];
	list.push(node);
	map.set(id, list);
}

function isInternalLinkpath(value: string): boolean {
	return Boolean(value)
		&& !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)
		&& !value.startsWith("^");
}

function decodeMarkdownPath(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function finiteNumber(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isColor(value: unknown): value is string | number | null {
	return typeof value === "string" || typeof value === "number" || value === null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function basename(path: string): string {
	return path.split("/").filter(Boolean).pop()?.replace(/\.canvas$/i, "") ?? path;
}
