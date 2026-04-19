import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";

const ALT_ALCALDIA =
  "Logo Alcaldía de Medellín — Distrito de Ciencia, Tecnología e Innovación";

/** Días hábiles / calendario según tipo (para cálculo de vencimiento) */
const SLA_BY_TIPO = {
  Información: 10,
  Quejas: 15,
  Consultas: 30,
};

const MS_PER_DAY = 86_400_000;
const DEFAULT_REASIGNACION_OPCIONES = [
  "Subsecretaría de creación y fortalecimiento empresarial",
  "Subsecretaría de desarrollo rural",
  "Subsecretaría de turismo",
];
const SECRETARIA_FIJA = "Secretaria de desarrollo economico";
const API_URL = import.meta.env.VITE_API_URL || "https://notificationagorapp-1.onrender.com";
const PENDIENTES_ENDPOINT_URL = `${API_URL}/qprs/por-secretaria`;
const DETALLE_ENDPOINT_BASE_URL = `${API_URL}/qprs`;
const SECRETARIAS_ENDPOINT_URL = `${API_URL}/secretarias`;
const ACTUALIZAR_SECRETARIA_ENDPOINT_URL = `${API_URL}/qprs/actualizar-secretaria`;
const RESOLVER_PQRS_ENDPOINT_BASE_URL = `${API_URL}/qprs`;

function addCalendarDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysUntilDeadline(createdAt, tipo) {
  const sla = SLA_BY_TIPO[tipo] ?? 10;
  const deadline = addCalendarDays(createdAt, sla);
  const today = startOfDay(new Date());
  const end = startOfDay(deadline);
  return Math.ceil((end - today) / MS_PER_DAY);
}

function getDiasTranscurridos(createdAt) {
  const today = startOfDay(new Date());
  const start = startOfDay(createdAt);
  const diff = Math.floor((today - start) / MS_PER_DAY);
  return Math.max(0, diff);
}

function formatDate(d) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function normalizePqrsFromApi(raw, idx) {
  const createdAtValue =
    raw?.createdAt ??
    raw?.fechaCreacion ??
    raw?.fechaUtc ??
    raw?.fechatutc ??
    raw?.fechaRegistro ??
    new Date();
  const createdAt = new Date(createdAtValue);

  const resumenFuente =
    raw?.resumen ?? raw?.resumenIA ?? raw?.resumenIa ?? raw?.pqrs ?? "";

  const borradorFuente =
    raw?.borradorRespuesta ??
    raw?.respuestaSugerida ??
    raw?.irrespuesta ??
    raw?.respuesta ??
    "";

  const peticionOriginalFuente =
    raw?.peticionOriginal ?? raw?.descripcion ?? raw?.pqrs ?? "Sin petición original disponible";

  const tipoFuente = String(raw?.tipo ?? raw?.clasificacion ?? "Información").trim();
  const tipoNormalizado = tipoFuente
    ? `${tipoFuente.charAt(0).toUpperCase()}${tipoFuente.slice(1).toLowerCase()}`
    : "Información";

  return {
    id: raw?.id ?? raw?.radicado ?? `PQR-API-${idx + 1}`,
    tituloIa:
      raw?.tituloIa ??
      raw?.tituloIA ??
      raw?.titulo ??
      raw?.asunto ??
      "Petición recibida",
    tipo: tipoNormalizado,
    createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
    ciudadano: {
      nombre:
        raw?.ciudadano?.nombre ??
        raw?.nombreCiudadano ??
        raw?.nombre ??
        raw?.implicado ??
        "Sin nombre",
      documento:
        raw?.ciudadano?.documento ??
        raw?.documentoCiudadano ??
        raw?.username ??
        raw?.documento ??
        "Sin documento",
      email: raw?.ciudadano?.email ?? raw?.correoCiudadano ?? raw?.email ?? "",
      telefono: raw?.ciudadano?.telefono ?? raw?.telefonoCiudadano ?? raw?.telefono ?? "",
    },
    dependenciaSugerida:
      raw?.dependenciaSugerida ?? raw?.dependencia ?? raw?.secretaria ?? "Sin dependencia",
    resumenBullets: Array.isArray(raw?.resumenBullets)
      ? raw.resumenBullets
      : [resumenFuente || "Sin resumen disponible"],
    peticionOriginal: peticionOriginalFuente,
    borradorRespuesta: borradorFuente,
    documentoPaginas:
      raw?.documentoPaginas ?? raw?.paginasDocumento ?? 1,
    reasignado: Boolean(raw?.reasignado),
    resuelto: Boolean(raw?.resuelto),
    resueltoAt: raw?.resueltoAt ? new Date(raw.resueltoAt) : undefined,
  };
}

