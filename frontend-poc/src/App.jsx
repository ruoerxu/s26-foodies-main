import { HashRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import "./App.css";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import PartySettingsPage from "./pages/PartySettingsPage";
import UsersPage from "./pages/UsersPage";
import AboutPage from "./pages/AboutPage";
import LandingPage from "./pages/LandingPage";
import SignupPage from "./pages/SignupPage";
import EmailConfirmationPage from "./pages/EmailConfirmationPage";
import CreatePartyPage from "./pages/CreateParty/CreatePartyPage";
import FriendsPage from "./pages/FriendsPage";
import AddFriendPage from "./pages/AddFriendPage";
import FriendRequestsPage from "./pages/FriendRequestsPage";
import SessionPrefsPage from "./pages/SessionPrefsPage";
import SessionLocationPage from "./pages/SessionLocationPage";
import FinalizedPage from "./pages/FinalizedPage";
import CompareTastePage from "./pages/CompareTastePage";

function NavLayout({ children }) {
  return (
    <div className="poc-layout">
      <nav className="poc-nav">
        <Link to="/users">Users</Link>
        <Link to="/about">About</Link>
      </nav>
      {children}
    </div>
  );
}

function RequireAuth({ children }) {
  return localStorage.getItem("isLoggedIn") ? (
    children
  ) : (
    <Navigate to="/login" replace />
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<Navigate to="/" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/friends"
        element={
          <RequireAuth>
            <FriendsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/add-friend"
        element={
          <RequireAuth>
            <AddFriendPage />
          </RequireAuth>
        }
      />
      <Route
        path="/view-friend-requests"
        element={
          <RequireAuth>
            <FriendRequestsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/create-party"
        element={
          <RequireAuth>
            <CreatePartyPage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile/:friendId"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/compare/:friendId"
        element={
          <RequireAuth>
            <CompareTastePage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile/settings"
        element={
          <RequireAuth>
            <ProfileSettingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile/settings/*"
        element={
          <RequireAuth>
            <ProfileSettingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/party-settings"
        element={
          <RequireAuth>
            <PartySettingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/users"
        element={
          <NavLayout>
            <UsersPage />
          </NavLayout>
        }
      />
      <Route
        path="/about"
        element={
          <NavLayout>
            <AboutPage />
          </NavLayout>
        }
      />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/email-confirmation" element={<EmailConfirmationPage />} />
      <Route path="/create-party" element={<RequireAuth><CreatePartyPage /></RequireAuth>} />
      <Route path="/friends" element={<RequireAuth><FriendsPage /></RequireAuth>} />
      <Route path="/friends/add" element={<RequireAuth><AddFriendPage /></RequireAuth>} />
      <Route path="/friends/requests" element={<RequireAuth><FriendRequestsPage /></RequireAuth>} />
      <Route
        path="/session-preferences"
        element={
          <RequireAuth>
            <SessionPrefsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/session-location"
        element={
          <RequireAuth>
            <SessionLocationPage />
          </RequireAuth>
        }
      />
      <Route
        path="/finalized"
        element={
          <RequireAuth>
            <FinalizedPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function AppWithRouter() {
  return (
    <HashRouter>
      <App />
    </HashRouter>
  );
}
