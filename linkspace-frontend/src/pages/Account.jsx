import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../lib/i18n.jsx";
import { loadState, setUser } from "../lib/store.js";

export default function Account() {
  const { t } = useI18n();
  const existing = loadState().user;
  const [displayName, setDisplayName] = useState(existing?.displayName || "");
  const navigate = useNavigate();

  const save = (event) => {
    event.preventDefault();
    const name = displayName.trim() || t("account.guest");
    setUser({
      id: existing?.id || crypto.randomUUID(),
      username: name,
      displayName: name,
    });
    navigate("/progress");
  };

  return (
    <main className="panel">
      <div className="panel-head">
        <h2>{t("account.title")}</h2>
        <p>{t("account.lede")}</p>
      </div>
      <form className="url-form" onSubmit={save}>
        <label htmlFor="name">{t("account.label")}</label>
        <div className="input-row">
          <input
            id="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={t("account.placeholder")}
          />
          <button className="btn" type="submit">
            {t("account.save")}
          </button>
        </div>
      </form>
    </main>
  );
}
