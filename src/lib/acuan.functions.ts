import { createServerFn } from "@tanstack/react-start";
import type { ReferenceData } from "./reference";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/github";
const REPO = "validator-acuan";
const PATH = "acuan.json";

async function gh(path: string, init: RequestInit = {}) {
  const lk = process.env.LOVABLE_API_KEY;
  const gk = process.env.GITHUB_API_KEY;
  if (!lk || !gk) throw new Error("Koneksi GitHub belum dikonfigurasi");
  return fetch(`${GATEWAY_URL}/${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${lk}`,
      "X-Connection-Api-Key": gk,
    },
  });
}

async function fail(res: Response): Promise<never> {
  const body = await res.text();
  console.error(`GitHub request failed [${res.status}]: ${body}`);
  throw new Error(`GitHub gagal [${res.status}]: ${body.slice(0, 200)}`);
}

async function owner(): Promise<string> {
  const res = await gh("user");
  if (!res.ok) await fail(res);
  return ((await res.json()) as { login: string }).login;
}

async function ensureRepo(login: string) {
  const res = await gh(`repos/${login}/${REPO}`);
  if (res.ok) return;
  if (res.status !== 404) await fail(res);
  const c = await gh("user/repos", {
    method: "POST",
    body: JSON.stringify({ name: REPO, private: true, auto_init: true, description: "Data acuan Validator Dokumen" }),
  });
  if (!c.ok) await fail(c);
}

const b64encode = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
const b64decode = (s: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

async function readFile(login: string) {
  const res = await gh(`repos/${login}/${REPO}/contents/${PATH}`);
  if (res.status === 404) return null;
  if (!res.ok) await fail(res);
  const j = (await res.json()) as { content: string; sha: string };
  return { sha: j.sha, data: JSON.parse(b64decode(j.content)) as ReferenceData };
}

export const loadAcuanRemote = createServerFn({ method: "GET" }).handler(async () => {
  const login = await owner();
  const res = await gh(`repos/${login}/${REPO}`);
  if (res.status === 404) return { data: null as ReferenceData | null, repo: `${login}/${REPO}` };
  if (!res.ok) await fail(res);
  const f = await readFile(login);
  return { data: f?.data ?? null, repo: `${login}/${REPO}` };
});

export const saveAcuanRemote = createServerFn({ method: "POST" })
  .inputValidator((d: ReferenceData) => {
    if (!d || !Array.isArray(d.jenisDokumen)) throw new Error("Data acuan tidak valid");
    return d;
  })
  .handler(async ({ data }) => {
    const login = await owner();
    await ensureRepo(login);
    const existing = await readFile(login);
    const res = await gh(`repos/${login}/${REPO}/contents/${PATH}`, {
      method: "PUT",
      body: JSON.stringify({
        message: `Perbarui data acuan ${new Date().toISOString()}`,
        content: b64encode(JSON.stringify(data, null, 2)),
        ...(existing ? { sha: existing.sha } : {}),
      }),
    });
    if (!res.ok) await fail(res);
    return { repo: `${login}/${REPO}` };
  });
