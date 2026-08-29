import { useI18n } from "../lib/i18n.jsx";

export const GESTURE_ITEMS = [
  { id: "pause", name: "guide.pauseName", how: "guide.pauseHow", icon: "palm" },
  { id: "play", name: "guide.playName", how: "guide.playHow", icon: "up" },
  { id: "switch", name: "guide.switchName", how: "guide.switchHow", icon: "peace" },
  { id: "rewind", name: "guide.rewindName", how: "guide.rewindHow", icon: "down" },
];

function Icon({ kind }) {
  if (kind === "palm") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M22 36V16a4 4 0 0 1 8 0v14M30 32V14a4 4 0 0 1 8 0v16M38 31V18a4 4 0 0 1 8 0v16M46 34V22a4 4 0 0 1 7 3c0 4-1 8-4 14-3 7-8 11-15 11h-6c-8 0-14-6-14-14v-8a4 4 0 0 1 8 0v6"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "up") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M28 28V14a5 5 0 0 1 10 0v20"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M38 32c2-1 6 0 8 4 2 4 1 10-3 14-4 5-10 6-16 6h-3c-6 0-12-5-12-12v-8a4 4 0 0 1 8 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "peace") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M26 30V12a4 4 0 0 1 8 0v16M38 28V12a4 4 0 1 1 8 0v20"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M46 34c1 3 0 8-3 12-4 6-10 8-16 8h-4c-7 0-13-6-13-13v-7a4 4 0 0 1 8 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M28 36v14a5 5 0 0 0 10 0V30"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M38 32c2 1 6 0 8-4 2-4 1-10-3-14-4-5-10-6-16-6h-3c-6 0-12 5-12 12v8a4 4 0 0 0 8 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function GestureCards() {
  const { t } = useI18n();
  return (
    <div className="gesture-grid">
      {GESTURE_ITEMS.map((item) => (
        <article key={item.id} className="gesture-card">
          <span className="gesture-icon">
            <Icon kind={item.icon} />
          </span>
          <h3>{t(item.name)}</h3>
          <p>{t(item.how)}</p>
        </article>
      ))}
    </div>
  );
}
