import { NavLink } from 'react-router-dom'
import foodiesLogo from '../assets/foodies logo.png'

function HouseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M11.25 15.75V9.75C11.25 9.55109 11.171 9.36032 11.0303 9.21967C10.8897 9.07902 10.6989 9 10.5 9H7.5C7.30109 9 7.11032 9.07902 6.96967 9.21967C6.82902 9.36032 6.75 9.55109 6.75 9.75V15.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.25 7.49998C2.24995 7.28178 2.2975 7.06619 2.38934 6.86826C2.48118 6.67033 2.6151 6.49482 2.78175 6.35398L8.03175 1.85473C8.30249 1.62591 8.64552 1.50037 9 1.50037C9.35448 1.50037 9.69751 1.62591 9.96825 1.85473L15.2183 6.35398C15.3849 6.49482 15.5188 6.67033 15.6107 6.86826C15.7025 7.06619 15.7501 7.28178 15.75 7.49998V14.25C15.75 14.6478 15.592 15.0293 15.3107 15.3106C15.0294 15.5919 14.6478 15.75 14.25 15.75H3.75C3.35218 15.75 2.97064 15.5919 2.68934 15.3106C2.40804 15.0293 2.25 14.6478 2.25 14.25V7.49998Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CogwheelIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10.1833 1.66667H9.81667C9.37464 1.66667 8.95072 1.84227 8.63816 2.15483C8.3256 2.46739 8.15 2.89131 8.15 3.33334V3.48334C8.1497 3.77561 8.07255 4.06266 7.92628 4.3157C7.78002 4.56874 7.56978 4.77887 7.31667 4.92501L6.95834 5.13334C6.70497 5.27962 6.41756 5.35663 6.125 5.35663C5.83244 5.35663 5.54503 5.27962 5.29167 5.13334L5.16667 5.06667C4.78422 4.84606 4.32987 4.78621 3.90334 4.90026C3.47681 5.01432 3.11296 5.29295 2.89167 5.67501L2.70833 5.99167C2.48772 6.37412 2.42787 6.82847 2.54192 7.255C2.65598 7.68153 2.93461 8.04538 3.31667 8.26667L3.44167 8.35001C3.69356 8.49543 3.90302 8.70425 4.04921 8.9557C4.1954 9.20715 4.27325 9.49248 4.275 9.78334V10.2083C4.27617 10.502 4.19971 10.7908 4.05337 11.0454C3.90703 11.3001 3.69601 11.5115 3.44167 11.6583L3.31667 11.7333C2.93461 11.9546 2.65598 12.3185 2.54192 12.745C2.42787 13.1715 2.48772 13.6259 2.70833 14.0083L2.89167 14.325C3.11296 14.7071 3.47681 14.9857 3.90334 15.0997C4.32987 15.2138 4.78422 15.154 5.16667 14.9333L5.29167 14.8667C5.54503 14.7204 5.83244 14.6434 6.125 14.6434C6.41756 14.6434 6.70497 14.7204 6.95834 14.8667L7.31667 15.075C7.56978 15.2211 7.78002 15.4313 7.92628 15.6843C8.07255 15.9373 8.1497 16.2244 8.15 16.5167V16.6667C8.15 17.1087 8.3256 17.5326 8.63816 17.8452C8.95072 18.1577 9.37464 18.3333 9.81667 18.3333H10.1833C10.6254 18.3333 11.0493 18.1577 11.3618 17.8452C11.6744 17.5326 11.85 17.1087 11.85 16.6667V16.5167C11.8503 16.2244 11.9275 15.9373 12.0737 15.6843C12.22 15.4313 12.4302 15.2211 12.6833 15.075L13.0417 14.8667C13.295 14.7204 13.5824 14.6434 13.875 14.6434C14.1676 14.6434 14.455 14.7204 14.7083 14.8667L14.8333 14.9333C15.2158 15.154 15.6701 15.2138 16.0967 15.0997C16.5232 14.9857 16.887 14.7071 17.1083 14.325L17.2917 14C17.5123 13.6176 17.5721 13.1632 17.4581 12.7367C17.344 12.3101 17.0654 11.9463 16.6833 11.725L16.5583 11.6583C16.304 11.5115 16.093 11.3001 15.9466 11.0454C15.8003 10.7908 15.7238 10.502 15.725 10.2083V9.79167C15.7238 9.49799 15.8003 9.20921 15.9466 8.95458C16.093 8.69995 16.304 8.48851 16.5583 8.34167L16.6833 8.26667C17.0654 8.04538 17.344 7.68153 17.4581 7.255C17.5721 6.82847 17.5123 6.37412 17.2917 5.99167L17.1083 5.67501C16.887 5.29295 16.5232 5.01432 16.0967 4.90026C15.6701 4.78621 15.2158 4.84606 14.8333 5.06667L14.7083 5.13334C14.455 5.27962 14.1676 5.35663 13.875 5.35663C13.5824 5.35663 13.295 5.27962 13.0417 5.13334L12.6833 4.92501C12.4302 4.77887 12.22 4.56874 12.0737 4.3157C11.9275 4.06266 11.8503 3.77561 11.85 3.48334V3.33334C11.85 2.89131 11.6744 2.46739 11.3618 2.15483C11.0493 1.84227 10.6254 1.66667 10.1833 1.66667Z"
        stroke="currentColor"
        strokeWidth="1.99964"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z"
        stroke="currentColor"
        strokeWidth="1.99964"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FriendsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M12 15.75V14.25C12 13.4544 11.6839 12.6913 11.1213 12.1287C10.5587 11.5661 9.79565 11.25 9 11.25H4.5C3.70435 11.25 2.94129 11.5661 2.37868 12.1287C1.81607 12.6913 1.5 13.4544 1.5 14.25V15.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 2.34599C12.6433 2.51277 13.213 2.88844 13.6198 3.41404C14.0265 3.93964 14.2471 4.58541 14.2471 5.24999C14.2471 5.91458 14.0265 6.56035 13.6198 7.08595C13.213 7.61155 12.6433 7.98722 12 8.15399"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 15.75V14.25C16.4995 13.5853 16.2783 12.9396 15.871 12.4142C15.4638 11.8889 14.8936 11.5137 14.25 11.3475"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.75 8.25C8.40685 8.25 9.75 6.90685 9.75 5.25C9.75 3.59315 8.40685 2.25 6.75 2.25C5.09315 2.25 3.75 3.59315 3.75 5.25C3.75 6.90685 5.09315 8.25 6.75 8.25Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ProfileIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M14.25 15.75V14.25C14.25 13.4544 13.9339 12.6913 13.3713 12.1287C12.8087 11.5661 12.0456 11.25 11.25 11.25H6.75C5.95435 11.25 5.19129 11.5661 4.62868 12.1287C4.06607 12.6913 3.75 13.4544 3.75 14.25V15.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 8.25C10.6569 8.25 12 6.90685 12 5.25C12 3.59315 10.6569 2.25 9 2.25C7.34315 2.25 6 3.59315 6 5.25C6 6.90685 7.34315 8.25 9 8.25Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LogoutIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M13.3333 14.1666L17.4999 9.99998L13.3333 5.83331"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.5 10H7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', Icon: HouseIcon },
  { to: '/party-settings', label: 'Party Settings', Icon: CogwheelIcon },
  { to: '/friends', label: 'Friends', Icon: FriendsIcon },
  { to: '/profile', label: 'Profile', Icon: ProfileIcon },
]

export default function DesktopNavbar({ onLogout }) {
  return (
    <header className="app-navbar">
      <div className="app-navbar__brand">
        <img src={foodiesLogo} alt="Foodies" className="app-navbar__logo" />
        <span className="app-navbar__brand-text">FOODIES</span>
      </div>

      <nav className="app-navbar__links" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              `app-navbar__link${isActive ? ' app-navbar__link--active' : ''}`
            }
          >
            <item.Icon className="app-navbar__icon" />
            <span className="app-navbar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="app-navbar__logout"
        onClick={onLogout}
        aria-label="Log out"
      >
        <LogoutIcon className="app-navbar__logout-icon" />
      </button>
    </header>
  )
}
