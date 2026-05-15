import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getReporteDiario, getAlertas, getMaquinas, getUsuarios, getPlan, getPedidos, getMedicionesPlan } from "../services/api";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/StatCard";
import Badge from "../components/Badge";

// ── Lógica de turnos (Los Teques, Venezuela UTC-4) ────────────────
function getHoraVenezuela() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Caracas" }));
}

function getTurnosActivos() {
  const h = getHoraVenezuela().getHours();
  const min = getHoraVenezuela().getMinutes();
  const hDec = h + min / 60;
  const activos = [];
  // Turno 1: 06:00 – 15:00
  if (hDec >= 6 && hDec < 15) activos.push("Turno 1 (6AM–3PM)");
  // Turno 2: 14:00 – 22:00
  if (hDec >= 14 && hDec < 22) activos.push("Turno 2 (2PM–10PM)");
  // Turno 3: 22:00 – 06:00
  if (hDec >= 22 || hDec < 6) activos.push("Turno 3 (10PM–6AM)");
  // Turno 4: 08:00 – 17:00
  if (hDec >= 8 && hDec < 17) activos.push("Turno 4 (8AM–5PM)");
  return activos.length > 0 ? activos : ["Sin turno"];
}

function getTurnoPrincipal() {
  const h = getHoraVenezuela().getHours();
  if (h >= 6 && h < 14) return "Turno 1";
  if (h >= 14 && h < 22) return "Turno 2";
  if (h >= 22 || h < 6) return "Turno 3";
  return "Turno 4";
}

// Filtra máquinas de prueba/test que no son reales
const esTestMaquina = (nombre) => /^test/i.test(nombre?.trim());

// ── Cronómetro ascendente (tiempo trabajado) ─────────────────────
function Cronometro({ horaArranque }) {
  const inicio = new Date(horaArranque.endsWith("Z") ? horaArranque : horaArranque + "Z");
  const [seg, setSeg] = useState(Math.floor((Date.now() - inicio.getTime()) / 1000));
  useEffect(() => {
    const id = setInterval(() => setSeg(Math.floor((Date.now() - inicio.getTime()) / 1000)), 1000);
    return () => clearInterval(id);
  }, [horaArranque]);
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60;
  return (
    <span className="font-mono text-yellow-400 font-semibold">
      {String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
    </span>
  );
}

// ── Cronómetro descendente al arranque programado ─────────────────
function CronometroArranque({ fechaProgramada, horaProgramada }) {
  const objetivo = new Date(`${fechaProgramada.slice(0,10)}T${horaProgramada}:00`);
  const [diff, setDiff] = useState(Math.floor((objetivo.getTime() - Date.now()) / 1000));
  useEffect(() => {
    const id = setInterval(() => setDiff(Math.floor((objetivo.getTime() - Date.now()) / 1000)), 1000);
    return () => clearInterval(id);
  }, [fechaProgramada, horaProgramada]);

  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3600), m = Math.floor((abs % 3600) / 60), s = abs % 60;
  const fmt = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

  if (diff > 0) {
    const urgente = diff < 7200;
    return (
      <div className="text-right">
        <p className="text-gray-500 text-xs mb-0.5">Arranca en</p>
        <span className={`font-mono font-semibold ${urgente ? "text-orange-400" : "text-gray-300"}`}>{fmt}</span>
      </div>
    );
  }
  return (
    <div className="text-right">
      <p className="text-red-500 text-xs mb-0.5 animate-pulse">⚠ Retraso</p>
      <span className="font-mono font-semibold text-red-400">+{fmt}</span>
    </div>
  );
}

