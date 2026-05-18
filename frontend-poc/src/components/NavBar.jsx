import DesktopNavbar from './DesktopNavbar'
import MobileNavbar from './MobileNavbar'

export default function NavBar({ onLogout, useMobile = false }) {
  if (useMobile) {
    return <MobileNavbar />
  }

  return (
    <>
      <div className="navbar-desktop">
        <DesktopNavbar onLogout={onLogout} />
      </div>
      <div className="navbar-mobile">
        <MobileNavbar />
      </div>
    </>
  )
}
