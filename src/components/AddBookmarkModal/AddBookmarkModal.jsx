import { useState, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import styles from './AddBookmarkModal.module.scss'
import { fetchMeta } from '../../utils/metaFetcher'
import { extractEdgeColor, contrastColor } from '../../utils/colorExtractor'
import useStore from '../../store/useStore'
import { useDebounce } from '../../utils/useDebounce'

const COLOR_MODES = ['auto', 'contrast', 'white', 'black']

export default function AddBookmarkModal({ onClose, editBookmark = null, defaultSectionId = 'unsectioned' }) {
	const { bookmarks, sections, unsectioned, favorites, persist } = useStore()

	const [url, setUrl] = useState(editBookmark?.url ?? '')
	const [title, setTitle] = useState(editBookmark?.title ?? '')
	const [favicon, setFavicon] = useState(editBookmark?.favicon ?? '')
	const [bgColor, setBgColor] = useState(editBookmark?.bgColor ?? '#1e1e1e')
	const [autoColor, setAutoColor] = useState(editBookmark?.bgColor ?? '#1e1e1e')
	const [colorMode, setColorMode] = useState(editBookmark?.bgColorMode ?? 'auto')
	const [sectionId, setSectionId] = useState(defaultSectionId)
	const [loading, setLoading] = useState(false)

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

	const handleSave = () => {
		if (!url || !title) return

		const normalized = url.startsWith('http') ? url : `https://${url}`
		const id = editBookmark?.id ?? uuid()
		const bookmark = {
			id, url: normalized, title, favicon,
			bgColor, bgColorMode: colorMode,
			createdAt: editBookmark?.createdAt ?? Date.now(),
		}

		useStore.setState((s) => {
			const newBookmarks = { ...s.bookmarks, [id]: bookmark }
			let newUnsectioned = [...s.unsectioned]
			let newSections = s.sections.map(sec => ({ ...sec, bookmarkIds: [...sec.bookmarkIds] }))

			if (!editBookmark) {
				if (sectionId === 'unsectioned') {
					newUnsectioned = [...newUnsectioned, id]
				} else {
					newSections = newSections.map(sec =>
						sec.id === sectionId
							? { ...sec, bookmarkIds: [...sec.bookmarkIds, id] }
							: sec
					)
				}
			}

			return { bookmarks: newBookmarks, unsectioned: newUnsectioned, sections: newSections }
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