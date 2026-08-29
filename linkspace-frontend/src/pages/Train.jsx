import { Link, useParams } from "react-router-dom";
import Trainer from "../components/Trainer.jsx";
import { CATEGORIES, findProgram } from "../data/programs.js";

export default function Train() {
  const { slug } = useParams();
  const selected = slug ? findProgram(slug) : null;

  if (!selected) {
    return (
      <main>
        <section className="panel">
          <div className="panel-head">
            <h2>Pamela Reif</h2>
            <p>Workouts grouped by type. Open one to split the screen with your mirror.</p>
          </div>
        </section>
        {CATEGORIES.map((category) => (
          <section className="panel" key={category.slug}>
            <div className="panel-head">
              <h2>{category.name}</h2>
            </div>
            <div className="program-grid">
              {category.videos.map((item) => (
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

  return (
    <main className="wide">
      <p className="crumb">
        <Link to="/train">Train</Link> / {selected.title}
      </p>
      <Trainer
        slug={selected.slug}
        title={selected.title}
        youtubeId={selected.youtubeId}
        defaultLayout={selected.defaultLayout}
      />
    </main>
  );
}
