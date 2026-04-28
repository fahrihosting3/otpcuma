const GITHUB_API = "https://api.github.com";
const REPO = process.env.GITHUB_REPO!;
const TOKEN = process.env.GITHUB_TOKEN!;
const BRANCH = process.env.GITHUB_BRANCH || "main";

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
  Accept: "application/vnd.github+json",
};

// Ambil file (return null kalau belum ada)
export async function getFile(path: string) {
  const res = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}?ref=${BRANCH}`, { headers });
  if (res.status === 404) return null;
  
  if (!res.ok) {
    const text = await res.text();
    console.error(`GitHub API error (${res.status}): ${text}`);
    throw new Error(`GitHub API error: ${res.status}`);
  }
  
  const text = await res.text();
  if (!text) {
    throw new Error("GitHub API returned empty response");
  }
  
  const data = JSON.parse(text);
  return {
    content: JSON.parse(Buffer.from(data.content, "base64").toString("utf-8")),
    sha: data.sha,
  };
}

// Tulis/update file
export async function writeFile(path: string, data: object, sha?: string) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
  const res = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `update: ${path}`,
      content,
      branch: BRANCH,
      ...(sha && { sha }), // sha wajib kalau update file existing
    }),
  });
  
  const text = await res.text();
  if (!text) {
    throw new Error("GitHub API returned empty response");
  }
  
  if (!res.ok) {
    console.error(`GitHub API write error (${res.status}): ${text}`);
    throw new Error(`GitHub API write error: ${res.status}`);
  }
  
  return JSON.parse(text);
}
