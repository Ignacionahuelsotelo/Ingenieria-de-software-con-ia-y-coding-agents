import { NavLink, Route, Routes } from 'react-router-dom'
import Reservar from './pages/Reservar/Reservar.tsx'
import MiTurno from './pages/MiTurno/MiTurno.tsx'
import AgendaView from './pages/Agenda/AgendaView.tsx'

function Header() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `ledger-hours text-sm uppercase tracking-widest px-3 py-1 border-b-2 ${
      isActive ? 'border-stamp text-stamp' : 'border-transparent text-ink-soft hover:text-ink'
    }`

  return (
    <header className="border-b-2 border-ink px-6 py-4 flex items-baseline justify-between">
      <span className="font-serif-ledger text-2xl" style={{ fontFamily: 'var(--font-serif-ledger)' }}>
        Libreta de turnos
      </span>
      <nav className="flex gap-2">
        <NavLink to="/" end className={linkClass}>
          Reservar
        </NavLink>
        <NavLink to="/mi-turno" className={linkClass}>
          Mi turno
        </NavLink>
        <NavLink to="/agenda" className={linkClass}>
          Agenda
        </NavLink>
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Reservar />} />
          <Route path="/mi-turno" element={<MiTurno />} />
          <Route path="/agenda" element={<AgendaView />} />
        </Routes>
      </main>
    </div>
  )
}
