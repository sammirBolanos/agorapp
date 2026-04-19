import { useMemo, useState } from "react";
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

function formatDate(d) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
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
      borradorRespuesta: `Apreciado Carlos Andrés,\n\nHemos registrado su queja y verificaremos el estado del radicado en el sistema de gestión. En un plazo máximo de cinco (5) días hábiles le remitiremos el avance correspondiente y, de ser necesario, las acciones correctivas aplicables.\n\nAgradecemos la información suministrada.\n\nAtentamente,\nEquipo de Atención PQRSD`,
      documentoPaginas: 7,
    },
    {
      id: "PQR-003",
      tituloIa:
        "Consulta sobre convocatoria de innovación abierta y criterios de elegibilidad.",
      tipo: "Consultas",
      createdAt: addCalendarDays(now, -28),
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
      borradorRespuesta: `Apreciado Diego,\n\nLa radicación de PQRSD está disponible de manera digital las 24 horas. Para atención presencial, puede consultar el calendario y sedes habilitadas en la página institucional; algunos servicios requieren agendamiento.\n\nQuedamos atentos a cualquier inquietud adicional.\n\nCordial saludo,\nEquipo de Atención PQRSD`,
      documentoPaginas: 7,
    },
    {
      id: "PQR-005",
      tituloIa:
        "Queja por inconsistencia en respuesta a reclamo previo sobre facturación de servicio.",
      tipo: "Quejas",
      createdAt: addCalendarDays(now, -12),
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
      borradorRespuesta: `Estimada Ana Patricia,\n\nHemos recibido su queja y activaremos la revisión interna correspondiente. Le informaremos el número de seguimiento y los pasos siguientes dentro del término legal aplicable.\n\nGracias por ayudarnos a mejorar el servicio.\n\nAtentamente,\nEquipo de Atención PQRSD`,
      documentoPaginas: 7,
    },
  ];
}

const LOREM_ORIGINAL = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh. Mauris ac mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam.`;

/** Logo horizontal (escudo + tipografía) para navbar */
function LogoAlcaldiaNavbar({ className = "" }) {
  return (
    <img
      src="/logo-alcaldia-horizontal.png"
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
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-3 px-4 py-3 sm:px-6 md:grid-cols-[1fr_auto_1fr] md:gap-4 lg:px-8">
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
    </header>
  );
}

function LimiteBadge({ diasRestantes }) {
  const urgente = diasRestantes <= 3;
  if (urgente) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FF8C00] px-3 py-1 text-xs font-semibold text-white shadow-sm">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        {diasRestantes <= 0
          ? "Vencido"
          : diasRestantes === 1
            ? "1 día"
            : `${diasRestantes} días`}
      </span>
    );
  }
  const suave =
    diasRestantes <= 7
      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
      : "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${suave}`}
    >
      {diasRestantes} días
    </span>
  );
}

function LoginView({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoAlcaldiaLogin />
          <p className="mt-5 text-sm text-gray-700">
            Secretaría de Desarrollo Económico
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
            ÁgoraApp
          </h1>
        </div>

        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg ring-1 ring-gray-100">
          <p className="mb-6 text-center text-sm font-medium text-[#FF8C00]">
            Ingresa tus datos para iniciar sesión
          </p>

          <div className="space-y-5">
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

          <div className="mt-8">
            <button
              type="button"
              onClick={() => onLogin()}
              className="w-full rounded-full bg-[#A7D9ED] px-8 py-3 text-sm font-bold uppercase tracking-wide text-gray-900 shadow-sm transition hover:bg-[#93C5FD] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
            >
              INGRESA
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function DashboardView({ items, onSelect, onLogout }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppNavbar />
      <div className="mx-auto flex w-full max-w-7xl items-center justify-end gap-2 px-4 py-2 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onLogout}
          className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Cerrar sesión
        </button>
      </div>
      <div className="flex-1 px-4 pb-10 pt-2 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
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
                {items.map((row) => {
                  const dias = daysUntilDeadline(row.createdAt, row.tipo);
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/80">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                        {row.id}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.tituloIa}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <LimiteBadge diasRestantes={dias} />
                        <span className="mt-1 block text-xs text-gray-500">
                          Creado {formatDate(row.createdAt)}
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
  );
}

function AccordionDocumento({ paginas }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-gray-800 transition hover:bg-gray-50"
        aria-expanded={open}
      >
        <span>
          Ver documento original ({paginas} páginas)
        </span>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-gray-500" />
        )}
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-4 text-sm leading-relaxed text-gray-700">
          <p>{LOREM_ORIGINAL}</p>
          <p className="mt-4">{LOREM_ORIGINAL}</p>
        </div>
      )}
    </div>
  );
}

function DetailView({ item, onBack }) {
  const dias = daysUntilDeadline(item.createdAt, item.tipo);

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
            <AccordionDocumento paginas={item.documentoPaginas} />
          </section>

          <section className="mt-6">
            <label
              htmlFor="borrador"
              className="block text-sm font-semibold text-gray-900"
            >
              Borrador sugerido (Requiere revisión humana)
            </label>
            <textarea
              id="borrador"
              rows={10}
              readOnly
              className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-800 outline-none ring-[#DDF0F8] focus:border-sky-300 focus:ring-2"
              defaultValue={item.borradorRespuesta}
            />
          </section>

          <footer className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
            <button
              type="button"
              className="rounded-full border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              Reasignar
            </button>
            <button
              type="button"
              className="rounded-full bg-[#DDF0F8] px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-[#c9e6f5] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2"
            >
              Aprobar y Enviar
            </button>
          </footer>
        </article>
      </div>
    </div>
  );
}

export default function AgoraApp() {
  const [vista, setVista] = useState("login");
  const [seleccionId, setSeleccionId] = useState(null);

  const mockPqrsds = useMemo(() => buildMockPqrsds(), []);
  const seleccion = useMemo(
    () => mockPqrsds.find((p) => p.id === seleccionId) ?? null,
    [mockPqrsds, seleccionId]
  );

  if (vista === "login") {
    return <LoginView onLogin={() => setVista("dashboard")} />;
  }

  if (vista === "detalle" && seleccion) {
    return (
      <DetailView
        item={seleccion}
        onBack={() => {
          setVista("dashboard");
          setSeleccionId(null);
        }}
      />
    );
  }

  return (
    <DashboardView
      items={mockPqrsds}
      onSelect={(id) => {
        setSeleccionId(id);
        setVista("detalle");
      }}
      onLogout={() => {
        setSeleccionId(null);
        setVista("login");
      }}
    />
  );
}
