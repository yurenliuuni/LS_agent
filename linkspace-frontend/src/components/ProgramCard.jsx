import { Link } from "react-router-dom";
import { videoTitle } from "../lib/i18n.jsx";

export default function ProgramCard({ item, lang }) {
  return (
    <Link className="program-card" to={`/train/${item.slug}`}>
      <span className="mins">{item.minutes} min</span>
      <h3>{videoTitle(item, lang)}</h3>
    </Link>
  );
}
