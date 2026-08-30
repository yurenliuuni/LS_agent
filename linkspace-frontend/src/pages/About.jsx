import { ABOUT_LINKS, copy } from "../lib/copy.js";
import { useI18n } from "../lib/i18n.jsx";

const TOKENS = ["rain", "pamela", "github"];

function LinkedCopy({ text, t }) {
  const parts = text.split(/(\{(?:rain|pamela|github)\})/g);
  return parts.map((part, index) => {
    const token = TOKENS.find((name) => part === `{${name}}`);
    if (!token) return part;
    return (
      <a key={`${token}-${index}`} href={ABOUT_LINKS[token]} target="_blank" rel="noreferrer">
        {t(`about.${token}`)}
      </a>
    );
  });
}

export default function About() {
  const { t, lang } = useI18n();
  const paragraphs = ["p1", "p2", "p3"]
    .map((key) => copy[lang]?.about?.[key] ?? copy.en.about[key])
    .filter(Boolean);

  return (
    <main className="panel">
      <div className="panel-head">
        <h2>{t("about.title")}</h2>
      </div>
      <div className="about-copy">
        {paragraphs.map((text, index) => (
          <p key={index}>
            <LinkedCopy text={text} t={t} />
          </p>
        ))}
      </div>
    </main>
  );
}
