/** Prevent the same DOM keyboard event from being handled twice. */
export class KeyboardEventGuard {
	private readonly consumed = new WeakSet<object>()

	consume(event: object): boolean {
		if (this.consumed.has(event)) return false
		this.consumed.add(event)
		return true
	}
}