async function fetchPendientesPorSecretaria() {
  if (PENDIENTES_ENDPOINT_URL.includes("REEMPLAZAR_ENDPOINT")) {
    return buildMockPqrsds();
  }

  const url = new URL(PENDIENTES_ENDPOINT_URL);
  url.searchParams.set("secretaria", SECRETARIA_FIJA);
  const res = await fetch(url.toString(), { method: "GET" });

  if (!res.ok) {
    throw new Error("No fue posible cargar las PQRs pendientes.");
  }

  const body = await res.json();
  const list = Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.items)
        ? body.items
        : [];

  return list.map(normalizePqrsFromApi);
}

async function fetchDetallePqrsById(id) {
  if (!id) {
    return null;
  }

  const detalleUrl = `${DETALLE_ENDPOINT_BASE_URL}/${encodeURIComponent(id)}`;
  const res = await fetch(detalleUrl, { method: "GET" });

  if (!res.ok) {
    throw new Error("No fue posible cargar el detalle de la petición.");
  }

  const body = await res.json();
  const payload = body?.data ?? body?.item ?? body;
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return normalizePqrsFromApi(payload, 0);
}

async function fetchSecretarias() {
  const res = await fetch(SECRETARIAS_ENDPOINT_URL, { method: "GET" });
  if (!res.ok) {
    throw new Error("No fue posible cargar las secretarías.");
  }

  const body = await res.json();
  const list = Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.items)
        ? body.items
        : [];

  const names = list
    .map((item) => {
      if (typeof item === "string") return item.trim();
      return String(
        item?.nombreDependencia ??
          item?.nombre ??
          item?.secretaria ??
          item?.name ??
          ""
      ).trim();
    })
    .filter(Boolean);

  return [...new Set(names)];
}

async function actualizarSecretariaPqrs(numeroPeticion, secretaria) {
  if (!numeroPeticion || !secretaria) {
    throw new Error("Faltan datos para reasignar la petición.");
  }

  const payload = {
    numeroPeticion,
    radicado: numeroPeticion,
    secretaria,
  };

  const res = await fetch(ACTUALIZAR_SECRETARIA_ENDPOINT_URL, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("No fue posible actualizar la secretaría de la petición.");
  }
}

async function resolverPqrs(numeroPeticion) {
  if (!numeroPeticion) {
    throw new Error("Falta el número de petición para resolver.");
  }

  const url = `${RESOLVER_PQRS_ENDPOINT_BASE_URL}/${encodeURIComponent(numeroPeticion)}/resolver`;
  const res = await fetch(url, { method: "PATCH" });

  if (!res.ok) {
    throw new Error("No fue posible actualizar la petición como resuelta.");
  }
}

