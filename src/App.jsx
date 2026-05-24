import {
	DndContext,
	DragOverlay,
	PointerSensor,
	closestCenter,
	pointerWithin,
	rectIntersection,
	useDroppable,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import { useState } from 'react'
import useStore from './store/useStore'
import BookmarkCard from './components/BookmarkCard/BookmarkCard'
import Section from './components/Section/Section'
import AddBookmarkModal from './components/AddBookmarkModal/AddBookmarkModal'
import AddSectionModal from './components/AddSectionModal/AddSectionModal'
import FavoritesBar from './components/FavoritesBar/FavoritesBar'
import SettingsPanel from './components/SettingsPanel/SettingsPanel'
import AddBookmarkCard from './components/AddBookmarkCard/AddBookmarkCard'
import AddSectionRow from './components/AddSectionRow/AddSectionRow'
import {
	SortableContext,
	arrayMove,
	rectSortingStrategy,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import styles from './App.module.scss'

const toId = (id) => String(id ?? '')
const isFavoriteDragId = (id) => toId(id).startsWith('fav:')
const isSectionDragId = (id) => toId(id).startsWith('section:')
const realBookmarkId = (id) => toId(id).replace(/^fav:/, '')
const isFavoriteDropId = (id) => {
	const value = toId(id)
	return value === 'favorites-bar'
		|| value === 'fav-add'
		|| value.startsWith('fav:')
		|| value.startsWith('fav-empty-')
}

const getRectCenter = (rect) => {
	if (!rect) return null

	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2,
	}
}

const shouldInsertAfter = (activeRect, overRect) => {
	const activeCenter = getRectCenter(activeRect)
	const overCenter = getRectCenter(overRect)

	if (!activeCenter || !overCenter) return false

	const rowThreshold = Math.min(activeRect.height, overRect.height) / 2
	const isSameVisualRow = Math.abs(activeCenter.y - overCenter.y) <= rowThreshold

	if (isSameVisualRow) return activeCenter.x > overCenter.x

	return activeCenter.y > overCenter.y
}

const getTranslatedRect = (active) => active?.rect?.current?.translated
	|| active?.rect?.current?.initial
	|| null

const filterDroppableContainers = (args, predicate) => ({
	...args,
	droppableContainers: args.droppableContainers.filter(container => predicate(container.id)),
})

const arraysEqual = (a, b) => (
  	a.length === b.length && a.every((item, index) => item === b[index])
)

const sectionsEqual = (a, b) => (
	a.length === b.length
	&& a.every((section, index) => (
		section.id === b[index]?.id
		&& section.title === b[index]?.title
		&& arraysEqual(section.bookmarkIds, b[index]?.bookmarkIds ?? [])
	))
)

const normalContainersEqual = (state, next) => (
	arraysEqual(state.unsectioned, next.unsectioned) && sectionsEqual(state.sections, next.sections)
)

export default function App() {
	const { sections, unsectioned, bookmarks, favoritesSlots, persist } = useStore()
	const [showBookmark, setShowBookmark] = useState(false)
	const [bookmarkDefaultSectionId, setBookmarkDefaultSectionId] = useState('unsectioned')
	const [showSection, setShowSection] = useState(false)
	const [activeId, setActiveId] = useState(null)
	const [showSettings, setShowSettings] = useState(false)
	const [isOverFavorites, setIsOverFavorites] = useState(false)

	const sensors = useSensors(useSensor(PointerSensor, {
		activationConstraint: { distance: 8 },
	}))

	const openBookmarkModal = (defaultSectionId = 'unsectioned') => {
		setBookmarkDefaultSectionId(defaultSectionId)
		setShowBookmark(true)
	}

	const getNormalBookmarkIds = (state = useStore.getState()) => new Set([
		...state.unsectioned,
		...state.sections.flatMap(sec => sec.bookmarkIds),
	])

	const findContainer = (id, state = useStore.getState()) => {
		const value = toId(id)

		if (value === 'unsectioned') return 'unsectioned'
		if (state.unsectioned.includes(value)) return 'unsectioned'

		const section = state.sections.find(sec => (
			sec.id === value || sec.bookmarkIds.includes(value)
		))

		return section?.id ?? null
	}

	const isContainerId = (id, state = useStore.getState()) => {
		const value = toId(id)
		return value === 'unsectioned' || state.sections.some(sec => sec.id === value)
	}

	const collisionDetection = (args) => {
		const activeValue = toId(args.active.id)
		const activeRealId = realBookmarkId(activeValue)
		const state = useStore.getState()

		if (isSectionDragId(activeValue)) {
			const sectionCollisions = closestCenter(filterDroppableContainers(
				args,
				id => toId(id).startsWith('section:'),
			))

			return sectionCollisions.length > 0 ? sectionCollisions : closestCenter(args)
		}

		const rectCollisions = rectIntersection(args)
		const pointerCollisions = pointerWithin(args)

		const favoriteCollisions = rectCollisions.filter(({ id }) => isFavoriteDropId(id))
		if (favoriteCollisions.length > 0) return favoriteCollisions

		const normalBookmarkIds = getNormalBookmarkIds(state)
		const bookmarkCollisions = rectCollisions.filter(({ id }) => {
			const value = toId(id)
			return value !== activeValue && value !== activeRealId && normalBookmarkIds.has(value)
		})

		if (bookmarkCollisions.length > 0) return bookmarkCollisions

		const containerCollisions = rectCollisions.filter(({ id }) => isContainerId(id, state))
		if (containerCollisions.length > 0) return containerCollisions

		const pointerFavoriteCollisions = pointerCollisions.filter(({ id }) => isFavoriteDropId(id))
		if (pointerFavoriteCollisions.length > 0) return pointerFavoriteCollisions

		const pointerBookmarkCollisions = pointerCollisions.filter(({ id }) => {
			const value = toId(id)
			return value !== activeValue && value !== activeRealId && normalBookmarkIds.has(value)
		})

		if (pointerBookmarkCollisions.length > 0) return pointerBookmarkCollisions

		return pointerCollisions.length > 0 ? pointerCollisions : rectCollisions
	}

	const getFavoriteInsertIndex = (favorites, overId, dropMeta = null, movingId = null) => {
		const overValue = toId(overId)
		const movingValue = movingId ? realBookmarkId(movingId) : null
		const list = movingValue ? favorites.filter(id => id !== movingValue) : favorites

		if (overValue.startsWith('fav:')) {
			const overRealId = realBookmarkId(overValue)
			const index = list.indexOf(overRealId)
			if (index === -1) return list.length

			const afterOffset = shouldInsertAfter(dropMeta?.activeRect, dropMeta?.overRect) ? 1 : 0
			return index + afterOffset
		}

		return list.length
	}

	const getContainerInsertIndex = (ids, overId, containerId, dropMeta = null) => {
		const overValue = toId(overId)

		if (!overValue || overValue === containerId || isContainerId(overValue)) {
			return ids.length
		}

		const index = ids.indexOf(overValue)
		if (index === -1) return ids.length

		const afterOffset = shouldInsertAfter(dropMeta?.activeRect, dropMeta?.overRect) ? 1 : 0
		return index + afterOffset
	}

	const insertIntoContainer = (state, bookmarkId, toContainer, overId, dropMeta = null) => {
		let newUnsectioned = state.unsectioned.filter(id => id !== bookmarkId)
		let newSections = state.sections.map(sec => ({
			...sec,
			bookmarkIds: sec.bookmarkIds.filter(id => id !== bookmarkId),
		}))

		if (toContainer === 'unsectioned') {
			const insertIndex = getContainerInsertIndex(newUnsectioned, overId, toContainer, dropMeta)
			newUnsectioned.splice(insertIndex, 0, bookmarkId)
		} else {
			newSections = newSections.map(sec => {
				if (sec.id !== toContainer) return sec

				const bookmarkIds = [...sec.bookmarkIds]
				const insertIndex = getContainerInsertIndex(bookmarkIds, overId, toContainer, dropMeta)
				bookmarkIds.splice(insertIndex, 0, bookmarkId)

				return { ...sec, bookmarkIds }
			})
		}

		return { unsectioned: newUnsectioned, sections: newSections }
	}

	const moveNormalBookmarkToContainer = (bookmarkId, toContainer, overId, dropMeta = null) => {
		useStore.setState(state => {
			const isInNormalContainer = state.unsectioned.includes(bookmarkId)
				|| state.sections.some(sec => sec.bookmarkIds.includes(bookmarkId))

			if (!isInNormalContainer) return state

			const next = insertIntoContainer(state, bookmarkId, toContainer, overId, dropMeta)
			if (normalContainersEqual(state, next)) return state

			return next
		})
	}

	const moveNormalBookmarkToFavorites = (bookmarkId, overId, dropMeta = null) => {
		const state = useStore.getState()

		if (state.favorites.includes(bookmarkId)) return false

		if (state.favorites.length >= state.favoritesSlots) {
			alert(`Избранное заполнено (${state.favoritesSlots}/${state.favoritesSlots})`)
			return false
		}

		useStore.setState(s => {
			const favorites = [...s.favorites]
			const insertIndex = getFavoriteInsertIndex(favorites, overId, dropMeta)
			favorites.splice(insertIndex, 0, bookmarkId)

			return {
				favorites,
				unsectioned: s.unsectioned.filter(id => id !== bookmarkId),
				sections: s.sections.map(sec => ({
					...sec,
					bookmarkIds: sec.bookmarkIds.filter(id => id !== bookmarkId),
				})),
			}
		})

		return true
	}

	const moveFavoriteToContainer = (favoriteId, toContainer, overId, dropMeta = null) => {
		const bookmarkId = realBookmarkId(favoriteId)

		useStore.setState(state => {
			if (!state.favorites.includes(bookmarkId)) return state

			const next = insertIntoContainer(state, bookmarkId, toContainer, overId, dropMeta)

			return {
				favorites: state.favorites.filter(id => id !== bookmarkId),
				...next,
			}
		})
	}

	const reorderFavorite = (favoriteId, overId, dropMeta = null) => {
		const bookmarkId = realBookmarkId(favoriteId)

		useStore.setState(state => {
			const fromIndex = state.favorites.indexOf(bookmarkId)
			if (fromIndex === -1) return state

			const targetIndex = getFavoriteInsertIndex(state.favorites, overId, dropMeta, bookmarkId)
			const list = state.favorites.filter(id => id !== bookmarkId)
			const safeIndex = Math.max(0, Math.min(targetIndex, list.length))
			list.splice(safeIndex, 0, bookmarkId)

			if (arraysEqual(state.favorites, list)) return state
			return { favorites: list }
		})
	}

	const reorderSection = (activeSectionId, overSectionId) => {
		useStore.setState(state => {
			const fromIndex = state.sections.findIndex(sec => `section:${sec.id}` === activeSectionId)
			const toIndex = state.sections.findIndex(sec => `section:${sec.id}` === overSectionId)

			if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return state

			return { sections: arrayMove(state.sections, fromIndex, toIndex) }
		})
	}

	const getDropMeta = (active, over) => ({
		activeRect: getTranslatedRect(active),
		overRect: over?.rect ?? null,
	})

	const handleDragStart = ({ active }) => {
		setActiveId(active.id)
		setIsOverFavorites(isFavoriteDragId(active.id))
	}

	const handleDragOver = ({ over }) => {
		const overFavorites = over ? isFavoriteDropId(over.id) : false
		setIsOverFavorites(overFavorites)
	}

	const handleDragEnd = ({ active, over }) => {
		setIsOverFavorites(false)
		setActiveId(null)

		if (!over) {
			persist()
			return
		}

		const activeValue = toId(active.id)
		const overValue = toId(over.id)
		const dropMeta = getDropMeta(active, over)

		if (isSectionDragId(activeValue)) {
			reorderSection(activeValue, overValue)
			persist()
			return
		}

		if (isFavoriteDragId(activeValue)) {
			if (isFavoriteDropId(overValue)) {
				reorderFavorite(activeValue, overValue, dropMeta)
				persist()
				return
			}

			const toContainer = findContainer(overValue)
			if (toContainer) {
				moveFavoriteToContainer(activeValue, toContainer, overValue, dropMeta)
				persist()
			}

			return
		}

		if (isFavoriteDropId(overValue)) {
			if (moveNormalBookmarkToFavorites(activeValue, overValue, dropMeta)) {
				persist()
			}
			return
		}

		if (activeValue === overValue) {
			persist()
			return
		}

		const toContainer = findContainer(overValue)
		if (!toContainer) {
			persist()
			return
		}

		moveNormalBookmarkToContainer(activeValue, toContainer, overValue, dropMeta)
		persist()
	}

	const activeBookmark = activeId
		? bookmarks[activeId] || bookmarks[realBookmarkId(activeId)]
		: null

  	return (
		<DndContext
			sensors={sensors}
			collisionDetection={collisionDetection}
			onDragStart={handleDragStart}
			onDragOver={handleDragOver}
			onDragEnd={handleDragEnd}
		>
			<div className={styles.wrapper}>
				<FavoritesBar onAddFavorite={() => openBookmarkModal('favorites')} />

				<button className={styles.burger} onClick={() => setShowSettings(true)}>☰</button>

				<div className={styles.content}>
					<SortableContext
						items={sections.map(sec => `section:${sec.id}`)}
						strategy={verticalListSortingStrategy}
					>
						{sections.map(sec => (
							<Section key={sec.id} section={sec} />
						))}
					</SortableContext>

					<SortableContext items={unsectioned} strategy={rectSortingStrategy}>
						<UnsectionedArea onAddBookmark={() => openBookmarkModal('unsectioned')}>
							{unsectioned.map(id => bookmarks[id] && (
								<BookmarkCard key={id} bookmark={bookmarks[id]} />
							))}
						</UnsectionedArea>
					</SortableContext>

					<AddSectionRow />
				</div>

				<DragOverlay>
					{activeBookmark && (
						isOverFavorites
							? (
								<div
									style={{
										width: 54,
										height: 54,
										borderRadius: 12,
										background: activeBookmark.bgColor || '#1a1a1a',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										opacity: 0.9,
									}}
								>
									<img src={activeBookmark.favicon} style={{ width: 36, height: 36 }} alt="" />
								</div>
							)
							: <BookmarkCard bookmark={activeBookmark} isDragOverlay />
					)}
				</DragOverlay>
			</div>

			{showBookmark && (
				<AddBookmarkModal
					onClose={() => setShowBookmark(false)}
					defaultSectionId={bookmarkDefaultSectionId}
				/>
			)}
			{showSection && <AddSectionModal onClose={() => setShowSection(false)} />}
			{showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    	</DndContext>
  	)
}

function UnsectionedArea({ children, onAddBookmark }) {
	const { setNodeRef } = useDroppable({ id: 'unsectioned' })

	return (
		<div ref={setNodeRef} className={styles.unsectionedArea}>
			{children}
			<AddBookmarkCard onClick={onAddBookmark} />
		</div>
	)
}