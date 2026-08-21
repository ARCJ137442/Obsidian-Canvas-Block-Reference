/** Track per-window listener registration across plugin reloads. */
export class WindowRegistrationRegistry<T extends object> {
	private readonly registered = new Set<T>();

	claim(target: T): boolean {
		if (this.registered.has(target)) return false;
		this.registered.add(target);
		return true;
	}

	release(target: T): void {
		this.registered.delete(target);
	}

	clear(): void {
		this.registered.clear();
	}

	get size(): number {
		return this.registered.size;
	}
}