/** Mock: fechas relativas a “hoy” para que la tabla muestre alertas y plazos coherentes */
function buildMockPqrsds() {
  const now = new Date();
  return [
    {
      id: "PQR-001",
      tituloIa:
        "Solicitud de información sobre trámite de licencia de funcionamiento en comuna 10.",
      tipo: "Información",
      createdAt: addCalendarDays(now, -8),
      ciudadano: {
        nombre: "María Fernanda López",
        documento: "CC 43.521.901",
        email: "m.lopez@correo.com",
        telefono: "+57 300 555 1200",
      },
      dependenciaSugerida: "Secretaría de Desarrollo Económico",
      resumenBullets: [
        "La ciudadana solicita plazos y requisitos actualizados para licencia de funcionamiento.",
        "Menciona un local en Laureles y actividad de servicios gastronómicos.",
        "Pide orientación sobre inspección sanitaria y documentos en línea.",
      ],
      peticionOriginal: `Yo, María Fernanda López, solicito información detallada sobre el trámite de licencia de funcionamiento para un establecimiento gastronómico ubicado en Laureles (comuna 10). Agradezco indicar requisitos actualizados, costos aproximados, tiempos de respuesta y si el proceso puede hacerse en línea.

    También solicito orientación sobre la documentación sanitaria y el procedimiento de visita de inspección.`,
      borradorRespuesta: `Estimada María Fernanda,\n\nDe acuerdo con su petición, le informamos que el trámite de licencia de funcionamiento puede iniciarse a través del portal de trámites de la Alcaldía de Medellín. Los requisitos generales incluyen certificado de uso del suelo, RUT actualizado y cumplimiento de normativa sectorial.\n\nPara su caso específico en Laureles, le sugerimos agendar una orientación con la línea de atención de Desarrollo Económico.\n\nCordial saludo,\nEquipo de Atención PQRSD`,
      documentoPaginas: 7,
    },
    {
      id: "PQR-002",
      tituloIa:
        "Queja por demora en respuesta a solicitud de subsidio a mipymes.",
      tipo: "Quejas",
      createdAt: addCalendarDays(now, -5),
      ciudadano: {
        nombre: "Carlos Andrés Vélez",
        documento: "CC 71.902.334",
        email: "cavelez@empresa.co",
        telefono: "+57 604 444 8899",
      },
      dependenciaSugerida: "Agencia de Cooperación e Inversión de Medellín (ACI)",
      resumenBullets: [
        "El peticionario indica que lleva más de 20 días sin respuesta formal.",
        "Adjunta radicado y comprobante de envío de soportes.",
        "Solicita estado del trámite y fecha estimada de respuesta.",
      ],
      peticionOriginal: `Yo, Carlos Andrés Vélez, presento queja por la demora en la respuesta a mi solicitud de subsidio para mipymes, radicada hace más de 20 días hábiles.

    No he recibido comunicación oficial sobre el estado del trámite. Solicito respuesta formal con fecha estimada de decisión y validación de los documentos adjuntos.`,
      borradorRespuesta: `Apreciado Carlos Andrés,\n\nHemos registrado su queja y verificaremos el estado del radicado en el sistema de gestión. En un plazo máximo de cinco (5) días hábiles le remitiremos el avance correspondiente y, de ser necesario, las acciones correctivas aplicables.\n\nAgradecemos la información suministrada.\n\nAtentamente,\nEquipo de Atención PQRSD`,
      documentoPaginas: 7,
    },
    {
      id: "PQR-003",
      tituloIa:
        "Consulta sobre convocatoria de innovación abierta y criterios de elegibilidad.",
      tipo: "Consultas",
      createdAt: addCalendarDays(now, -35),
      ciudadano: {
        nombre: "Laura Catalina Mejía",
        documento: "CC 1.045.882.001",
        email: "lmejia.innova@gmail.com",
        telefono: "+57 311 222 6677",
      },
      dependenciaSugerida: "Secretaría de Innovación Digital",
      resumenBullets: [
        "Interés en participar con una startup de software civic tech.",
        "Pregunta por requisitos de constitución y antigüedad mínima.",
        "Consulta si aplica para equipos interdisciplinarios.",
      ],
      peticionOriginal: `Yo, Laura Catalina Mejía, solicito información oficial sobre la convocatoria de innovación abierta vigente.

    En particular requiero conocer criterios de elegibilidad, requisitos de constitución para startups, antigüedad mínima exigida y si se permite la postulación de equipos interdisciplinarios con enfoque civic tech.`,
      borradorRespuesta: `Estimada Laura Catalina,\n\nLe confirmamos que la convocatoria vigente publica los criterios de elegibilidad en el anexo técnico. En líneas generales, se requiere personería jurídica o natural con RUT y cumplimiento de requisitos de experiencia indicados por línea estratégica.\n\nPuede remitir dudas puntuales sobre su caso y adjuntar una breve ficha del equipo.\n\nSaludos cordiales,\nEquipo de Atención PQRSD`,
      documentoPaginas: 7,
    },
    {
      id: "PQR-004",
      tituloIa:
        "Información sobre horarios y sede para radicación presencial de PQRSD.",
      tipo: "Información",
      createdAt: addCalendarDays(now, -1),
      ciudadano: {
        nombre: "Diego León Arango",
        documento: "CC 98.765.432",
        email: "d.leon@outlook.com",
        telefono: "+57 300 888 4411",
      },
      dependenciaSugerida: "Secretaría de Despacho",
      resumenBullets: [
        "Consulta por ventanilla única y documentación mínima para radicar.",
        "Pregunta si requiere cita previa.",
        "Solicita confirmación de canales digitales alternativos.",
      ],
      peticionOriginal: `Yo, Diego León Arango, solicito información sobre horarios y sedes habilitadas para radicación presencial de PQRSD.

    Adicionalmente, agradezco confirmar si se requiere cita previa y cuáles son los canales virtuales disponibles para radicar fuera del horario de atención presencial.`,
      borradorRespuesta: `Apreciado Diego,\n\nLa radicación de PQRSD está disponible de manera digital las 24 horas. Para atención presencial, puede consultar el calendario y sedes habilitadas en la página institucional; algunos servicios requieren agendamiento.\n\nQuedamos atentos a cualquier inquietud adicional.\n\nCordial saludo,\nEquipo de Atención PQRSD`,
      documentoPaginas: 7,
    },
    {
      id: "PQR-005",
      tituloIa:
        "Queja por inconsistencia en respuesta a reclamo previo sobre facturación de servicio.",
      tipo: "Quejas",
      createdAt: addCalendarDays(now, -18),
      ciudadano: {
        nombre: "Ana Patricia Gómez",
        documento: "CC 35.198.765",
        email: "ana.gomez@correo.net",
        telefono: "+57 604 321 9900",
      },
      dependenciaSugerida: "Contraloría Delegada",
      resumenBullets: [
        "La peticionaria señala contradicción entre dos comunicaciones oficiales.",
        "Solicita revisión por parte de un supervisor.",
        "Adjunta historial de mensajes y radicados.",
      ],
      peticionOriginal: `Yo, Ana Patricia Gómez, presento queja por inconsistencia entre dos respuestas oficiales recibidas frente a mi reclamo por facturación.

    Solicito revisión por parte de un supervisor, unificación de la respuesta institucional y aclaración definitiva del valor facturado, adjuntando los radicados previos.`,
      borradorRespuesta: `Estimada Ana Patricia,\n\nHemos recibido su queja y activaremos la revisión interna correspondiente. Le informaremos el número de seguimiento y los pasos siguientes dentro del término legal aplicable.\n\nGracias por ayudarnos a mejorar el servicio.\n\nAtentamente,\nEquipo de Atención PQRSD`,
      documentoPaginas: 7,
    },
    {
      id: "PQR-006",
      tituloIa:
        "Petición de acompañamiento para fortalecimiento de unidad productiva barrial.",
      tipo: "Información",
      createdAt: addCalendarDays(now, -3),
      ciudadano: {
        nombre: "Julián Esteban Mena",
        documento: "CC 1.040.220.118",
        email: "julian.mena@gmail.com",
        telefono: "+57 312 440 2299",
      },
      dependenciaSugerida: "Subsecretaría de creación y fortalecimiento empresarial",
      resumenBullets: [
        "Solicita ruta de capacitación para mejorar ventas y formalización.",
        "Pregunta por programas vigentes para microempresas de barrio.",
        "Requiere acompañamiento para plan de negocio básico.",
      ],
      peticionOriginal: `Yo, Julián Esteban Mena, solicito acompañamiento para fortalecer mi unidad productiva barrial.

    Requiero información sobre capacitaciones en ventas, formalización y construcción de plan de negocio, así como los programas de apoyo vigentes para microempresas en mi comuna.`,
      borradorRespuesta: `Estimado Julián Esteban,\n\nRecibimos su petición y le compartiremos la oferta institucional de acompañamiento empresarial disponible para su unidad productiva.\n\nAtentamente,\nEquipo de Atención PQRSD`,
      documentoPaginas: 6,
    },
    {
      id: "PQR-007",
      tituloIa: "Consulta sobre incentivos para turismo comunitario en corregimientos.",
      tipo: "Consultas",
      createdAt: addCalendarDays(now, -9),
      ciudadano: {
        nombre: "Viviana Restrepo",
        documento: "CC 43.210.998",
        email: "vrestrepo@correo.com",
        telefono: "+57 300 774 1122",
      },
      dependenciaSugerida: "Subsecretaría de turismo",
      resumenBullets: [
        "Solicita información sobre líneas de apoyo para rutas turísticas locales.",
        "Pregunta por requisitos para registrarse en programas distritales.",
        "Requiere claridad sobre cronograma de convocatorias.",
      ],
      peticionOriginal: `Yo, Viviana Restrepo, solicito información sobre incentivos para turismo comunitario en corregimientos.

    Solicito requisitos de inscripción, criterios de selección y cronograma de convocatorias para iniciativas locales de rutas turísticas.`,
      borradorRespuesta: `Estimada Viviana,\n\nEnviaremos a su correo la información de incentivos y requisitos para iniciativas de turismo comunitario en corregimientos.\n\nCordialmente,\nEquipo de Atención PQRSD`,
      documentoPaginas: 5,
    },
    {
      id: "PQR-008",
      tituloIa:
        "Queja por falta de respuesta a solicitud de asistencia técnica rural.",
      tipo: "Quejas",
      createdAt: addCalendarDays(now, -20),
      ciudadano: {
        nombre: "Hernán Darío Álvarez",
        documento: "CC 70.445.113",
        email: "hdalvarez@campo.co",
        telefono: "+57 311 980 6671",
      },
      dependenciaSugerida: "Subsecretaría de desarrollo rural",
      resumenBullets: [
        "El ciudadano reporta no haber recibido respuesta tras radicado previo.",
        "Solicita visita técnica para validación de cultivo.",
        "Pide priorización por afectaciones de producción.",
      ],
      peticionOriginal: `Yo, Hernán Darío Álvarez, presento queja por la falta de respuesta a mi solicitud de asistencia técnica rural.

    Debido a afectaciones en mi cultivo, solicito priorización del caso y programación de visita técnica en el menor tiempo posible.`,
      borradorRespuesta: `Apreciado Hernán Darío,\n\nLamentamos la demora en la respuesta. Priorizaremos su caso y coordinaremos atención técnica en el menor tiempo posible.\n\nAtentamente,\nEquipo de Atención PQRSD`,
      documentoPaginas: 8,
    },
    {
      id: "PQR-009",
      tituloIa: "Solicitud de información para participar en feria empresarial local.",
      tipo: "Información",
      createdAt: addCalendarDays(now, -6),
      ciudadano: {
        nombre: "Natalia Ospina",
        documento: "CC 1.040.887.542",
        email: "nospina@emprende.com",
        telefono: "+57 320 654 3412",
      },
      dependenciaSugerida: "Secretaría de Desarrollo Económico",
      resumenBullets: [
        "Pregunta por fechas y requisitos para expositores.",
        "Solicita información sobre costos de inscripción.",
        "Consulta si hay cupos para emprendimientos gastronómicos.",
      ],
      peticionOriginal: `Yo, Natalia Ospina, solicito información para participar como expositora en la próxima feria empresarial local.

    Solicito confirmar fechas, requisitos, costos de inscripción y disponibilidad de cupos para emprendimientos gastronómicos.`,
      borradorRespuesta: `Estimada Natalia,\n\nLe compartiremos el cronograma de ferias y los requisitos de participación para expositores de emprendimientos locales.\n\nAtentamente,\nEquipo de Atención PQRSD`,
      documentoPaginas: 4,
    },
    {
      id: "PQR-010",
      tituloIa:
        "Consulta sobre proceso de inscripción a talleres de transformación digital.",
      tipo: "Consultas",
      createdAt: addCalendarDays(now, -2),
      ciudadano: {
        nombre: "Santiago Muñoz",
        documento: "CC 1.154.223.019",
        email: "smunoz@correo.co",
        telefono: "+57 301 333 0099",
      },
      dependenciaSugerida: "Secretaría de Innovación Digital",
      resumenBullets: [
        "Solicita paso a paso para inscripción a talleres.",
        "Pregunta por modalidad virtual y presencial.",
        "Requiere confirmar disponibilidad de cupos.",
      ],
      peticionOriginal: `Yo, Santiago Muñoz, solicito orientación sobre el proceso de inscripción a talleres de transformación digital.

Solicito el paso a paso, modalidades disponibles (virtual y presencial), requisitos y confirmación de cupos para la próxima cohorte.`,
      borradorRespuesta: `Estimado Santiago,\n\nLe enviaremos el enlace de inscripción y la oferta vigente de talleres de transformación digital con sus modalidades disponibles.\n\nCordialmente,\nEquipo de Atención PQRSD`,
      documentoPaginas: 5,
    },
  ];
}

