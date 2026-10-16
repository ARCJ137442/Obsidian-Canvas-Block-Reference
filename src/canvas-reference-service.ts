import { normalizePath, TFile, type App } from "obsidian";
import {
	buildCanvasReferenceGraph,
	collectCanvasReferenceOccurrences,
	parseCanvasSnapshot,
	type CanvasReferenceOccurrence,
	type CanvasReferenceOptions,
	type CanvasSnapshot,
} from "./canvas-reference-model";
import type { ColorSemantics } from "./color-semantics";
import { meanTaskHue } from "./canvas-reference-color";

export type CanvasReferenceBoard = {
	path: string;
	name: string;
	snapshot: CanvasSnapshot;
	taskHue?: number;
};

export type CanvasReferenceGraph = {
	boards: CanvasReferenceBoard[];
	occurrences: CanvasReferenceOccurrence[];
	edges: ReturnType<typeof buildCanvasReferenceGraph>;
};

type CachedSnapshot = { mtime: number; snapshot: CanvasSnapshot };

/** Reads and derives Canvas references on demand; only parsed snapshots are cached in memory. */
export class CanvasReferenceService {
	private readonly snapshots = new Map<string, CachedSnapshot>();
	private readonly listeners = new Set<() => void>();

	constructor(
		private readonly app: App,
		private readonly getOptions: () => CanvasReferenceOptions,
		private readonly getColorSemantics: () => Readonly<ColorSemantics>,
	) {}

	async getIncomingCanvasReferences(targetCanvasPath: string): Promise<CanvasReferenceOccurrence[]> {
	const target = normalizeVaultPath(targetCanvasPath);
	const indexedSources = this.findIndexedSourcePaths(target);
	let sources = [...indexedSources];
	// MetadataCache normally indexes Canvas links. If it has no candidate yet, scan Canvas files once
	// for this request so an unresolved/early index cannot turn a real reference into a false empty state.
	if (sources.length === 0) sources = this.listCanvasFiles().map((file) => file.path);

	const options = this.getOptions();
	const occurrences: CanvasReferenceOccurrence[] = [];
	for (const sourcePath of sources) {
		if (sourcePath === target) continue;
		const snapshot = await this.readSnapshot(sourcePath);
		if (!snapshot) continue;
		occurrences.push(...collectCanvasReferenceOccurrences(
			snapshot,
			(linkpath, origin) => this.resolveCanvasPath(linkpath, origin),
			options,
		).filter((entry) => normalizeVaultPath(entry.targetCanvasPath) === target));
	}
	return occurrences.sort((left, right) =>
		left.sourceCanvasPath.localeCompare(right.sourceCanvasPath, "zh-CN")
		|| left.y - right.y
		|| left.x - right.x
		|| left.sourceNodeId.localeCompare(right.sourceNodeId));
	}

	async getGraph(): Promise<CanvasReferenceGraph> {
	const files = this.listCanvasFiles();
	const options = this.getOptions();
	const boards: CanvasReferenceBoard[] = [];
	const occurrences: CanvasReferenceOccurrence[] = [];
	for (const file of files) {
		const snapshot = await this.readSnapshot(file.path);
		if (!snapshot) continue;
		boards.push({
			path: file.path,
			name: file.basename,
			snapshot,
			taskHue: meanTaskHue(snapshot, this.getColorSemantics()),
		});
		occurrences.push(...collectCanvasReferenceOccurrences(
			snapshot,
			(linkpath, origin) => this.resolveCanvasPath(linkpath, origin),
			options,
		));
	}
	const paths = boards.map((board) => board.path);
	return { boards, occurrences, edges: buildCanvasReferenceGraph(paths, occurrences) };
	}

	invalidate(path?: string): void {
	if (path) this.snapshots.delete(normalizeVaultPath(path));
	else this.snapshots.clear();
	for (const listener of this.listeners) listener();
	}

	onChange(listener: () => void): () => void {
	this.listeners.add(listener);
	return () => this.listeners.delete(listener);
	}

	private findIndexedSourcePaths(targetPath: string): string[] {
	const sources: string[] = [];
	for (const [source, destinations] of Object.entries(this.app.metadataCache.resolvedLinks)) {
		if (!isCanvasPath(source)) continue;
		if (Object.keys(destinations).some((destination) => normalizeVaultPath(destination) === targetPath)) {
			sources.push(normalizeVaultPath(source));
		}
	}
	return [...new Set(sources)].sort((left, right) => left.localeCompare(right, "zh-CN"));
	}

	private listCanvasFiles(): TFile[] {
	return this.app.vault.getFiles()
		.filter((file) => file.extension.toLowerCase() === "canvas")
		.sort((left, right) => left.path.localeCompare(right.path, "zh-CN"));
	}

	private async readSnapshot(path: string): Promise<CanvasSnapshot | undefined> {
	const normalizedPath = normalizeVaultPath(path);
	const file = this.app.vault.getAbstractFileByPath(normalizePath(normalizedPath));
	if (!(file instanceof TFile) || file.extension.toLowerCase() !== "canvas") return undefined;
	const cached = this.snapshots.get(normalizedPath);
	if (cached?.mtime === file.stat.mtime) return cached.snapshot;
	try {
		const snapshot = parseCanvasSnapshot(await this.app.vault.cachedRead(file), file.path);
		this.snapshots.set(normalizedPath, { mtime: file.stat.mtime, snapshot });
		return snapshot;
	} catch (error) {
		console.warn(`[WhiteboardArc] 白板引用读取失败：${file.path}`, error);
		return undefined;
	}
	}

	private resolveCanvasPath(linkpath: string, sourcePath: string): string | undefined {
	const normalizedLink = normalizeVaultPath(linkpath.split("#", 1)[0] ?? linkpath);
	const direct = this.app.vault.getAbstractFileByPath(normalizePath(normalizedLink));
	const resolved = direct ?? this.app.metadataCache.getFirstLinkpathDest(normalizedLink, sourcePath);
	if (!(resolved instanceof TFile) || resolved.extension.toLowerCase() !== "canvas") return undefined;
	return normalizeVaultPath(resolved.path);
	}
}

function normalizeVaultPath(path: string): string {
	return path.trim().replace(/\\/g, "/").replace(/^\/+/, "");
}

function isCanvasPath(path: string): boolean {
	return path.toLowerCase().endsWith(".canvas");
}
