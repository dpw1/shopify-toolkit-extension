import { createRoot } from 'react-dom/client'
import 'flag-icons/css/flag-icons.min.css'
import './styles/globals.css'
import App from './App'

const root = document.getElementById('root')!
// No <StrictMode>: it double-mounts effects in dev and duplicates extension work
// (e.g. two catalog syncs). The popup is not a long-lived SPA where that trade-off helps.
createRoot(root).render(<App />)