/** Logo horizontal (escudo + tipografía) para navbar */
function LogoAlcaldiaNavbar({ className = "" }) {
  return (
    <img
      src="/alcaldia-1024x369.png"
      alt={ALT_ALCALDIA}
      className={`h-10 w-auto max-w-[min(100%,220px)] object-contain object-left sm:h-11 sm:max-w-[min(100%,320px)] md:max-w-none ${className}`}
    />
  );
}

/** Logo vertical / completo para pantalla de login */
function LogoAlcaldiaLogin({ className = "" }) {
  return (
    <img
      src="/logo-alcaldia-vertical.png"
      alt={ALT_ALCALDIA}
      className={`max-h-44 w-auto max-w-full object-contain ${className}`}
    />
  );
}

function AppNavbar() {
  return (
    <header className="border-b border-gray-200/80 bg-[#DDF0F8]">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-3 py-3 md:grid-cols-[1fr_auto_1fr] md:gap-4">
          <div className="flex min-w-0 items-center md:justify-self-start">
            <LogoAlcaldiaNavbar />
          </div>
          <div className="flex flex-col items-center justify-center text-center md:justify-self-center">
            <p className="text-base font-bold text-gray-900">Atención PQRSD</p>
            <p className="max-w-md text-xs text-gray-700 sm:text-sm">
              Peticiones, Quejas, Reclamos, Sugerencias, Denuncias
            </p>
          </div>
          <div className="hidden md:block" aria-hidden />
        </div>
      </div>
    </header>
  );
}

