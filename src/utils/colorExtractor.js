export async function extractEdgeColor(faviconUrl) {
	try {
		const res = await fetch(faviconUrl)
		const blob = await res.blob()
		const blobUrl = URL.createObjectURL(blob)

		const img = new Image()
		await new Promise((resolve, reject) => {
			img.onload = resolve
			img.onerror = reject
			img.src = blobUrl
		})

		const canvas = document.createElement('canvas')
		canvas.width = img.width
		canvas.height = img.height
		const ctx = canvas.getContext('2d')
		ctx.drawImage(img, 0, 0)

		const { width: w, height: h } = canvas
		const data = ctx.getImageData(0, 0, w, h).data

		const pixels = []
		for (let x = 0; x < w; x++) {
			pixels.push(getPixel(data, x, 0, w))         // верх
			pixels.push(getPixel(data, x, h - 1, w))     // низ
		}
		for (let y = 1; y < h - 1; y++) {
			pixels.push(getPixel(data, 0, y, w))          // лево
			pixels.push(getPixel(data, w - 1, y, w))      // право
		}

		const avg = pixels.reduce(
			(acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b],
			[0, 0, 0]
		).map(v => Math.round(v / pixels.length))

		URL.revokeObjectURL(blobUrl)
		return rgbToHex(...avg)
	} catch {
		return '#1e1e1e'
	}
}

function getPixel(data, x, y, width) {
	const i = (y * width + x) * 4
	return [data[i], data[i + 1], data[i + 2]]
}

function rgbToHex(r, g, b) {
 	return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

export function contrastColor(hex) {
	const r = parseInt(hex.slice(1, 3), 16)
	const g = parseInt(hex.slice(3, 5), 16)
	const b = parseInt(hex.slice(5, 7), 16)

	const [h, s, l] = rgbToHsl(r, g, b)
	const newL = l > 50 ? l - 40 : l + 40
	return hslToHex(h, s, newL)
}

function rgbToHsl(r, g, b) {
	r /= 255; g /= 255; b /= 255
	const max = Math.max(r, g, b), min = Math.min(r, g, b)
	let h, s, l = (max + min) / 2
	if (max === min) { h = s = 0 }
	else {
		const d = max - min
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
		switch (max) {
			case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
			case g: h = ((b - r) / d + 2) / 6; break
			case b: h = ((r - g) / d + 4) / 6; break
		}
	}
	return [h * 360, s * 100, l * 100]
}

function hslToHex(h, s, l) {
	s /= 100; l /= 100
	const a = s * Math.min(l, 1 - l)
	const f = n => {
		const k = (n + h / 30) % 12
		const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
		return Math.round(255 * color).toString(16).padStart(2, '0')
	}
	return `#${f(0)}${f(8)}${f(4)}`
}

export function getTextColor(hex) {
	const r = parseInt(hex.slice(1, 3), 16)
	const g = parseInt(hex.slice(3, 5), 16)
	const b = parseInt(hex.slice(5, 7), 16)
	// формула относительной яркости
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
	return luminance > 0.5 ? '#111111' : '#f0f0f0'
}