const BASE = import.meta.env.VITE_FUNCTIONS_BASE?.replace(/\/$/, "");
const CODE = import.meta.env.VITE_FUNCTION_CODE
  ? `?code=${import.meta.env.VITE_FUNCTION_CODE}`
  : "";

function url(path, withCode = true) {
  const suffix = withCode && CODE ? CODE : "";
  return `${BASE}${path}${suffix}`;
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export async function createUser({ pseudo, email }) {
  const res = await fetch(url("/api/postUser"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pseudo, email }),
  });
  if (!res.ok)
    throw new Error(`postUser ${res.status}: ${await safeText(res)}`);
  const data = await res.json();
  const id = data?.id ?? data?.user_id ?? data?.userId;
  if (!id) throw new Error("Réponse inattendue (id manquant)");
  return id;
}

export async function createVote({ user_id, result }) {
  const res = await fetch(url("/api/postVote"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, result }),
  });
  if (!res.ok)
    throw new Error(`postVote ${res.status}: ${await safeText(res)}`);
  return res.json();
}

export async function fetchVotes() {
  const res = await fetch(url("/api/getVotes", false), { method: "GET" });
  if (!res.ok)
    throw new Error(`getVotes ${res.status}: ${await safeText(res)}`);
  return res.json(); // [{id,user_id,result,createdAt},...]
}

export async function fetchUsers() {
  const res = await fetch(
    `${import.meta.env.VITE_FUNCTIONS_BASE}/api/getUsers`
  );
  if (!res.ok) throw new Error(`getUsers ${res.status}`);
  return res.json(); // [{id,pseudo,email,createdAt}, ...]
}
