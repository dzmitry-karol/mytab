import { useRef, useState } from 'react'
import styles from './SettingsPanel.module.scss'
import useStore from '../../store/useStore'

export default function SettingsPanel({ onClose }) {
	const fileInputRef = useRef(null)
	const { bookmarks, sections, unsectioned, favorites, tabTitle, persist } = useStore()
	const [titleInput, setTitleInput] = useState(tabTitle || 'New Tab')

	const handleTitleSave = () => {
		useStore.setState({ tabTitle: titleInput })
		persist()
	}

	const handleExport = () => {
		const state = { bookmarks, sections, unsectioned, favorites, tabTitle }
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
					useStore.setState({
						bookmarks: imported.bookmarks,
						sections: imported.sections,
						unsectioned: imported.unsectioned ?? [],
						favorites: imported.favorites ?? [],
						tabTitle: imported.tabTitle ?? 'New Tab',
					})
				} else {
					useStore.setState(s => ({
						bookmarks: { ...s.bookmarks, ...imported.bookmarks },
						sections: [...s.sections, ...imported.sections],
						unsectioned: [...s.unsectioned, ...(imported.unsectioned ?? [])],
						favorites: [...new Set([...s.favorites, ...(imported.favorites ?? [])])],
						tabTitle: s.tabTitle || imported.tabTitle || 'New Tab',
					}))
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
			</div>
		</>
  	)
}