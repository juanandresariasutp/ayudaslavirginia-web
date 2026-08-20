import { LogoMark } from './LogoMark'

interface HeaderProps {
  menuOpen: boolean
  toggleMenu: () => void
}

export function Header({ menuOpen, toggleMenu }: HeaderProps) {
  return (
    <header className="page-header">
      <div className="brand-line">
        <LogoMark />
        <div>
          <h1>Ayudas La Virginia</h1>
          <p>Juntos nos levantamos</p>
        </div>
      </div>
      <button
        className="menu-toggle"
        aria-label="Abrir menú"
        aria-expanded={menuOpen}
        aria-controls="main-sidebar"
        onClick={toggleMenu}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </header>
  )
}
