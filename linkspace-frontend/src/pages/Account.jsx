import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadState, setUser } from "../lib/store.js";

export default function Account() {
  const existing = loadState().user;
  const [displayName, setDisplayName] = useState(existing?.displayName || "");
  const navigate = useNavigate();

  const save = (event) => {
    event.preventDefault();
    const name = displayName.trim() || "訪客";
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
        <h2>你的稱呼</h2>
        <p>先不用註冊。這個名字會顯示在頂欄與俱樂部。</p>
      </div>
      <form className="url-form" onSubmit={save}>
        <label htmlFor="name">顯示名稱</label>
        <div className="input-row">
          <input
            id="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="例如：阿明"
          />
          <button className="btn" type="submit">
            儲存
          </button>
        </div>
      </form>
    </main>
  );
}
