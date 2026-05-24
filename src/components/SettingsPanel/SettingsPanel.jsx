import { useRef, useState } from 'react'
import styles from './SettingsPanel.module.scss'
import useStore, {
	FAVORITES_MAX_SLOTS,
	FAVORITES_MIN_SLOTS,
	clampFavoritesSlots,
} from '../../store/useStore'

const normalizeFavoritesBySlotLimit = (state, nextSlots) => {
	const favoritesSlots = clampFavoritesSlots(nextSlots)
	const favorites = state.favorites ?? []

	if (favorites.length <= favoritesSlots) {
		return {
			...state,
			favoritesSlots,
			favorites,
		}
	}

	const nextFavorites = favorites.slice(0, favoritesSlots)
	const overflowFavorites = favorites.slice(favoritesSlots)
	const overflowSet = new Set(overflowFavorites)
	const unsectionedSet = new Set(state.unsectioned ?? [])
	const bookmarkIds = new Set(Object.keys(state.bookmarks ?? {}))
	const overflowToMove = overflowFavorites.filter(id => bookmarkIds.has(id) && !unsectionedSet.has(id))

	return {
		...state,
		favoritesSlots,
		favorites: nextFavorites,
		unsectioned: [...(state.unsectioned ?? []), ...overflowToMove],
		sections: (state.sections ?? []).map(section => ({
			...section,
			bookmarkIds: section.bookmarkIds.filter(id => !overflowSet.has(id)),
		})),
	}
}

export default function SettingsPanel({ onClose }) {
	const fileInputRef = useRef(null)
	const { bookmarks, sections, unsectioned, favorites, favoritesSlots, tabTitle, persist } = useStore()
	const [titleInput, setTitleInput] = useState(tabTitle || 'New Tab')
	const [favoritesSlotsInput, setFavoritesSlotsInput] = useState(String(favoritesSlots))

	const handleTitleSave = () => {
		useStore.setState({ tabTitle: titleInput })
		persist()
	}

	const handleFavoritesSlotsSave = () => {
		const nextSlots = clampFavoritesSlots(favoritesSlotsInput)

		useStore.setState(state => normalizeFavoritesBySlotLimit(state, nextSlots))
		setFavoritesSlotsInput(String(nextSlots))
		persist()
	}

	const handleExport = () => {
		const state = { bookmarks, sections, unsectioned, favorites, favoritesSlots, tabTitle }
		const json = JSON.stringify(state, null, 2)
		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		
		const now = new Date()
		const pad = n => String(n).padStart(2, '0')
		const dateStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}_${pad(now.getHours())}.${pad(now.getMinutes())}`
		a.download = `mytab_bookmarks_${dateStr}.json`	

		a.click()
		URL.revokeObjectURL(url)
	}

  	const handleImportFile = (e) => {
		const file = e.target.files[0]
		if (!file) return

		const reader = new FileReader()
		reader.onload = (ev) => {
			try {
				const imported = JSON.parse(ev.target.result)

				if (!imported.bookmarks || !imported.sections) {
					alert('Неверный формат файла')
					return
				}

				const strategy = confirm(
					'Нажми OK — заменить все данные\nНажми Отмена — добавить к существующим'
				)

				if (strategy) {
					const nextState = normalizeFavoritesBySlotLimit({
						bookmarks: imported.bookmarks,
						sections: imported.sections,
						unsectioned: imported.unsectioned ?? [],
						favorites: imported.favorites ?? [],
						tabTitle: imported.tabTitle ?? 'New Tab',
					}, imported.favoritesSlots ?? favoritesSlots)

					useStore.setState(nextState)
					setFavoritesSlotsInput(String(nextState.favoritesSlots))
				} else {
					useStore.setState(s => normalizeFavoritesBySlotLimit({
						bookmarks: { ...s.bookmarks, ...imported.bookmarks },
						sections: [...s.sections, ...imported.sections],
						unsectioned: [...s.unsectioned, ...(imported.unsectioned ?? [])],
						favorites: [...new Set([...s.favorites, ...(imported.favorites ?? [])])],
						favoritesSlots: s.favoritesSlots,
						tabTitle: s.tabTitle || imported.tabTitle || 'New Tab',
					}, s.favoritesSlots))
				}

				persist()
				onClose()
			} catch {
				alert('Ошибка чтения файла — проверь формат JSON')
			}
		}
		reader.readAsText(file)
 	}

  	return (
		<>
			<div className={styles.backdrop} onClick={onClose} />
			<div className={styles.panel}>
				<div className={styles.title}>Настройки</div>

				<div className={styles.section}>
					<div className={styles.sectionTitle}>Экспорт</div>
					<button className={styles.btn} onClick={handleExport}>
						⬇️ Сохранить закладки
					</button>
				</div>

				<div className={styles.section}>
					<div className={styles.sectionTitle}>Импорт</div>
					<button className={styles.btn} onClick={() => fileInputRef.current.click()}>
						⬆️ Загрузить закладки из файла
					</button>
					<input
						ref={fileInputRef}
						type="file"
						accept=".json"
						style={{ display: 'none' }}
						onChange={handleImportFile}
					/>
				</div>

				<div className={styles.section}>
					<div className={styles.sectionTitle}>Название вкладки</div>
					<div style={{ display: 'flex', gap: 8 }}>
						<input
							className={styles.input}
							value={titleInput}
							onChange={e => setTitleInput(e.target.value)}
							onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
							placeholder="New Tab"
						/>
						<button className={styles.btn} onClick={handleTitleSave}>
							💾
						</button>
					</div>
				</div>

				<div className={styles.section}>
					<div className={styles.sectionTitle}>FavoritesBar slots</div>
					<div className={styles.inlineControl}>
						<input
							className={styles.input}
							type="number"
							min={FAVORITES_MIN_SLOTS}
							max={FAVORITES_MAX_SLOTS}
							value={favoritesSlotsInput}
							onChange={e => setFavoritesSlotsInput(e.target.value)}
							onKeyDown={e => e.key === 'Enter' && handleFavoritesSlotsSave()}
						/>
						<button className={styles.btn} onClick={handleFavoritesSlotsSave}>
							💾
						</button>
					</div>
					<div className={styles.hint}>
						От {FAVORITES_MIN_SLOTS} до {FAVORITES_MAX_SLOTS}. Если слотов станет меньше, лишние закладки уйдут вниз в «Без раздела».
					</div>
				</div>
			</div>
		</>
  	)
}