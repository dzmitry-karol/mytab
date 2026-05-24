import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.scss'
import App from './App.jsx'
import useStore from './store/useStore'

useStore.getState().init().then(() => {
	const { tabTitle } = useStore.getState()
	document.title = tabTitle || 'New Tab'

	useStore.subscribe(state => {
		document.title = state.tabTitle || 'New Tab'
	})

	createRoot(document.getElementById('root')).render(
		<StrictMode>
			<App />
		</StrictMode>
	)
})
