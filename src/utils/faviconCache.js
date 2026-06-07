const DB_NAME = 'FaviconCache'
const STORE_NAME = 'favicons'
const DB_VERSION = 1
const CACHE_TTL = 14 * 24 * 60 * 60 * 1000 // 14 дней

let dbPromise = null

function getDB() {
	if (!dbPromise) {
		dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION)

			request.onerror = () => reject(request.error)
			request.onsuccess = () => resolve(request.result)

			request.onupgradeneeded = (event) => {
				const db = event.target.result
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					db.createObjectStore(STORE_NAME, { keyPath: 'url' })
				}
			}
		})
	}
	return dbPromise
}

export async function getCachedFavicon(url) {
	try {
		const db = await getDB()
		const tx = db.transaction(STORE_NAME, 'readonly')
		const store = tx.objectStore(STORE_NAME)

		return new Promise((resolve, reject) => {
			const request = store.get(url)
			request.onsuccess = () => {
				const entry = request.result
				if (!entry) {
					resolve(null)
					return
				}

				const age = Date.now() - entry.timestamp
				if (age > CACHE_TTL) {
					resolve(null)
					return
				}

				resolve(entry.dataUrl)
			}
			request.onerror = () => reject(request.error)
		})
	} catch (err) {
		console.error('Failed to get cached favicon:', err)
		return null
	}
}

export async function cacheFavicon(url, forceRefresh = false) {
	try {
		if (!forceRefresh) {
			const cached = await getCachedFavicon(url)
			if (cached) return cached
		}

		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`)
		}

		const contentType = response.headers.get('content-type')
		if (!contentType || !contentType.startsWith('image')) {
			throw new Error('Not an image')
		}

		const blob = await response.blob()
		if (blob.size < 100) {
			throw new Error('Image too small')
		}

		const dataUrl = await new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => resolve(reader.result)
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})

		await validateImage(dataUrl)

		const db = await getDB()
		const tx = db.transaction(STORE_NAME, 'readwrite')
		const store = tx.objectStore(STORE_NAME)

		await new Promise((resolve, reject) => {
			const request = store.put({
				url,
				dataUrl,
				timestamp: Date.now()
			})
			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error)
		})

		return dataUrl
	} catch (err) {
		console.error('Failed to cache favicon:', err)
		throw err
	}
}

function validateImage(dataUrl) {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve()
		img.onerror = () => reject(new Error('Invalid image'))
		img.src = dataUrl
	})
}

export async function clearExpiredCache() {
	try {
		const db = await getDB()
		const tx = db.transaction(STORE_NAME, 'readwrite')
		const store = tx.objectStore(STORE_NAME)

		const allRequest = store.getAll()

		await new Promise((resolve, reject) => {
			allRequest.onsuccess = () => {
				const entries = allRequest.result
				const now = Date.now()

				entries.forEach(entry => {
					const age = now - entry.timestamp
					if (age > CACHE_TTL) {
						store.delete(entry.url)
					}
				})

				resolve()
			}
			allRequest.onerror = () => reject(allRequest.error)
		})
	} catch (err) {
		console.error('Failed to clear expired cache:', err)
	}
}
