import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import {
  clearStoredToken,
  fetchMe,
  fetchPqrsds,
  getStoredToken,
  login as apiLogin,
  normalizePqrsdItem,
  setStoredToken,
} from "./api.js";

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

const LOREM_ORIGINAL = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh. Mauris ac mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam.`;

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

function SkipToContent() {
  return (
    <a
      href="#contenido-principal"
      className="absolute left-[-9999px] top-2 z-[100] w-px overflow-hidden whitespace-nowrap rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-md ring-2 ring-sky-400 focus:left-4 focus:top-4 focus:h-auto focus:w-auto focus:overflow-visible focus:outline-none"
    >
      Saltar al contenido
    </a>
  );
}

function AppNavbar() {
  return (
    <header className="border-b border-gray-200/80 bg-[var(--agora-surface)]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-3 px-4 py-3 sm:px-6 md:grid-cols-[1fr_auto_1fr] md:gap-4 lg:px-8">
        <div className="flex min-w-0 items-center md:justify-self-start">
          <LogoAlcaldiaNavbar />
        </div>
        <div className="flex flex-col items-center justify-center text-center md:justify-self-center">
          <p className="font-serif text-base font-bold text-gray-900">
            Atención PQRSD
          </p>
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
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--agora-accent)] px-3 py-1 text-xs font-semibold text-white shadow-sm">
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

function LoginView({ onSubmit, submitting, error }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const canSubmit =
    usuario.trim().length >= 3 && clave.length >= 8 && !submitting;

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <SkipToContent />
      <main
        id="contenido-principal"
        className="flex flex-1 flex-col items-center justify-center px-4 py-10"
        tabIndex={-1}
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoAlcaldiaLogin />
          <p className="mt-5 text-sm text-gray-700">
            Secretaría de Desarrollo Económico
          </p>
          <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-gray-900">
            ÁgoraApp
          </h1>
        </div>

        <form
          className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg ring-1 ring-gray-100"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit(usuario.trim(), clave);
          }}
        >
          <p className="mb-6 text-center text-sm font-medium text-[var(--agora-accent)]">
            Ingresa tus datos para iniciar sesión
          </p>

          {error ? (
            <p
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}

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
                className="w-full max-w-sm rounded-full border border-gray-400 bg-white px-5 py-2.5 text-center text-sm text-gray-800 outline-none ring-[var(--agora-surface)] transition placeholder:text-gray-400 focus:border-sky-400 focus:ring-2"
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
                className="w-full max-w-sm rounded-full border border-gray-400 bg-white px-5 py-2.5 text-center text-sm text-gray-800 outline-none ring-[var(--agora-surface)] transition focus:border-sky-400 focus:ring-2"
              />
              <p className="mt-2 max-w-sm text-center text-xs text-gray-500">
                Mínimo 8 caracteres. Usuario demo por defecto:{" "}
                <span className="font-mono text-gray-700">alice</span> /{" "}
                <span className="font-mono text-gray-700">Secret123</span>
              </p>
            </div>
          </div>

          <div className="mt-8">
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-full bg-[var(--agora-cta)] px-8 py-3 text-sm font-bold uppercase tracking-wide text-gray-900 shadow-sm transition hover:bg-[#93C5FD] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Ingresando…" : "INGRESA"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function DashboardView({
  items,
  loading,
  loadError,
  onRetry,
  onSelect,
  onLogout,
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-gray-50">
      <SkipToContent />
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
      <main
        id="contenido-principal"
        className="flex-1 px-4 pb-10 pt-2 sm:px-6 lg:px-8"
        tabIndex={-1}
        aria-busy={loading}
      >
        <h1 className="sr-only">Bandeja de peticiones PQRSD</h1>
        {loadError ? (
          <div
            className="mx-auto mb-4 flex max-w-7xl flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <span>{loadError}</span>
            <button
              type="button"
              onClick={onRetry}
              className="shrink-0 rounded-full border border-amber-300 bg-white px-4 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              Reintentar
            </button>
          </div>
        ) : null}
        {loading ? (
          <p className="mx-auto max-w-7xl py-6 text-center text-sm text-gray-600">
            Cargando peticiones…
          </p>
        ) : null}
        <div className="mx-auto max-w-7xl overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
          <div className="overflow-x-auto">
            <table
              className="min-w-full divide-y divide-gray-200 text-left text-sm"
              aria-label="Listado de peticiones PQRSD"
            >
              <caption className="sr-only">
                Tabla con número de petición, título resumido por IA, plazo,
                tipo y acción para ver detalle.
              </caption>
              <thead className="bg-gray-50/80">
                <tr>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 font-semibold text-gray-800"
                  >
                    N° Petición
                  </th>
                  <th
                    scope="col"
                    className="min-w-[200px] px-4 py-3 font-semibold text-gray-800"
                  >
                    Título Resumen IA
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 font-semibold text-gray-800"
                  >
                    Límite de tiempo
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 font-semibold text-gray-800"
                  >
                    Tipo
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-800"
                  >
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {!loading && items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-gray-600"
                    >
                      No hay peticiones para mostrar.
                    </td>
                  </tr>
                ) : null}
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
                        <span className="inline-flex items-center rounded-full bg-[var(--agora-surface)] px-2.5 py-0.5 text-xs font-medium text-gray-800 ring-1 ring-sky-100">
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
                          className="inline-flex items-center justify-center rounded-full p-2 text-gray-600 transition hover:bg-[var(--agora-surface)] hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-300"
                          aria-label={`Ver detalle de la petición ${row.id}`}
                        >
                          <Eye className="h-5 w-5" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function AccordionDocumento({ paginas }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerId = useId();
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        id={triggerId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-gray-800 transition hover:bg-gray-50"
        aria-expanded={open}
        aria-controls={panelId}
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
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="border-t border-gray-100 bg-gray-50/50 px-4 py-4 text-sm leading-relaxed text-gray-700"
          tabIndex={-1}
        >
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
    <div className="relative flex min-h-screen flex-col bg-gray-50">
      <SkipToContent />
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

        <article
          id="contenido-principal"
          className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100 sm:p-8"
          tabIndex={-1}
        >
          <header className="border-b border-gray-100 pb-6">
            <p className="text-sm font-semibold text-[var(--agora-accent)]">
              {item.id}
            </p>
            <h2 className="mt-1 font-serif text-xl font-bold text-gray-900">
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
                {item.resumenBullets.map((b, i) => (
                  <li key={`${item.id}-r-${i}`}>{b}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-6">
            <p className="text-sm text-gray-800">
              <span className="font-semibold">
                Dependencia sugerida por IA:
              </span>{" "}
              <span className="ml-1 inline-flex items-center rounded-full bg-[var(--agora-surface)] px-3 py-1 text-xs font-medium text-gray-900 ring-1 ring-sky-100">
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
              className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-800 outline-none ring-[var(--agora-surface)] focus:border-sky-300 focus:ring-2"
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
              className="rounded-full bg-[var(--agora-surface)] px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-[#c9e6f5] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2"
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
  const [token, setToken] = useState(null);
  const [pqrsds, setPqrsds] = useState([]);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [loadPending, setLoadPending] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadBandeja = useCallback(async (authToken) => {
    setLoadPending(true);
    setLoadError(null);
    try {
      const raw = await fetchPqrsds(authToken);
      setPqrsds(raw.map(normalizePqrsdItem));
    } catch (e) {
      if (e.code === "UNAUTHORIZED") {
        clearStoredToken();
        setToken(null);
        setPqrsds([]);
        setVista("login");
        setLoginError("Sesión expirada. Vuelve a ingresar.");
      } else {
        setLoadError(
          e.message === "Failed to fetch"
            ? "No hay conexión con el servidor (¿está corriendo el backend en el puerto 8080?)."
            : e.message
        );
      }
    } finally {
      setLoadPending(false);
    }
  }, []);

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setSessionChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await fetchMe(stored);
        if (cancelled) return;
        setToken(stored);
        setVista("dashboard");
        await loadBandeja(stored);
      } catch {
        clearStoredToken();
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadBandeja]);

  const seleccion = useMemo(
    () => pqrsds.find((p) => p.id === seleccionId) ?? null,
    [pqrsds, seleccionId]
  );

  const handleLogin = async (username, password) => {
    setLoginSubmitting(true);
    setLoginError(null);
    try {
      const res = await apiLogin(username, password);
      setStoredToken(res.token);
      setToken(res.token);
      setVista("dashboard");
      await loadBandeja(res.token);
    } catch (e) {
      setLoginError(e.message || "Error de inicio de sesión.");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearStoredToken();
    setToken(null);
    setPqrsds([]);
    setSeleccionId(null);
    setLoadError(null);
    setVista("login");
  };

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-600">
        Cargando…
      </div>
    );
  }

  if (vista === "login") {
    return (
      <LoginView
        onSubmit={handleLogin}
        submitting={loginSubmitting}
        error={loginError}
      />
    );
  }

  if (vista === "detalle") {
    if (!seleccion) {
      return (
        <div className="flex min-h-screen flex-col bg-gray-50">
          <AppNavbar />
          <div className="mx-auto max-w-lg flex-1 px-4 py-10 text-center">
            <p className="text-sm text-gray-700">No se encontró la petición.</p>
            <button
              type="button"
              onClick={() => {
                setSeleccionId(null);
                setVista("dashboard");
              }}
              className="mt-4 rounded-full bg-[var(--agora-surface)] px-5 py-2 text-sm font-semibold text-gray-900"
            >
              Volver al listado
            </button>
          </div>
        </div>
      );
    }
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
      items={pqrsds}
      loading={loadPending}
      loadError={loadError}
      onRetry={() => token && loadBandeja(token)}
      onSelect={(id) => {
        setSeleccionId(id);
        setVista("detalle");
      }}
      onLogout={handleLogout}
    />
  );
}
