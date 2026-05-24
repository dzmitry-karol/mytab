import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import styles from '../AddBookmarkModal/AddBookmarkModal.module.scss'
import useStore from '../../store/useStore'

export default function AddSectionModal({ onClose }) {
	const { persist } = useStore()
	const [title, setTitle] = useState('')

	const handleCreate = () => {
		if (!title.trim()) return
		useStore.setState(s => ({
			sections: [...s.sections, { id: uuid(), title, bookmarkIds: [] }]
		}))
		persist()
		onClose()
	}

	return (
		<div className={styles.overlay} onClick={onClose}>
			<div className={styles.modal} onClick={e => e.stopPropagation()}>
				<div className={styles.title}>Новый раздел</div>
				<div className={styles.field}>
					<label>Название</label>
					<input
						value={title}
						onChange={e => setTitle(e.target.value)}
						onKeyDown={e => e.key === 'Enter' && handleCreate()}
						placeholder="Название раздела"
						autoFocus
					/>
				</div>

				<div className={styles.actions}>
					<button className={styles.btnSecondary} onClick={onClose}>Отмена</button>
					<button className={styles.btnPrimary} onClick={handleCreate}>Создать</button>
				</div>
			</div>
		</div>
	)
}