import { create } from 'zustand'
import { loadState, saveState } from '../utils/storage'
import { clearExpiredCache } from '../utils/faviconCache'

export const FAVORITES_MIN_SLOTS = 3
export const FAVORITES_MAX_SLOTS = 10
export const DEFAULT_FAVORITES_SLOTS = 8

export const clampFavoritesSlots = (value) => {
	const parsed = Number(value)
	if (Number.isNaN(parsed)) return DEFAULT_FAVORITES_SLOTS
	return Math.max(FAVORITES_MIN_SLOTS, Math.min(FAVORITES_MAX_SLOTS, parsed))
}

const DEFAULT_STATE = {
	favorites: [],
	favoritesSlots: DEFAULT_FAVORITES_SLOTS,
	sections: [],
	unsectioned: [],
	bookmarks: {},
	tabTitle: 'New Tab',
}

const useStore = create((set, get) => ({
	...DEFAULT_STATE,

	init: async () => {
		const saved = await loadState()
		if (saved) {
			set({
				...saved,
				favoritesSlots: clampFavoritesSlots(saved.favoritesSlots ?? DEFAULT_FAVORITES_SLOTS),
			})
		}

		clearExpiredCache().catch(err => {
			console.error('Failed to clear expired favicon cache:', err)
		})
	},

	persist: () => {
		const { init, persist, ...state } = get()
		saveState(state)
	},
}))

export default useStore