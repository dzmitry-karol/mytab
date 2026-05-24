import { useState } from 'react'
import ConfirmModal from '../ConfirmModal/ConfirmModal'
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import styles from './FavoritesBar.module.scss'
import useStore from '../../store/useStore'

function FavSlot({ id }) {
	const { bookmarks, persist } = useStore()
	const bookmark = bookmarks[id]
	const [confirmOpen, setConfirmOpen] = useState(false)

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `fav:${id}`,
	})

	return (
		<>
			<a
				ref={setNodeRef}
				href={bookmark?.url}
				className={styles.slot}
				title={bookmark?.title}
				style={{
					'--bg-color': bookmark?.bgColor || '#1a1a1a',
					transform: CSS.Transform.toString(transform),
					transition,
					opacity: isDragging ? 0.3 : 1,
				}}
				{...attributes}
				{...listeners}
			>
				<img className={styles.favicon} src={bookmark?.favicon} alt="" onError={e => e.target.style.display = 'none'} />
				<button className={styles.removeBtn} onClick={e => { e.preventDefault(); setConfirmOpen(true) }}>×</button>
			</a>
			{confirmOpen && (
				<ConfirmModal
					title="Убрать из избранного?"
					message={`"${bookmark?.title}" будет удалена из панели избранного`}
					actions={[
						{ label: 'Удалить', variant: 'danger', onClick: () => {
							useStore.setState(s => ({ favorites: s.favorites.filter(fid => fid !== id) }))
							persist()
						}},
						{ label: 'Отмена', variant: 'default', onClick: () => {} },
					]}
					onClose={() => setConfirmOpen(false)}
				/>
			)}
		</>
	)
}

function AddFavoriteSlot({ onClick }) {
	const { setNodeRef, isOver } = useDroppable({ id: 'fav-add' })

	return (
		<button
			ref={setNodeRef}
			type="button"
			className={`${styles.slot} ${styles.addSlot} ${isOver ? styles.slotOver : ''}`}
			onClick={onClick}
			title="Добавить закладку в избранное"
		>
			+
		</button>
	)
}

function EmptySlot({ index }) {
	const { setNodeRef, isOver } = useDroppable({ id: `fav-empty-${index}` })

	return (
		<div
			ref={setNodeRef}
			className={`${styles.slot} ${styles.slotEmpty} ${isOver ? styles.slotOver : ''}`}
		/>
	)
}

export default function FavoritesBar({ onAddFavorite }) {
	const { favorites, favoritesSlots } = useStore()
	const { setNodeRef } = useDroppable({ id: 'favorites-bar' })

	const hasFreeSlot = favorites.length < favoritesSlots
	const emptySlots = Math.max(favoritesSlots - favorites.length - (hasFreeSlot ? 1 : 0), 0)

	return (
		<div ref={setNodeRef} className={styles.barSpace}>
			<div className={styles.barWrapper}>
				<div className={styles.bar}>
					<SortableContext
						items={favorites.map(id => `fav:${id}`)}
						strategy={horizontalListSortingStrategy}
					>
						{favorites.map(id => <FavSlot key={id} id={id} />)}
					</SortableContext>

					{hasFreeSlot && <AddFavoriteSlot onClick={onAddFavorite} />}

					{Array.from({ length: emptySlots }).map((_, i) => (
						<EmptySlot key={i} index={i} />
					))}
				</div>
			</div>
		</div>
	)
}