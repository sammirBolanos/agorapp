const JWT_KEY = "agora_jwt";

const jsonHeaders = { "Content-Type": "application/json" };

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function getStoredToken() {
  return sessionStorage.getItem(JWT_KEY);
}

export function setStoredToken(token) {
  sessionStorage.setItem(JWT_KEY, token);
}

export function clearStoredToken() {
  sessionStorage.removeItem(JWT_KEY);
}

function isNetworkFailure(err) {
  if (!err) return false;
  if (err instanceof TypeError) return true;
  const msg = String(err.message ?? err);
  return /failed to fetch|networkerror|load failed|econnrefused/i.test(msg);
}

export async function login(username, password) {
  let res;
  try {
    res = await fetch("/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ username, password }),
    });
  } catch (err) {
    if (isNetworkFailure(err)) {
      throw new Error(
        "No hay servidor en el puerto 8080. Abre otra terminal, ve a la carpeta demo y ejecuta: sh mvnw spring-boot:run"
      );
    }
    throw err;
  }
  const body = await readJson(res);
  if (!res.ok) {
    const msg =
      body?.error === "invalid_credentials"
        ? "Usuario o contraseña incorrectos."
        : "No se pudo iniciar sesión.";
    throw new Error(msg);
  }
  return body;
}

export async function fetchMe(token) {
  const res = await fetch("/api/secure/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Sesión inválida");
  return readJson(res);
}

export async function fetchPqrsds(token) {
  const res = await fetch("/api/pqrsds", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    const err = new Error("Sesión expirada");
    err.code = "UNAUTHORIZED";
    throw err;
  }
  if (!res.ok) throw new Error("No se pudo cargar el listado.");
  return res.json();
}

export function normalizePqrsdItem(raw) {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
  };
}
