import styles from './AddBookmarkCard.module.scss'

export default function AddBookmarkCard({ onClick }) {
	return (
		<div className={styles.card} onClick={onClick}>
			<span className={styles.plus}>+</span>
		</div>
	)
}