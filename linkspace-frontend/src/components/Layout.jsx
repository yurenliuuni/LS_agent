import { NavLink, Outlet } from "react-router-dom";
import { loadState, statsFrom } from "../lib/store.js";

export default function Layout() {
  const state = loadState();
  const stats = statsFrom(state);
  const name = state.user?.displayName || state.user?.username || "訪客";

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">雲</span>
          LinkSpace
        </NavLink>
        <nav className="nav">
          <NavLink to="/train">課程</NavLink>
          <NavLink to="/studio">跟練</NavLink>
          <NavLink to="/progress">紀錄</NavLink>
          <NavLink to="/club">俱樂部</NavLink>
        </nav>
        <NavLink to="/account" className="user-chip">
          {name}
          <small>{stats.streak} 日連續</small>
        </NavLink>
      </header>
      <Outlet />
    </div>
  );
}
