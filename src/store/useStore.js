import { create } from 'zustand'
import { loadState, saveState } from '../utils/storage'

const DEFAULT_STATE = {
	favorites: [],
	sections: [],
	unsectioned: [],
	bookmarks: {},
	tabTitle: 'New Tab',
}

const useStore = create((set, get) => ({
	...DEFAULT_STATE,

	init: async () => {
		const saved = await loadState()
		if (saved) set(saved)
	},

	persist: () => {
		const { init, persist, ...state } = get()
		saveState(state)
	},
}))

export default useStore