export async function fetchMeta(url) {
	const hostname = new URL(url).hostname
	const googleFavicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
	const directFavicon = `https://${hostname}/favicon.ico`

	// проверяем favicon.ico напрямую
	const favicon = await checkFavicon(directFavicon) ? directFavicon : googleFavicon

	try {
		const apiUrl = `https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`
		const res = await fetch(apiUrl)
		const data = await res.json()

		const suspiciousTitles = ['sign in', 'login', 'microsoft', 'authorization', 'войти']
		const isSuspicious = suspiciousTitles.some(t => (data.title || '').toLowerCase().includes(t))

		return {
			title: isSuspicious ? hostname : (data.title || hostname),
			favicon,
		}
	} catch {
		return { title: hostname, favicon }
	}
}

async function checkFavicon(url) {
	try {
		const res = await fetch(url, { method: 'HEAD' })
		return res.ok && res.headers.get('content-type')?.startsWith('image')
	} catch {
		return false
	}
}