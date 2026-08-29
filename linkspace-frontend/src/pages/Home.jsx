import { Link } from "react-router-dom";
import logo from "../assets/logo.svg";
import { CATEGORIES } from "../data/programs.js";
import { loadState, statsFrom } from "../lib/store.js";

export default function Home() {
  const stats = statsFrom(loadState());

  return (
    <main>
      <section className="hero">
        <img src={logo} alt="linksparks" className="hero-logo" />
        <p className="eyebrow">linksparks</p>
        <h1>
          Train with Pamela.
          <em> Mirror on one side, coach on the other.</em>
        </h1>
        <p className="lede">
          Standing workouts split left and right. Mat workouts stack coach on
          top and your camera below. Gestures pause, play, and switch the layout.
        </p>
        <div className="cta-row">
          <Link className="btn" to="/train">
            Browse Pamela workouts
          </Link>
          <Link className="btn ghost" to="/studio">
            Paste a YouTube link
          </Link>
        </div>
        <ul className="stat-row">
          <li>
            <b>{stats.count}</b>
            <span>sessions</span>
          </li>
          <li>
            <b>{stats.minutes}</b>
            <span>minutes</span>
          </li>
        </ul>
      </section>

      {CATEGORIES.map((category) => (
        <section className="panel" key={category.slug}>
          <div className="panel-head">
            <h2>{category.name}</h2>
            <p>
              Default layout: {category.defaultLayout === "standing" ? "standing" : "mat"}
            </p>
          </div>
          <div className="program-grid">
            {category.videos.slice(0, 4).map((item) => (
              <Link key={item.slug} className="program-card" to={`/train/${item.slug}`}>
                <span className="mins">{item.minutes} min</span>
                <h3>{item.title}</h3>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
