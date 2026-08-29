import { NavLink, Outlet } from "react-router-dom";
import logo from "../assets/logo.svg";
import { loadState, statsFrom } from "../lib/store.js";

export default function Layout() {
  const state = loadState();
  const stats = statsFrom(state);
  const name = state.user?.displayName || state.user?.username || "Guest";

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <img src={logo} alt="" className="brand-logo" />
          linksparks
        </NavLink>
        <nav className="nav">
          <NavLink to="/train">Train</NavLink>
          <NavLink to="/studio">Paste a link</NavLink>
          <NavLink to="/progress">History</NavLink>
          <NavLink to="/club">Clubs</NavLink>
        </nav>
        <NavLink to="/account" className="user-chip">
          {name}
          <small>{stats.streak} day streak</small>
        </NavLink>
      </header>
      <Outlet />
    </div>
  );
}
