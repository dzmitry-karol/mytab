import styles from '../AddBookmarkModal/AddBookmarkModal.module.scss'
import confirmStyles from './ConfirmModal.module.scss'

export default function ConfirmModal({ title, message, actions, onClose }) {
	return (
		<div className={styles.overlay} onClick={onClose}>
			<div className={styles.modal} onClick={e => e.stopPropagation()}>
				<div className={styles.title}>
					{title}
				</div>
				{message && 
					<p className={confirmStyles.message}>
						{message}
					</p>
				}
				<div className={styles.actions}>
					{actions.map((action, i) => (
						<button
							key={i}
							className={action.variant === 'danger' ? styles.btnDanger : styles.btnSecondary}
							onClick={() => { action.onClick(); onClose() }}
						>
							{action.label}
						</button>
					))}
				</div>
			</div>
		</div>
	)
}