function LimiteBadge({ diasRestantes }) {
  if (diasRestantes < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        {diasRestantes === -1 ? "-1 día" : `${diasRestantes} días`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
      {diasRestantes === 1 ? "1 día" : `${diasRestantes} días`}
    </span>
  );
}

function LoginView({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-0 sm:py-0">
        <div className="mb-4 flex flex-col items-center text-center">
          <LogoAlcaldiaLogin />
          <p className="mt-3 text-sm text-gray-700">
            Secretaría de Desarrollo Económico
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            ÁgorApp
          </h1>
        </div>

        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
          <p className="mb-4 text-center text-sm font-medium text-[#FF8C00]">
            Ingresa tus datos para iniciar sesión
          </p>

          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <label
                htmlFor="usuario"
                className="mb-2 block text-center text-xs text-gray-600"
              >
                Ingresa el usuario
              </label>
              <input
                id="usuario"
                type="text"
                autoComplete="username"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full max-w-sm rounded-full border border-gray-400 bg-white px-5 py-2.5 text-center text-sm text-gray-800 outline-none ring-[#DDF0F8] transition placeholder:text-gray-400 focus:border-sky-400 focus:ring-2"
                placeholder=""
              />
            </div>
            <div className="flex flex-col items-center">
              <label
                htmlFor="clave"
                className="mb-2 block text-center text-xs text-gray-600"
              >
                Digita la contraseña
              </label>
              <input
                id="clave"
                type="password"
                autoComplete="current-password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                className="w-full max-w-sm rounded-full border border-gray-400 bg-white px-5 py-2.5 text-center text-sm text-gray-800 outline-none ring-[#DDF0F8] transition focus:border-sky-400 focus:ring-2"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => onLogin()}
              className="w-full rounded-full bg-[#A7D9ED] px-8 py-3 text-sm font-bold uppercase tracking-wide text-gray-900 shadow-sm transition hover:bg-[#93C5FD] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
            >
              INGRESAR
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function DashboardView({ items, viewMode, onViewModeChange, onSelect, onLogout }) {
  const isPendientes = viewMode === "pendientes";
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppNavbar />
      <div className="flex-1 pb-10 pt-2">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-end py-2">
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-medium text-red-700 shadow-sm transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              Cerrar sesión
            </button>
          </div>
          <div className="mb-3 w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onViewModeChange("pendientes")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                isPendientes
                  ? "bg-[#DDF0F8] text-gray-900 ring-1 ring-sky-200"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              Tickets pendientes
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("historico")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                !isPendientes
                  ? "bg-[#DDF0F8] text-gray-900 ring-1 ring-sky-200"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              Histórico resueltos
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {isPendientes ? "Tickets pendientes" : "Histórico de tickets resueltos"}
            </h2>
            <span className="text-xs text-gray-500">
              {items.length} ticket{items.length === 1 ? "" : "s"}
            </span>
          </div>
          </div>
          <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-800">
                    N° Petición
                  </th>
                  <th className="min-w-[200px] px-4 py-3 font-semibold text-gray-800">
                    Título Resumen IA
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-800">
                    Límite de tiempo
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-800">
                    Tipo
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-800">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-gray-600"
                    >
                      {isPendientes
                        ? "No tienes tickets pendientes."
                        : "Aún no tienes tickets resueltos en el histórico."}
                    </td>
                  </tr>
                ) : null}
                {items.map((row) => {
                  const dias = daysUntilDeadline(row.createdAt, row.tipo);
                  const diasTranscurridos = getDiasTranscurridos(row.createdAt);
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/80">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                        {row.id}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.tituloIa}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <LimiteBadge diasRestantes={dias} />
                        <span className="mt-1 block text-xs text-gray-500">
                          Lleva {diasTranscurridos} día
                          {diasTranscurridos === 1 ? "" : "s"} · Creado {formatDate(row.createdAt)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-[#DDF0F8] px-2.5 py-0.5 text-xs font-medium text-gray-800 ring-1 ring-sky-100">
                          {row.tipo}
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          SLA: {SLA_BY_TIPO[row.tipo] ?? 10} días
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => onSelect(row.id)}
                          className="inline-flex items-center justify-center rounded-full p-2 text-gray-600 transition hover:bg-[#DDF0F8] hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-300"
                          title="Ver detalle"
                        >
                          <Eye className="h-5 w-5" />
                          <span className="sr-only">Ver detalle</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccordionDocumento({ paginas, peticionOriginal }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-gray-800 transition hover:bg-gray-50"
        aria-expanded={open}
      >
        <span>Ver petición original</span>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-gray-500" />
        )}
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-4 text-sm leading-relaxed text-gray-700">
          <p className="whitespace-pre-line">{peticionOriginal}</p>
        </div>
      )}
    </div>
  );
}

function DetailView({ item, secretariasOpciones, onBack, onReassign, onResolve }) {
  const dias = daysUntilDeadline(item.createdAt, item.tipo);
  const isResuelto = Boolean(item.resuelto);
  const options =
    Array.isArray(secretariasOpciones) && secretariasOpciones.length > 0
      ? secretariasOpciones
      : DEFAULT_REASIGNACION_OPCIONES;
  const [showReassignSlider, setShowReassignSlider] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [draftText, setDraftText] = useState(item.borradorRespuesta);
  const [reassignIndex, setReassignIndex] = useState(() => {
    const found = options.indexOf(item.dependenciaSugerida);
    return found >= 0 ? found : 0;
  });

  useEffect(() => {
    const found = options.indexOf(item.dependenciaSugerida);
    setReassignIndex(found >= 0 ? found : 0);
    setShowReassignSlider(false);
  }, [item.id, item.dependenciaSugerida, options]);

  useEffect(() => {
    setDraftText(item.borradorRespuesta);
    setIsEditingDraft(false);
  }, [item.id, item.borradorRespuesta]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppNavbar />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-gray-800 transition hover:bg-white hover:shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver
        </button>

        <article className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100 sm:p-8">
          <header className="border-b border-gray-100 pb-6">
            <p className="text-sm font-semibold text-[#FF8C00]">{item.id}</p>
            <h2 className="mt-1 text-xl font-bold text-gray-900">
              {item.tituloIa}
            </h2>
            <p className="mt-2 text-xs text-gray-500">
              Título generado por IA · Límite estimado:{" "}
              <LimiteBadge diasRestantes={dias} />
            </p>
          </header>

          <section className="mt-6">
            <div className="rounded-xl border-l-4 border-sky-400 bg-[#F0FAFF] p-4">
              <h3 className="text-sm font-bold text-gray-900">
                Resumen Ejecutivo IA
              </h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-800">
                {item.resumenBullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-6">
            <p className="text-sm text-gray-800">
              <span className="font-semibold">
                Dependencia sugerida por IA:
              </span>{" "}
              <span className="ml-1 inline-flex items-center rounded-full bg-[#DDF0F8] px-3 py-1 text-xs font-medium text-gray-900 ring-1 ring-sky-100">
                <Building2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                {item.dependenciaSugerida}
              </span>
            </p>
          </section>

          <section className="mt-6">
            <h3 className="text-sm font-bold text-gray-900">
              Datos de contacto del ciudadano
            </h3>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-gray-500">Nombre</dt>
                <dd className="font-medium text-gray-800">
                  {item.ciudadano.nombre}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Documento</dt>
                <dd className="font-medium text-gray-800">
                  {item.ciudadano.documento}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Correo</dt>
                <dd className="font-medium text-gray-800">
                  {item.ciudadano.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Teléfono</dt>
                <dd className="font-medium text-gray-800">
                  {item.ciudadano.telefono}
                </dd>
              </div>
            </dl>
          </section>

          <section className="mt-6">
            <AccordionDocumento
              paginas={item.documentoPaginas}
              peticionOriginal={item.peticionOriginal}
            />
          </section>

          <section className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="borrador"
                className="block text-sm font-semibold text-gray-900"
              >
                Borrador sugerido (Requiere revisión humana)
              </label>
              <button
                type="button"
                onClick={() => setIsEditingDraft((v) => !v)}
                className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Editar
              </button>
            </div>
            <textarea
              id="borrador"
              rows={10}
              readOnly={!isEditingDraft}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className={`mt-2 w-full resize-y rounded-xl border px-4 py-3 text-sm text-gray-800 outline-none ring-[#DDF0F8] focus:border-sky-300 focus:ring-2 ${
                isEditingDraft ? "border-sky-300 bg-white" : "border-gray-200 bg-gray-50/80"
              }`}
            />
          </section>

          <footer className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
            {isResuelto ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
                Resuelto
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowReassignSlider((v) => !v)}
                  className="rounded-full border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                >
                  Reasignar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsResolving(true);
                    try {
                      await onResolve();
                    } finally {
                      setIsResolving(false);
                    }
                  }}
                  disabled={isResolving}
                  className="rounded-full bg-[#DDF0F8] px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-[#c9e6f5] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2"
                >
                  {isResolving ? "Aprobando..." : "Aprobar"}
                </button>
              </>
            )}
          </footer>

          {showReassignSlider && !isResuelto ? (
            <section className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Reasignar petición
              </h3>
              <p className="mt-1 text-xs text-gray-600">
                Selecciona la dependencia y confirma para volver al listado.
              </p>

              <div className="mt-4">
                <label
                  htmlFor="dependencia-reasignacion"
                  className="mb-2 block text-xs font-medium text-gray-700"
                >
                  Dependencia
                </label>
                <select
                  id="dependencia-reasignacion"
                  value={reassignIndex}
                  onChange={(e) => setReassignIndex(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  aria-label="Seleccionar dependencia para reasignar"
                >
                  {options.map((opcion, idx) => (
                    <option key={opcion} value={idx}>
                      {opcion}
                    </option>
                  ))}
                </select>
                <div className="mt-3 rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-gray-800">
                  <span className="font-semibold">Seleccionada:</span>{" "}
                  {options[reassignIndex]}
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReassignSlider(false)}
                  disabled={isReassigning}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsReassigning(true);
                    try {
                      await onReassign(options[reassignIndex]);
                    } finally {
                      setIsReassigning(false);
                    }
                  }}
                  disabled={isReassigning}
                  className="rounded-full bg-[#DDF0F8] px-4 py-2 text-xs font-semibold text-gray-900 hover:bg-[#c9e6f5]"
                >
                  {isReassigning ? "Reasignando..." : "Reasignar y volver"}
                </button>
              </div>
            </section>
          ) : null}
        </article>
      </div>
    </div>
  );
}

