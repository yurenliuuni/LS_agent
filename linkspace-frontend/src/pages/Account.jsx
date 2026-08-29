import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadState, setUser } from "../lib/store.js";

export default function Account() {
  const existing = loadState().user;
  const [displayName, setDisplayName] = useState(existing?.displayName || "");
  const navigate = useNavigate();

  const save = (event) => {
    event.preventDefault();
    const name = displayName.trim() || "Guest";
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
        <h2>Your name</h2>
        <p>No account required. This is only stored on this device.</p>
      </div>
      <form className="url-form" onSubmit={save}>
        <label htmlFor="name">Display name</label>
        <div className="input-row">
          <input
            id="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your name"
          />
          <button className="btn" type="submit">
            Save
          </button>
        </div>
      </form>
    </main>
  );
}
