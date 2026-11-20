import { NavLink, Route, Routes } from 'react-router-dom'
import { Detail } from './pages/Detail'
import { NewRequest } from './pages/NewRequest'
import { Queue } from './pages/Queue'

export default function App() {
  return (
    <div className="shell">
      <header>
        <span className="brand">Change Desk</span>
        <nav aria-label="Main">
          <NavLink to="/" end>Queue</NavLink>
          <NavLink to="/new">New request</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Queue />} />
          <Route path="/new" element={<NewRequest />} />
          <Route path="/requests/:id" element={<Detail />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
      <footer>Personal project built with Claude Code from a written spec. Demo data and requests are saved in your browser only. Business hours are Monday to Friday, 9 to 17.</footer>
    </div>
  )
}
