const GRAPHQL_ENDPOINT = "https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql";
const SIGNIN_ENDPOINT = "https://learn.zone01oujda.ma/api/auth/signin";

const profileQuery = `
query GetProfile {
  user {
    id
    login
    email
  }
}
`;

const xpQueryForGraph = `
query GetAccurateXP {
  transaction(
    where: {
      type: { _eq: "xp" }
      _or: [
        { path: { _nlike: "%piscine%" } }
        { object: { type: { _eq: "piscine" } } }
      ]
    }
    order_by: { createdAt: asc }
  ) {
    amount
    createdAt
    object { name }
  }
}
`;

function base64Utf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

export async function graphqlFetch(query, variables) {
  const jwt = localStorage.getItem("jwt");
  if (!jwt) throw new Error("Not logged in (missing jwt).");

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} ${msg}`.trim());
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  return json.data;
}

export async function fetchProfile() {
  const data = await graphqlFetch(profileQuery);
  const user = data?.user?.[0];
  if (!user) throw new Error("Profile query returned no user.");
  return user;
}

export async function fetchXPTransactions() {
  const data = await graphqlFetch(xpQueryForGraph);
  return data?.transaction ?? [];
}

export async function signin(identifier, password) {
  const encoded = base64Utf8(`${identifier}:${password}`);

  const res = await fetch(SIGNIN_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Basic ${encoded}` },
  });

  if (!res.ok) {
    let msg = `Login failed (HTTP ${res.status})`;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const errJson = await res.json().catch(() => null);
      msg = errJson?.error || errJson?.message || msg;
    } else {
      const errText = await res.text().catch(() => "");
      if (errText) msg = errText;
    }
    throw new Error(msg);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const body = await res.json();
    if (typeof body === "string") return body;
    if (body?.jwt) return body.jwt;
    if (body?.token) return body.token;
    return JSON.stringify(body);
  }

  return await res.text();
}
