import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import styles from './BookmarkCard.module.scss'
import useStore from '../../store/useStore'
import { getTextColor } from '../../utils/colorExtractor'
import ConfirmModal from '../ConfirmModal/ConfirmModal'
import AddBookmarkModal from '../AddBookmarkModal/AddBookmarkModal'

export default function BookmarkCard({ bookmark, isDragOverlay = false }) {
	const { url, title, favicon, bgColor, id } = bookmark
	const { favorites, persist } = useStore()
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: isDragOverlay })
	const [confirmOpen, setConfirmOpen] = useState(false)
	const [editOpen, setEditOpen] = useState(false)

	const textColor = getTextColor(bgColor || '#1e1e1e')
	const isFavorite = favorites.includes(id)
	const style = {
		'--bg-color': bgColor,
		transform: isDragOverlay ? undefined : CSS.Transform.toString(transform),
		transition: isDragOverlay ? undefined : transition,
		opacity: isDragging && !isDragOverlay ? 0.3 : 1,
	}

	const toggleFavorite = (e) => {
		e.preventDefault()
		if (!isFavorite && favorites.length >= 8) {
			alert('Избранное заполнено (8/8)')
			return
		}

		useStore.setState(s => {
			if (isFavorite) {
				return {
					favorites: s.favorites.filter(fid => fid !== id),
					unsectioned: [...s.unsectioned, id]
				}
			} else {
				return {
					favorites: [...s.favorites, id],
					unsectioned: s.unsectioned.filter(bid => bid !== id),
					sections: s.sections.map(sec => ({
						...sec,
						bookmarkIds: sec.bookmarkIds.filter(bid => bid !== id)
					}))
				}
			}
		})

		persist()
	}

	const handleEdit = (e) => {
		e.preventDefault()
		setEditOpen(true)
	}
  	
  	const handleDelete = (e) => {
		e.preventDefault()
		setConfirmOpen(true)
	}

	const doDelete = () => {
		useStore.setState(s => {
			const newBookmarks = { ...s.bookmarks }
			delete newBookmarks[id]
			return {
				bookmarks: newBookmarks,
				unsectioned: s.unsectioned.filter(bid => bid !== id),
				favorites: s.favorites.filter(bid => bid !== id),
				sections: s.sections.map(sec => ({
					...sec,
					bookmarkIds: sec.bookmarkIds.filter(bid => bid !== id)
				}))
			}
		})
		persist()
	}

  return (
	<>
		<a
			ref={isDragOverlay ? undefined : setNodeRef}
			href={isDragOverlay ? undefined : url}
			className={styles.card}
			style={{ ...style, '--text-color': textColor }}
			{...(!isDragOverlay ? attributes : {})}
			{...(!isDragOverlay ? listeners : {})}
		>
			<img
				className={styles.favicon}
				src={favicon}
				alt=""
				onError={e => e.target.style.display = 'none'}
			/>
			<span className={styles.title}>{title}</span>
			{!isDragOverlay && (
				<div className={styles.overlay}>
					<button className={styles.overlayBtn} onClick={toggleFavorite} title="В избранное">
						⭐️
					</button>
					<button className={styles.overlayBtn} onClick={handleEdit} title="Редактировать">
						✏️
					</button>
					<button className={styles.overlayBtn} onClick={handleDelete} title="Удалить">
						🗑️
					</button>
				</div>
			)}
		</a>
		{confirmOpen && (
			<ConfirmModal
				title="Удалить закладку?"
				message={`"${title}" будет удалена безвозвратно`}
				actions={[
					{ label: 'Удалить', variant: 'danger', onClick: doDelete },
					{ label: 'Отмена', variant: 'default', onClick: () => {} },
				]}
				onClose={() => setConfirmOpen(false)}
			/>
		)}
		{editOpen && (
			<AddBookmarkModal
				onClose={() => setEditOpen(false)}
				editBookmark={bookmark}
			/>
		)}
	</>
  )
}