import { useState } from 'react'
import styles from './AddSectionRow.module.scss'
import AddSectionModal from '../AddSectionModal/AddSectionModal'

export default function AddSectionRow() {
	const [show, setShow] = useState(false)

	return (
		<>
			<div className={styles.row} onClick={() => setShow(true)}>
				<span className={styles.plus}>+</span>
				<span className={styles.label}>Новый раздел</span>
			</div>
			{show && <AddSectionModal onClose={() => setShow(false)} />}
		</>
	)
}