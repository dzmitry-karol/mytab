import { useState } from 'react'
import styles from './Section.module.scss'
import BookmarkCard from '../BookmarkCard/BookmarkCard'
import useStore from '../../store/useStore'
import ConfirmModal from '../ConfirmModal/ConfirmModal'
import AddBookmarkCard from '../AddBookmarkCard/AddBookmarkCard'
import AddBookmarkModal from '../AddBookmarkModal/AddBookmarkModal'
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

export default function Section({ section }) {
	const { bookmarks, persist } = useStore()
	const [editing, setEditing] = useState(false)
	const [titleVal, setTitleVal] = useState(section.title)
	const [confirmOpen, setConfirmOpen] = useState(false)
	const [showAddBookmark, setShowAddBookmark] = useState(false)

	const { setNodeRef: setDropRef } = useDroppable({ id: section.id })

	const {
		attributes,
		listeners,
		setNodeRef: setDragRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: `section:${section.id}` })

  	const cards = section.bookmarkIds.map(id => bookmarks[id]).filter(Boolean)

	const handleRename = () => {
		if (!titleVal.trim()) return

		useStore.setState(s => ({
			sections: s.sections.map(sec =>
				sec.id === section.id ? { ...sec, title: titleVal } : sec
			)
		}))

		persist()
		setEditing(false)
	}

	const handleDelete = (e) => {
		setConfirmOpen(true)
	}

	const doDeleteWithBookmarks = () => {
		useStore.setState(s => ({
			sections: s.sections.filter(sec => sec.id !== section.id),
			bookmarks: Object.fromEntries(
				Object.entries(s.bookmarks).filter(([id]) => !section.bookmarkIds.includes(id))
			),
			unsectioned: s.unsectioned.filter(id => !section.bookmarkIds.includes(id)),
			favorites: s.favorites.filter(id => !section.bookmarkIds.includes(id)),
		}))
		persist()
	}

	const doDeleteMoveBookmarks = () => {
		useStore.setState(s => ({
			sections: s.sections.filter(sec => sec.id !== section.id),
			unsectioned: [...s.unsectioned, ...section.bookmarkIds],
		}))
		persist()
	}

  return (
		<>
			<div
				ref={setDragRef}
				className={styles.section}
				style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
			>
				<div className={styles.header} {...attributes} {...listeners}>
					{editing ? (
						<input
							className={styles.headerInput}
							value={titleVal}
							onChange={e => setTitleVal(e.target.value)}
							onBlur={handleRename}
							onKeyDown={e => e.key === 'Enter' && handleRename()}
							autoFocus
							onClick={e => e.stopPropagation()}
						/>
					) : (
						<span className={styles.headerTitle}>{section.title}</span>
					)}
					<button className={styles.iconBtn} onClick={e => { e.stopPropagation(); setEditing(true) }}>✏️</button>
					<button className={styles.iconBtn} onClick={e => { e.stopPropagation(); handleDelete() }}>🗑️</button>
				</div>

				<SortableContext items={section.bookmarkIds} strategy={rectSortingStrategy}>
					<div ref={setDropRef} className={styles.cards} style={{ minHeight: 60 }}>
						{cards.map(b => <BookmarkCard key={b.id} bookmark={b} />)}
						<div className={styles.addCard}>
							<AddBookmarkCard onClick={() => setShowAddBookmark(true)} />
						</div>
					</div>
				</SortableContext>
			</div>
			{confirmOpen && (
				<ConfirmModal
					title={`Удалить раздел "${section.title}"?`}
					actions={[
						{ label: 'Удалить с закладками', variant: 'danger', onClick: doDeleteWithBookmarks },
						{ label: 'Перенести закладки в общий поток', variant: 'default', onClick: doDeleteMoveBookmarks },
						{ label: 'Отмена', variant: 'default', onClick: () => {} },
					]}
					onClose={() => setConfirmOpen(false)}
				/>
			)}
			{showAddBookmark && (
				<AddBookmarkModal
					onClose={() => setShowAddBookmark(false)}
					defaultSectionId={section.id}
				/>
			)}
		</>
  	)
}