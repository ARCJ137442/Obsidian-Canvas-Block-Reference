export type CanvasElementIdValidationError = "empty" | "duplicate"

export function normalizeCanvasElementId(id: string): string {
	return id.trim()
}

export function validateCanvasElementId(
	newId: string,
	currentId: string,
	existingIds: Iterable<string>,
): CanvasElementIdValidationError | undefined {
	if (!newId) return "empty"
	for (const existingId of existingIds) {
		if (existingId === newId && existingId !== currentId) return "duplicate"
	}
	return undefined
}