// ── Tarjeta individual por máquina ────────────────────────────────
function TarjetaMaquina({ maq, plan, pedido, turno, mediciones = [] }) {
  const esOperativa = ["operativa", "planificado", "en_curso", "parada"].includes(maq.estado);

  const dotColor = {
    operativa:    "bg-gray-400",
    planificado:  "bg-blue-400",
    en_curso:     "bg-green-400",
    parada:       "bg-purple-400",
    mantenimiento:"bg-yellow-400",
    falla:        "bg-red-400",
  }[maq.estado] ?? "bg-gray-400";

  // Badge unificado: plan.estado tiene prioridad; si no hay plan usa maq.estado
  const BADGE_CONFIG = {
    operativa:    { label: "Operativa",    cls: "bg-gray-700/60 text-gray-300 border-gray-600/40" },
    planificado:  { label: "Planificado",  cls: "bg-blue-900/40 text-blue-400 border-blue-800/30" },
    en_curso:     { label: "En Curso",     cls: "bg-green-900/40 text-green-400 border-green-800/30" },
    parada:       { label: "Parada",       cls: "bg-purple-900/40 text-purple-400 border-purple-800/30" },
    mantenimiento:{ label: "Mantenimiento",cls: "bg-yellow-900/40 text-yellow-400 border-yellow-800/30" },
    falla:        { label: "Falla",        cls: "bg-red-900/40 text-red-400 border-red-800/30" },
  };
  const badgeKey = plan?.estado ?? maq.estado;
  const badge = BADGE_CONFIG[badgeKey] ?? BADGE_CONFIG.operativa;

  const estadoMensaje = {
    operativa:    "Operativa — sin producción asignada",
    mantenimiento:"En mantenimiento — sin producción activa",
    parada:       "Parada — máquina detenida temporalmente",
    falla:        "Falla detectada — requiere intervención técnica",
  };

  const fmtHoras = (seg) => {
    if (!seg || seg <= 0) return "—";
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    return h > 0 ? `${h}h ${String(m).padStart(2,"0")}m` : `${m}m`;
  };

  // Última medición del inspector (más reciente)
  const ultimaMed = mediciones[0] ?? null;

  // Datos técnicos: plan tiene prioridad, inspector como fallback
  const cavidades      = plan?.cavidades_arranque ?? ultimaMed?.cavidades ?? null;
  const pesoBrutoKg    = plan?.peso_bruto_arranque ?? (ultimaMed?.peso_bruto_gramos != null ? ultimaMed.peso_bruto_gramos / 1000 : null);
  const tiempoCicloSeg = ultimaMed?.tiempo_ciclo_seg ?? null;
  const totalUnidades  = pedido?.cantidad_unidades ?? null;

  let horaInicioFecha = null, horasRestantes = null, inicioObj = null;
  if (plan?.hora_arranque) {
    inicioObj = new Date(plan.hora_arranque.endsWith("Z") ? plan.hora_arranque : plan.hora_arranque + "Z");
    horaInicioFecha = inicioObj.toLocaleString("es-VE", {
      timeZone: "America/Caracas", day:"2-digit", month:"2-digit", year:"numeric",
      hour:"2-digit", minute:"2-digit",
    });
    if (cavidades && tiempoCicloSeg && totalUnidades) {
      const producidoActual = plan?.envases_producidos ?? 0;
      const faltante = Math.max(0, totalUnidades - producidoActual);
      const ciclos = Math.ceil(faltante / cavidades);
      const finEstimadoMs = inicioObj.getTime() + ciclos * tiempoCicloSeg * 1000;
      horasRestantes = fmtHoras(Math.max(0, (finEstimadoMs - Date.now()) / 1000));
    }
  }

  const producido    = plan?.envases_producidos ?? null;
  const totalPedido  = totalUnidades;
  const faltaUnid    = totalPedido != null ? Math.max(0, totalPedido - (producido ?? 0)) : null;
  // kg necesarios: peso real del arranque × unidades (si disponible), sino cantidad_kg del pedido
  const kgNecesarios = (pesoBrutoKg != null && totalUnidades != null)
    ? Math.round(pesoBrutoKg * totalUnidades * 10) / 10
    : pedido?.cantidad_kg ?? null;
  const kgGastados   = plan?.kg_consumidos ?? null;

  return (
    <div className={`border rounded-lg p-4 ${esOperativa ? "border-gray-700" : "border-gray-800 opacity-75"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
          <span className="text-sm font-semibold text-white">{maq.nombre}</span>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{turno}</span>
        </div>
        <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
      </div>

      {!esOperativa ? (
        <p className="text-xs text-gray-500 italic py-1">{estadoMensaje[maq.estado] ?? "Sin producción"}</p>
      ) : (
        <>
          {pedido && (
            <div className="mb-3 bg-gray-800/60 rounded-lg px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Produciendo</p>
                <p className="text-sm font-semibold text-white">{pedido.producto ?? "—"}</p>
                <p className="text-xs text-gray-500 mt-0.5">{pedido.cliente} · {pedido.numero_pedido}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { label: "Falta producir",  val: faltaUnid != null ? `${faltaUnid.toLocaleString()} u` : "—", color: faltaUnid === 0 ? "text-green-400" : "text-white" },
              { label: "Producido",       val: producido != null ? `${producido.toLocaleString()} u` : "—", color: "text-green-400" },
              { label: "Producto",        val: pedido?.producto ?? "—", color: "text-blue-400" },
              { label: "Kg necesarios",   val: kgNecesarios != null ? `${kgNecesarios.toLocaleString()} kg` : "—", color: "text-white" },
              { label: "Kg gastados",     val: kgGastados != null ? `${kgGastados.toLocaleString()} kg` : "—", color: "text-orange-400" },
              { label: "Horas restantes", val: horasRestantes ?? "—", color: horasRestantes ? "text-blue-400" : "text-gray-500" },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-gray-800 rounded p-2">
                <p className="text-gray-500 mb-0.5">{label}</p>
                <p className={`font-medium ${color}`}>{val}</p>
              </div>
            ))}

            {/* Celda inicio: fecha + hora + cronómetro según estado */}
            <div className="col-span-3 bg-gray-800 rounded p-2 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">
                  {plan?.estado === "en_curso" ? "Arrancó el" : "Arranque programado"}
                </p>
                <p className="text-gray-300 font-medium text-xs">
                  {plan?.estado === "en_curso" && horaInicioFecha
                    ? horaInicioFecha
                    : plan?.fecha_programada && plan?.hora_programada
                    ? `${plan.fecha_programada.slice(0,10).split("-").reverse().join("/")} ${plan.hora_programada}`
                    : "—"}
                </p>
              </div>
              {plan?.estado === "en_curso" && plan?.hora_arranque && (
                <div className="text-right">
                  <p className="text-gray-500 text-xs mb-0.5">Tiempo trabajado</p>
                  <Cronometro horaArranque={plan.hora_arranque} />
                </div>
              )}
              {plan?.estado === "planificado" && plan?.fecha_programada && plan?.hora_programada && (
                <CronometroArranque fechaProgramada={plan.fecha_programada} horaProgramada={plan.hora_programada} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Producción detallada por máquina ─────────────────────────────
function ProduccionPorMaquina({ maquinas, planes, pedidos, medicionesMap = {} }) {
  const reales = maquinas.filter((m) => !esTestMaquina(m.nombre));
  const turno  = getTurnoPrincipal();

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="font-semibold text-white mb-4">Producción por Máquina</h2>
      <div className="space-y-4">
        {reales.map((maq) => {
          const plan   = planes.find(p => p.maquina_id === maq.id && ["en_curso","planificado"].includes(p.estado));
          const pedido = plan ? pedidos.find(p => p.id === plan.pedido_id) : null;
          const mediciones = plan ? (medicionesMap[plan.id] ?? []) : [];
          return <TarjetaMaquina key={maq.id} maq={maq} plan={plan} pedido={pedido} turno={turno} mediciones={mediciones} />;
        })}
      </div>
    </div>
  );
}

// ── Resumen estado de máquinas ────────────────────────────────────
function MaquinasOverview({ maquinas }) {
  maquinas = maquinas.filter((m) => !esTestMaquina(m.nombre));
  const ESTADOS_MAQ = {
    operativa:    { label: "Operativa",    dot: "bg-gray-400",   badge: "bg-gray-700/60 text-gray-300 border-gray-600/40",        card: "bg-gray-800/30 border-gray-700/40"   },
    planificado:  { label: "Planificado",  dot: "bg-blue-400",   badge: "bg-blue-900/40 text-blue-400 border-blue-800/30",        card: "bg-blue-900/20 border-blue-800/40"   },
    en_curso:     { label: "En Curso",     dot: "bg-green-400",  badge: "bg-green-900/40 text-green-400 border-green-800/30",     card: "bg-green-900/20 border-green-800/40" },
    parada:       { label: "Parada",       dot: "bg-purple-400", badge: "bg-purple-900/40 text-purple-400 border-purple-800/30",  card: "bg-purple-900/20 border-purple-800/40"},
    mantenimiento:{ label: "Mantenimiento",dot: "bg-yellow-400", badge: "bg-yellow-900/40 text-yellow-400 border-yellow-800/30", card: "bg-yellow-900/20 border-yellow-800/40"},
    falla:        { label: "Falla",        dot: "bg-red-400",    badge: "bg-red-900/40 text-red-400 border-red-800/30",          card: "bg-red-900/20 border-red-800/40"     },
  };
  const conteo = { operativa:0, planificado:0, en_curso:0, parada:0, mantenimiento:0, falla:0 };
  maquinas.forEach((m) => { if (conteo[m.estado] !== undefined) conteo[m.estado]++; });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="font-semibold text-white mb-4">Estado de Máquinas</h2>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {Object.entries(ESTADOS_MAQ).map(([key, cfg]) => (
          <div key={key} className={`border rounded-lg p-2 text-center ${cfg.card}`}>
            <p className="text-xl font-bold text-white">{conteo[key]}</p>
            <p className="text-xs text-gray-400 mt-0.5">{cfg.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {maquinas.map((m) => {
          const cfg = ESTADOS_MAQ[m.estado] ?? ESTADOS_MAQ.operativa;
          return (
          <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <span className="text-sm text-gray-200">{m.nombre}</span>
            </div>
            <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
          </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Resumen usuarios ──────────────────────────────────────────────
function UsuariosOverview({ usuarios }) {
  const activos = usuarios.filter((u) => u.activo).length;
  const porRol = {};
  usuarios.forEach((u) => {
    const key = u.rol.replace(/_/g, " ");
    porRol[key] = (porRol[key] || 0) + 1;
  });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Usuarios del Sistema</h2>
        <span className="text-xs text-gray-500">{activos}/{usuarios.length} activos</span>
      </div>
      <div className="space-y-2">
        {Object.entries(porRol).map(([rol, count]) => (
          <div key={rol} className="flex items-center justify-between">
            <span className="text-sm text-gray-300 capitalize">{rol}</span>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(count / usuarios.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-4 text-right">{count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────────
export default function DashboardPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "admin";
  const location = useLocation();

  const [metricas, setMetricas] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [medicionesMap, setMedicionesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [horaActual, setHoraActual] = useState(getHoraVenezuela());

  // Reloj Venezuela — actualiza cada segundo
  useEffect(() => {
    const timer = setInterval(() => setHoraActual(getHoraVenezuela()), 1000);
    return () => clearInterval(timer);
  }, []);

  const cargar = useCallback(() => {
    const promises = [getReporteDiario(), getAlertas(true), getPlan(), getPedidos()];
    if (esAdmin) {
      promises.push(getMaquinas());
      promises.push(getUsuarios());
    }
    Promise.all(promises)
      .then((results) => {
        setMetricas(results[0].data);
        setAlertas(results[1].data.slice(0, 5));
        const planesData = results[2].data;
        setPlanes(planesData);
        setPedidos(results[3].data);
        if (esAdmin) {
          setMaquinas(results[4].data);
          setUsuarios(results[5].data);
        }
        const enCurso = planesData.filter(p => p.estado === "en_curso");
        Promise.allSettled(enCurso.map(p => getMedicionesPlan(p.id)))
          .then(res => {
            const map = {};
            enCurso.forEach((p, i) => {
              if (res[i].status === "fulfilled") map[p.id] = res[i].value.data;
            });
            setMedicionesMap(map);
          });
      })
      .catch((err) => setError(err.response?.data?.detail ?? "No se pudo conectar con el servidor"))
      .finally(() => setLoading(false));
  }, [esAdmin]);

  // Recargar al montar, al navegar de vuelta a esta página, y cada 30s
  useEffect(() => {
    cargar();
  }, [cargar, location.pathname]);

  useEffect(() => {
    const poll = setInterval(cargar, 30000);
    window.addEventListener("datos:updated", cargar);
    return () => {
      clearInterval(poll);
      window.removeEventListener("datos:updated", cargar);
    };
  }, [cargar]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 animate-pulse text-sm">Cargando datos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 text-sm font-medium mb-1">Error al cargar el inicio</p>
          <p className="text-gray-500 text-xs">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const maquinasActivas = maquinas.filter((m) => m.estado === "operativa").length;
  const turnosActivos = getTurnosActivos();

  // Formato de fecha y hora en Venezuela
  const fechaVE = horaActual.toLocaleDateString("es-ES", { dateStyle: "full" });
  const horaVE = horaActual.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Inicio</h1>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-gray-400 text-sm capitalize">{fechaVE}</span>
          <span className="px-2 py-0.5 bg-gray-800 text-white text-xs rounded-full font-mono tracking-wide">
            🕐 {horaVE} (VE)
          </span>
          {esAdmin && (
            <span className="px-2 py-0.5 bg-blue-900/40 text-blue-400 text-xs rounded-full border border-blue-800/40">
              Vista Admin
            </span>
          )}
          {turnosActivos.map((t) => (
            <span key={t} className="px-2 py-0.5 bg-gray-800 text-yellow-400 text-xs rounded-full border border-gray-700">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* KPIs del día — sin Total Ciclos */}
      <div>
        {esAdmin && <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Producción del día</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Producido"
            value={metricas ? `${metricas.total_kg_producido.toLocaleString()} kg` : "—"}
            sub={`${maquinasActivas} máquinas activas`}
            color="blue"
            icon="📦"
          />
          <StatCard
            label="Rechazo"
            value={metricas ? `${metricas.porcentaje_defectos}%` : "—"}
            sub={`${metricas?.total_defectos ?? 0} piezas rechazadas`}
            color={metricas?.porcentaje_defectos > 5 ? "red" : "green"}
            icon="⚠️"
          />
          <StatCard
            label="Rendimiento"
            value={metricas ? `${metricas.oee}%` : "—"}
            sub={`${maquinasActivas} máquinas activas · ${getTurnoPrincipal()}`}
            color={
              (metricas?.oee ?? 0) >= 85 ? "green" :
              (metricas?.oee ?? 0) >= 70 ? "yellow" : "red"
            }
            icon="📈"
          />
        </div>
      </div>

      {/* Producción detallada por máquina (admin) */}
      {esAdmin && maquinas.length > 0 && (
        <ProduccionPorMaquina maquinas={maquinas} planes={planes} pedidos={pedidos} medicionesMap={medicionesMap} />
      )}

      {/* Estado de máquinas + usuarios (admin) */}
      {esAdmin && maquinas.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MaquinasOverview maquinas={maquinas} />
          {usuarios.length > 0 && <UsuariosOverview usuarios={usuarios} />}
        </div>
      )}

      {/* Alertas activas */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Alertas Activas</h2>
          <span className="text-xs text-gray-500">
            {metricas?.alertas_activas ?? 0} sin resolver
          </span>
        </div>

        {alertas.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Sin alertas activas</p>
        ) : (
          <div className="space-y-3">
            {alertas.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                <Badge value={a.nivel} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">{a.descripcion}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(a.fecha_generacion).toLocaleString("es-ES")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
