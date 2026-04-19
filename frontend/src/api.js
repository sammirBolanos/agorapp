const JWT_KEY = "agora_jwt";
const FRONTEND_ONLY_MODE = true;
const MOCK_TOKEN = "mock-token";

const MOCK_PQRSD_ITEMS = [
  {
    id: "PQRSD-2026-0001",
    tituloIa: "Solicitud de acompañamiento para formalización de emprendimiento",
    createdAt: "2026-04-14T10:30:00.000Z",
    tipo: "Información",
    resumenBullets: [
      "La persona solicita orientación sobre rutas de formalización empresarial.",
      "Solicita detalle de requisitos y canales de atención disponibles.",
      "Pide priorizar respuesta por inicio de actividades en el próximo mes.",
    ],
    dependenciaSugerida: "Unidad de Emprendimiento y Desarrollo Empresarial",
    ciudadano: {
      nombre: "Ana Lucía Gómez",
      documento: "CC 43.123.456",
      email: "ana.gomez@email.com",
      telefono: "3001234567",
    },
    documentoPaginas: 4,
    borradorRespuesta:
      "Apreciada ciudadana, recibimos su solicitud y compartimos la ruta recomendada para formalización de su emprendimiento, junto con requisitos, tiempos y canales de acompañamiento.",
  },
  {
    id: "PQRSD-2026-0002",
    tituloIa: "Queja por demoras en respuesta a convocatoria de formación",
    createdAt: "2026-04-09T15:45:00.000Z",
    tipo: "Quejas",
    resumenBullets: [
      "El ciudadano reporta demora superior al plazo informado inicialmente.",
      "Indica falta de actualización sobre estado de su postulación.",
      "Solicita revisión del proceso y respuesta formal por escrito.",
    ],
    dependenciaSugerida: "Dirección de Formación y Empleo",
    ciudadano: {
      nombre: "Carlos Andrés Ramírez",
      documento: "CC 1.021.334.221",
      email: "c.ramirez@email.com",
      telefono: "3114567890",
    },
    documentoPaginas: 3,
    borradorRespuesta:
      "Estimado ciudadano, ofrecemos disculpas por la demora reportada. Se validó su caso y se priorizará respuesta definitiva dentro del término legal aplicable.",
  },
  {
    id: "PQRSD-2026-0003",
    tituloIa: "Consulta sobre incentivos para economía popular",
    createdAt: "2026-04-02T08:00:00.000Z",
    tipo: "Consultas",
    resumenBullets: [
      "Se consulta por programas vigentes de incentivos y fortalecimiento.",
      "Solicita claridad sobre criterios de elegibilidad y cronograma.",
      "Pide información de talleres de acompañamiento técnico.",
    ],
    dependenciaSugerida: "Subsecretaría de Economía Popular",
    ciudadano: {
      nombre: "María Fernanda Torres",
      documento: "CC 52.987.654",
      email: "maria.torres@email.com",
      telefono: "3209876543",
    },
    documentoPaginas: 5,
    borradorRespuesta:
      "Cordial saludo, a continuación se relacionan los incentivos disponibles para economía popular, sus requisitos de postulación y los canales oficiales de inscripción.",
  },
];

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
  if (FRONTEND_ONLY_MODE) {
    return { token: MOCK_TOKEN };
  }

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
  if (FRONTEND_ONLY_MODE) {
    if (!token) throw new Error("Sesión inválida");
    return { username: "demo" };
  }

  const res = await fetch("/api/secure/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Sesión inválida");
  return readJson(res);
}

export async function fetchPqrsds(token) {
  if (FRONTEND_ONLY_MODE) {
    if (!token) {
      const err = new Error("Sesión expirada");
      err.code = "UNAUTHORIZED";
      throw err;
    }
    return MOCK_PQRSD_ITEMS;
  }

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
