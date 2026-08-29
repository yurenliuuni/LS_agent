import { Link, useParams } from "react-router-dom";
import { PROGRAMS } from "../data/programs.js";
import PoseSession from "../components/PoseSession.jsx";

export default function Train() {
  const { slug } = useParams();
  const selected = PROGRAMS.find((item) => item.slug === slug);

  if (!selected) {
    return (
      <main className="panel">
        <div className="panel-head">
          <h2>選擇今天要練的動作</h2>
          <p>建議一次做完五個，約 15 分鐘。</p>
        </div>
        <div className="program-grid">
          {PROGRAMS.map((item) => (
            <Link key={item.slug} className="program-card" to={`/train/${item.slug}`}>
              <span className="mins">{item.minutes} min</span>
              <h3>{item.title}</h3>
              <p>{item.english}</p>
            </Link>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main>
      <p className="crumb">
        <Link to="/train">課程</Link> / {selected.title}
      </p>
      <PoseSession
        slug={selected.slug}
        title={`${selected.title} · ${selected.english}`}
        cue={selected.cue}
        youtubeId={selected.youtubeId}
      />
      <ul className="error-list">
        {selected.errors.map((item) => (
          <li key={item}>常見錯誤：{item}</li>
        ))}
      </ul>
    </main>
  );
}
