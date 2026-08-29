import { useI18n } from "../lib/i18n.jsx";
import openPalm from "../assets/gestures/open_palm_icon.svg";
import thumbUp from "../assets/gestures/thumbup_icon.svg";
import victory from "../assets/gestures/victory_icon.svg";
import thumbDown from "../assets/gestures/thumbdown_icon.svg";

export const GESTURE_ITEMS = [
  { id: "pause", name: "guide.pauseName", how: "guide.pauseHow", src: openPalm },
  { id: "play", name: "guide.playName", how: "guide.playHow", src: thumbUp },
  { id: "switch", name: "guide.switchName", how: "guide.switchHow", src: victory },
  { id: "rewind", name: "guide.rewindName", how: "guide.rewindHow", src: thumbDown },
];

export default function GestureCards() {
  const { t } = useI18n();
  return (
    <div className="gesture-grid">
      {GESTURE_ITEMS.map((item) => (
        <article key={item.id} className="gesture-card">
          <span className="gesture-icon">
            <img src={item.src} alt="" />
          </span>
          <h3>{t(item.name)}</h3>
          <p>{t(item.how)}</p>
        </article>
      ))}
    </div>
  );
}
