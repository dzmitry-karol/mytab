import { useState, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import styles from './AddBookmarkModal.module.scss'
import { fetchMeta } from '../../utils/metaFetcher'
import { extractEdgeColor, contrastColor } from '../../utils/colorExtractor'
import useStore from '../../store/useStore'
import { useDebounce } from '../../utils/useDebounce'

const COLOR_MODES = ['auto', 'contrast', 'white', 'black']

function formatDaysAgo(timestamp) {
	const now = Date.now()
	const diff = now - timestamp
	const days = Math.floor(diff / (24 * 60 * 60 * 1000))

	if (days === 0) return 'сегодня'
	if (days === 1) return 'вчера'
	if (days < 7) return `${days}д назад`
	if (days < 14) return `${Math.floor(days / 7)}нед назад`
	return `${Math.floor(days / 7)}нед назад`
}

export default function AddBookmarkModal({ onClose, editBookmark = null, defaultSectionId = 'unsectioned' }) {
	const { sections, favorites, favoritesSlots, persist } = useStore()

	const [url, setUrl] = useState(editBookmark?.url ?? '')
	const [title, setTitle] = useState(editBookmark?.title ?? '')
	const [favicon, setFavicon] = useState(editBookmark?.favicon ?? '')
	const [bgColor, setBgColor] = useState(editBookmark?.bgColor ?? '#1e1e1e')
	const [autoColor, setAutoColor] = useState(editBookmark?.bgColor ?? '#1e1e1e')
	const [colorMode, setColorMode] = useState(editBookmark?.bgColorMode ?? 'auto')
	const [sectionId, setSectionId] = useState(defaultSectionId)
	const [loading, setLoading] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
	const [faviconCachedAt, setFaviconCachedAt] = useState(editBookmark?.faviconCachedAt ?? null)

	const debouncedUrl = useDebounce(url, 500)
	const initialUrl = editBookmark?.url ?? ''

	useEffect(() => {
		if (!debouncedUrl) return
		if (debouncedUrl === initialUrl) return

		const normalized = debouncedUrl.startsWith('http') ? debouncedUrl : `https://${debouncedUrl}`

		setLoading(true)
		fetchMeta(normalized)
			.then(async ({ title: t, favicon: f }) => {
				const color = await extractEdgeColor(f)
				setTitle(t)
				setFavicon(f)
				setAutoColor(color)
				setBgColor(color)
				setColorMode('auto')
				setFaviconCachedAt(Date.now())
			})
			.finally(() => setLoading(false))
	}, [debouncedUrl])

	const handleColorMode = (mode) => {
		setColorMode(mode)
		if (mode === 'auto') setBgColor(autoColor)
		else if (mode === 'contrast') setBgColor(contrastColor(autoColor))
		else if (mode === 'white') setBgColor('#ffffff')
		else if (mode === 'black') setBgColor('#000000')
	}

	const handleRefreshFavicon = async () => {
		if (!url) return

		const normalized = url.startsWith('http') ? url : `https://${url}`

		setRefreshing(true)
		try {
			const { favicon: f } = await fetchMeta(normalized, true)
			const color = await extractEdgeColor(f, true)

			setFavicon(f)
			setAutoColor(color)
			if (colorMode === 'auto') {
				setBgColor(color)
			}
			setFaviconCachedAt(Date.now())

			if (editBookmark) {
				const id = editBookmark.id
				useStore.setState((s) => ({
					bookmarks: {
						...s.bookmarks,
						[id]: {
							...s.bookmarks[id],
							favicon: f,
							bgColor: colorMode === 'auto' ? color : bgColor,
							faviconCachedAt: Date.now(),
						}
					}
				}))
				persist()
			}
		} catch (err) {
			alert('Не удалось обновить иконку. Проверьте доступность сайта.')
			console.error('Favicon refresh failed:', err)
		} finally {
			setRefreshing(false)
		}
	}

	const handleSave = () => {
		if (!url || !title) return

		const normalized = url.startsWith('http') ? url : `https://${url}`
		const id = editBookmark?.id ?? uuid()
		const bookmark = {
			id, url: normalized, title, favicon,
			bgColor, bgColorMode: colorMode,
			createdAt: editBookmark?.createdAt ?? Date.now(),
			faviconCachedAt: faviconCachedAt ?? Date.now(),
		}

		const saved = useStore.getState()

		if (!editBookmark && sectionId === 'favorites' && saved.favorites.length >= saved.favoritesSlots) {
			alert(`Панель избранного заполнена (${saved.favoritesSlots}/${saved.favoritesSlots})`)
			return
		}

		useStore.setState((s) => {
			const newBookmarks = { ...s.bookmarks, [id]: bookmark }
			let newUnsectioned = [...s.unsectioned]
			let newFavorites = [...s.favorites]
			let newSections = s.sections.map(sec => ({ ...sec, bookmarkIds: [...sec.bookmarkIds] }))

			if (!editBookmark) {
				if (sectionId === 'favorites') {
					newFavorites = [...newFavorites, id]
				} else if (sectionId === 'unsectioned') {
					newUnsectioned = [...newUnsectioned, id]
				} else {
					newSections = newSections.map(sec =>
						sec.id === sectionId
							? { ...sec, bookmarkIds: [...sec.bookmarkIds, id] }
							: sec
					)
				}
			}

			return {
				bookmarks: newBookmarks,
				unsectioned: newUnsectioned,
				sections: newSections,
				favorites: newFavorites,
			}
		})

		persist()
		onClose()
	}

	const handleOverlayClick = () => {
		if (url || title) {
			if (confirm('Закрыть без сохранения?')) onClose()
		} else {
			onClose()
		}
	}

	return (
		<div className={styles.overlay} onClick={handleOverlayClick}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.title}>
					{editBookmark ? 'Редактировать закладку' : 'Добавить закладку'}
				</div>

				<div className={styles.field}>
					<label>URL</label>
					<input
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						placeholder="https://..."
					/>
					{loading && <span className={styles.loadingString}>Загрузка...</span>}
				</div>

				<div className={styles.field}>
					<label>Название</label>
					<input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="Введите название"
					/>
				</div>

				{favicon && (
					<>
						<div className={styles.preview}>
							<img src={favicon} alt="" />
							<div className={styles.colorDot} style={{ background: bgColor }} />
								<div className={styles.colorModes}>
								{COLOR_MODES.map(mode => (
									<button
										key={mode}
										className={colorMode === mode ? styles.active : ''}
										onClick={() => handleColorMode(mode)}
									>
										{mode}
									</button>
								))}
							</div>
						</div>
						{faviconCachedAt && (
							<div className={styles.cacheInfo}>
								<span className={styles.cacheText}>обновлено {formatDaysAgo(faviconCachedAt)}</span>
								<button
									className={styles.refreshBtn}
									onClick={handleRefreshFavicon}
									disabled={refreshing}
									title="Обновить"
								>
									{refreshing ? '⏳' : '🔄'}
								</button>
							</div>
						)}
					</>
				)}

				<div className={styles.field}>
					<label>Favicon (URL)</label>
					<input
						value={favicon}
						onChange={e => setFavicon(e.target.value)}
						placeholder="https://example.com/favicon.ico"
					/>
				</div>

				{!editBookmark && (
					<div className={styles.field}>
						<label>Раздел</label>
						<select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
							<option value="favorites" disabled={favorites.length >= favoritesSlots}>
								Избранное
							</option>
							<option value="unsectioned">Без раздела</option>
							{sections.map(sec => (
								<option key={sec.id} value={sec.id}>{sec.title}</option>
							))}
						</select>
					</div>
				)}

				<div className={styles.actions}>
					<button className={styles.btnSecondary} onClick={onClose}>Отмена</button>
					<button className={styles.btnPrimary} onClick={handleSave}>Сохранить</button>
				</div>
			</div>
		</div>
	)
}