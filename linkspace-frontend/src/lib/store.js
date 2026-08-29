const KEY = "linkspace.v1";

const empty = () => ({
  user: null,
  sessions: [],
  clubs: [],
  records: [],
});

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    return empty();
  }
}

export function saveState(partial) {
  const next = { ...loadState(), ...partial };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function addSession(session) {
  const state = loadState();
  const sessions = [session, ...state.sessions].slice(0, 80);
  return saveState({ sessions });
}

export function joinClub(slug) {
  const state = loadState();
  if (state.clubs.includes(slug)) return state;
  return saveState({ clubs: [...state.clubs, slug] });
}

export function setUser(user) {
  return saveState({ user });
}

export function addRecord(record) {
  const state = loadState();
  return saveState({ records: [record, ...state.records].slice(0, 60) });
}

export function statsFrom(state = loadState()) {
  const sessions = state.sessions ?? [];
  const avg =
    sessions.length === 0
      ? 0
      : Math.round(
          sessions.reduce((sum, item) => sum + (item.score || 0), 0) /
            sessions.length,
        );
  const minutes = Math.round(
    sessions.reduce((sum, item) => sum + (item.durationSeconds || 0), 0) / 60,
  );
  const streak = computeStreak(sessions);
  return { count: sessions.length, avg, minutes, streak };
}

function computeStreak(sessions) {
  const days = new Set(
    sessions.map((item) => new Date(item.endedAt).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
