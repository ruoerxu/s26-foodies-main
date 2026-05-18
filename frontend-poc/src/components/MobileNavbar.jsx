import { NavLink } from 'react-router-dom'
import homeMobile from '../assets/houseMobile.svg'
import cogwheelMobile from '../assets/cogwheelMobile.svg'
import friendsMobile from '../assets/FriendsMobile.svg'
import profileMobile from '../assets/ProfileMobile.svg'

const navItems = [
  { to: '/dashboard', label: 'Home', icon: homeMobile },
  { to: '/party-settings', label: 'Parties', icon: cogwheelMobile },
  { to: '/friends', label: 'Friends', icon: friendsMobile },
  { to: '/profile', label: 'Profile', icon: profileMobile },
]

export default function MobileNavbar() {
  return (
    <nav className="mobile-navbar" aria-label="Mobile navigation">
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          className={({ isActive }) =>
            `mobile-navbar__link${isActive ? ' mobile-navbar__link--active' : ''}`
          }
        >
          <img src={item.icon} alt="" aria-hidden="true" className="mobile-navbar__icon" />
          <span className="mobile-navbar__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
