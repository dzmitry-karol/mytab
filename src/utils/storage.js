const KEY = 'appState'

const isExtension = typeof chrome !== 'undefined' && chrome.storage

export async function loadState() {
	if (!isExtension) return null
	return new Promise((resolve) => {
		chrome.storage.local.get(KEY, (result) => {
			resolve(result[KEY] ?? null)
		})
	})
}

export async function saveState(state) {
	if (!isExtension) return
	return new Promise((resolve) => {
		chrome.storage.local.set({ [KEY]: state }, resolve)
	})
}