export default function AgoraApp() {
  const [vista, setVista] = useState("login");
  const [bandejaActiva, setBandejaActiva] = useState("pendientes");
  const [seleccionId, setSeleccionId] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [pqrsds, setPqrsds] = useState([]);
  const [secretariasOpciones, setSecretariasOpciones] = useState(
    DEFAULT_REASIGNACION_OPCIONES
  );
  const ticketsPendientes = useMemo(
    () => pqrsds.filter((p) => !p.reasignado && !p.resuelto),
    [pqrsds]
  );
  const ticketsResueltos = useMemo(
    () => pqrsds.filter((p) => p.resuelto),
    [pqrsds]
  );
  const seleccion = useMemo(
    () => pqrsds.find((p) => p.id === seleccionId) ?? null,
    [pqrsds, seleccionId]
  );

  useEffect(() => {
    if (vista !== "dashboard" || bandejaActiva !== "pendientes") return;

    let cancelled = false;
    (async () => {
      try {
        const pendientes = await fetchPendientesPorSecretaria();
        if (cancelled) return;
        setPqrsds((prev) => {
          const resueltos = prev.filter((p) => p.resuelto);
          return [...pendientes, ...resueltos];
        });
      } catch (err) {
        console.error("Error cargando pendientes:", err);
        if (cancelled) return;
        setPqrsds((prev) => prev.filter((p) => p.resuelto));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vista, bandejaActiva]);

  useEffect(() => {
    if (vista === "login") return;

    let cancelled = false;
    (async () => {
      try {
        const secretarias = await fetchSecretarias();
        if (cancelled || secretarias.length === 0) return;
        setSecretariasOpciones(secretarias);
      } catch (err) {
        console.error("Error cargando secretarías:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vista]);

  const handleSelectTicket = async (id) => {
    setDetalleLoading(true);
    try {
      const detalle = await fetchDetallePqrsById(id);
      if (detalle) {
        setPqrsds((prev) => {
          const updated = prev.map((p) =>
            p.id === id ? { ...p, ...detalle, id: p.id } : p
          );
          return updated.some((p) => p.id === id) ? updated : [...prev, detalle];
        });
      }
    } catch (err) {
      console.error("Error cargando detalle por id:", err);
    } finally {
      setSeleccionId(id);
      setVista("detalle");
      setDetalleLoading(false);
    }
  };

  if (vista === "login") {
    return (
      <LoginView
        onLogin={() => {
          setBandejaActiva("pendientes");
          setVista("dashboard");
        }}
      />
    );
  }

  if (vista === "detalle" && seleccion) {
    return (
      <DetailView
        item={seleccion}
        secretariasOpciones={secretariasOpciones}
        onBack={() => {
          setVista("dashboard");
          setSeleccionId(null);
        }}
        onReassign={(dependencia) => {
          return (async () => {
            try {
              await actualizarSecretariaPqrs(seleccion.id, dependencia);
              setPqrsds((prev) =>
                prev.map((p) =>
                  p.id === seleccion.id
                    ? { ...p, dependenciaSugerida: dependencia, reasignado: true }
                    : p
                )
              );
              setVista("dashboard");
              setSeleccionId(null);
            } catch (err) {
              console.error("Error actualizando secretaría:", err);
              alert("No fue posible reasignar la petición en este momento.");
            }
          })();
        }}
        onResolve={() => {
          return (async () => {
            try {
              await resolverPqrs(seleccion.id);
              setPqrsds((prev) =>
                prev.map((p) =>
                  p.id === seleccion.id
                    ? { ...p, resuelto: true, resueltoAt: new Date() }
                    : p
                )
              );
              setBandejaActiva("historico");
              setVista("dashboard");
              setSeleccionId(null);
            } catch (err) {
              console.error("Error resolviendo petición:", err);
              alert("No fue posible aprobar la petición en este momento.");
            }
          })();
        }}
      />
    );
  }

  if (vista === "detalle" && detalleLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <AppNavbar />
        <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-8 text-sm text-gray-600 sm:px-6 lg:px-8">
          Cargando detalle de la petición...
        </div>
      </div>
    );
  }

  return (
    <DashboardView
      items={bandejaActiva === "pendientes" ? ticketsPendientes : ticketsResueltos}
      viewMode={bandejaActiva}
      onViewModeChange={setBandejaActiva}
      onSelect={handleSelectTicket}
      onLogout={() => {
        setSeleccionId(null);
        setVista("login");
      }}
    />
  );
}
