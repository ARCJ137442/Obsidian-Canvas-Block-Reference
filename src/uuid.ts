type WebCryptoLike = {
	randomUUID?: () => string
	getRandomValues?: (array: Uint8Array) => Uint8Array
}

/** 生成不依赖 Node.js 的 Canvas 元素 UUID。 */
export function createCanvasElementId(): string {
	const webCrypto = (globalThis as { crypto?: WebCryptoLike }).crypto
	if (webCrypto?.randomUUID) return webCrypto.randomUUID()

	if (webCrypto?.getRandomValues) {
		const bytes = webCrypto.getRandomValues(new Uint8Array(16))
		bytes[6] = (bytes[6] & 0x0f) | 0x40
		bytes[8] = (bytes[8] & 0x3f) | 0x80
		return formatUuidBytes(bytes)
	}

	// 极老环境的兼容兜底。Canvas ID 只要求会话内唯一，不要求密码学用途。
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
		const random = Math.floor(Math.random() * 16)
		const value = char === "x" ? random : (random & 0x3) | 0x8
		return value.toString(16)
	})
}

function formatUuidBytes(bytes: Uint8Array): string {
	const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
