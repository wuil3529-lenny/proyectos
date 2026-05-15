import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { getCiclos, getMaquinas, getPlan, getProductos, getPedidos, getDirectorio, getMedicionesPlan } from "../services/api";
import toast from "react-hot-toast";
import { formatPesoKg, formatPesoG } from "../utils/peso";

// ── Modal detalle producción ──────────────────────────────────────
function ModalDetalle({ planItem, pedido, producto, maquina, directorio, onClose, mediciones = [] }) {
  const [ahora, setAhora] = useState(Date.now());

  useEffect(() => {
    if (planItem.hora_finalizacion) return; // completado, no hace falta timer
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [planItem.hora_finalizacion]);

  const fmt = (iso) => {
    if (!iso) return "—";
    const s = iso.endsWith("Z") ? iso : iso + "Z";
    return new Date(s).toLocaleString("es-VE", { timeZone: "America/Caracas", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const arranque = planItem.hora_arranque ? new Date(planItem.hora_arranque.endsWith("Z") ? planItem.hora_arranque : planItem.hora_arranque + "Z") : null;
  const fin      = planItem.hora_finalizacion ? new Date(planItem.hora_finalizacion.endsWith("Z") ? planItem.hora_finalizacion : planItem.hora_finalizacion + "Z") : null;
  const durSegReal = arranque && fin ? Math.floor((fin - arranque) / 1000)
                   : arranque ? Math.floor((ahora - arranque.getTime()) / 1000)
                   : null;
  const durFmt = (s) => { if (!s) return "—"; const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); return h > 0 ? `${h}h ${m}min` : `${m}min`; };

  const kgCiclo    = planItem.cavidades_arranque && planItem.peso_bruto_arranque ? planItem.cavidades_arranque * planItem.peso_bruto_arranque : null;
  const ciclosEst  = kgCiclo && pedido?.cantidad_kg ? Math.ceil(pedido.cantidad_kg / kgCiclo) : null;
  const segCicloMaq = maquina?.tiempo_ciclo_estandar;
  const durEstSeg  = ciclosEst && segCicloMaq ? ciclosEst * segCicloMaq : null;

  const fechaEntrega = pedido?.fecha_entrega ? new Date(pedido.fecha_entrega.endsWith("Z") ? pedido.fecha_entrega : pedido.fecha_entrega + "Z") : null;
  let cumplimiento = null;
  if (fin && fechaEntrega) {
    const diffH = Math.round((fechaEntrega - fin) / 3600000);
    cumplimiento = diffH >= 0
      ? { ok: true,  label: `Entregado ${diffH >= 24 ? Math.floor(diffH/24)+"d " : ""}${diffH%24}h antes` }
      : { ok: false, label: `Retrasado ${Math.abs(diffH) >= 24 ? Math.floor(Math.abs(diffH)/24)+"d " : ""}${Math.abs(diffH)%24}h` };
  }

  let puntualidad = null;
  if (arranque && planItem.fecha_programada && planItem.hora_programada) {
    const est   = new Date(planItem.fecha_programada.slice(0,10) + "T" + planItem.hora_programada + ":00Z");
    const diffM = Math.round((arranque - est) / 60000);
    puntualidad = Math.abs(diffM) <= 5 ? { ok: true, label: "Arrancó puntual" }
      : diffM > 0 ? { ok: false, label: `Arrancó ${diffM}min tarde` }
      : { ok: true, label: `Arrancó ${Math.abs(diffM)}min antes` };
  }

  const inspProd = planItem.inspector_produccion_id ? directorio.find(u => u.id === planItem.inspector_produccion_id) : null;
  const inspCal  = planItem.inspector_calidad_id    ? directorio.find(u => u.id === planItem.inspector_calidad_id)    : null;
  const personal = planItem.personal_adicional ? (() => { try { return JSON.parse(planItem.personal_adicional); } catch { return []; } })() : [];

  // Última medición registrada (la más reciente, cualquier tipo) = fuente de verdad
  const ultimaMed = mediciones[0] ?? null; // ya vienen ordenadas desc por fecha_registro

  const cavidades     = ultimaMed?.cavidades ?? planItem.cavidades_arranque ?? null;
  const pesoBrutoKg   = ultimaMed?.peso_bruto_gramos != null ? ultimaMed.peso_bruto_gramos / 1000
                        : planItem.peso_bruto_arranque ?? null;
  const tiempoCicloReal = ultimaMed?.tiempo_ciclo_seg ?? null;
  const tempReal      = ultimaMed?.temperatura ?? null;
  const pesoNetoG     = ultimaMed?.peso_neto_gramos ?? null;

  // Recalcular con los datos más recientes
  const kgCicloReal   = cavidades && pesoBrutoKg ? cavidades * pesoBrutoKg : null;
  const ciclosEstReal = kgCicloReal && pedido?.cantidad_kg ? Math.ceil(pedido.cantidad_kg / kgCicloReal) : null;
  const durEstSegReal = ciclosEstReal && tiempoCicloReal ? ciclosEstReal * tiempoCicloReal : null;
  const ultimaActualizacion = ultimaMed
    ? new Date(ultimaMed.fecha_registro + "Z").toLocaleString("es-VE", { timeZone: "America/Caracas", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  const Fila = ({ label, value, color }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-800/50">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-medium ${color ?? "text-gray-200"}`}>{value ?? "—"}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="font-semibold text-white">Detalle de producción</h3>
            <p className="text-xs text-gray-500 mt-0.5">{pedido?.numero_pedido} — {pedido?.cliente}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>

        <div className="p-6 space-y-5 text-sm">

          {/* Badges cumplimiento */}
          {(cumplimiento || puntualidad) && (
            <div className="flex gap-3">
              {cumplimiento && (
                <div className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-semibold text-center border ${cumplimiento.ok ? "bg-green-900/20 border-green-700/30 text-green-400" : "bg-red-900/20 border-red-700/30 text-red-400"}`}>
                  {cumplimiento.ok ? "✓" : "✗"} {cumplimiento.label}
                </div>
              )}
              {puntualidad && (
                <div className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-semibold text-center border ${puntualidad.ok ? "bg-blue-900/20 border-blue-700/30 text-blue-400" : "bg-orange-900/20 border-orange-700/30 text-orange-400"}`}>
                  {puntualidad.label}
                </div>
              )}
            </div>
          )}

          {/* Pedido info */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pedido</p>
            <Fila label="Producto"          value={pedido?.producto} />
            <Fila label="Cliente"           value={pedido?.cliente} />
            <Fila label="Unidades pedido"   value={pedido?.cantidad_unidades?.toLocaleString() + " u"} />
            <Fila label="Kg pedido"         value={pedido?.cantidad_kg?.toLocaleString() + " kg"} />
            {pedido?.prioridad === "urgente" && <Fila label="Prioridad" value="Urgente" color="text-red-400" />}
          </div>

          {/* TIEMPOS — arriba */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tiempos</p>
            <Fila label="Fecha entrega requerida"  value={pedido?.fecha_entrega ? new Date(pedido.fecha_entrega).toLocaleDateString("es-VE") : null} />
            <Fila label="Hora estipulada arranque" value={planItem.fecha_programada && planItem.hora_programada ? planItem.fecha_programada.slice(0,10) + " " + planItem.hora_programada : null} />
            <Fila label="Arranque real"            value={fmt(planItem.hora_arranque)} color="text-yellow-400" />
            {(() => {
              const durSeg = durEstSegReal ?? durEstSeg;
              if (fin) return <Fila label="Finalización" value={`${fmt(planItem.hora_finalizacion)} · ${durFmt(durSegReal)}`} color="text-green-400" />;
              if (arranque && durSeg) {
                const proyectado = new Date(arranque.getTime() + durSeg * 1000);
                return <Fila label="Finalización estimada" value={`${fmt(proyectado.toISOString())} · ${durFmt(durSeg)}`} color="text-amber-400" />;
              }
              return null;
            })()}
            {arranque && (
              <div className="flex justify-between items-center py-1.5 border-b border-gray-800/50">
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Transcurrido</p>
                    <p className="text-xs font-mono font-semibold text-blue-300">{durFmt(durSegReal)}</p>
                  </div>
                  {!fin && (() => {
                    const durSeg = durEstSegReal ?? durEstSeg;
                    if (!durSeg) return null;
                    const restSeg = Math.max(0, durSeg - (durSegReal ?? 0));
                    return (
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Restante</p>
                        <p className={`text-xs font-mono font-semibold ${restSeg === 0 ? "text-red-400" : "text-amber-300"}`}>
                          {restSeg === 0 ? "Retrasado" : durFmt(restSeg)}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* REFERENCIA DEL PRODUCTO — encima de datos técnicos */}
          {producto && (
            <div className="bg-gray-800/40 border border-gray-700/40 rounded-lg px-3 py-2.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Referencia del producto</p>
              <Fila label="Cavidades ref."   value={producto.cavidades} />
              <Fila label="Peso neto ref."   value={`${(producto.peso_env_min * 1000).toFixed(0)}–${(producto.peso_env_max * 1000).toFixed(0)} g`} color="text-gray-400" />
              <Fila label="Peso bruto ref."  value={`${(producto.peso_bruto_min * 1000).toFixed(0)}–${(producto.peso_bruto_max * 1000).toFixed(0)} g`} color="text-gray-400" />
              <Fila label="Temperatura ref." value={`${producto.temp_min}–${producto.temp_max} °C`} color="text-gray-400" />
            </div>
          )}

          {/* DATOS TÉCNICOS — bloque unificado */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Datos técnicos</p>
              {ultimaActualizacion && <span className="text-xs text-gray-500">Últ. actualización · {ultimaActualizacion}</span>}
            </div>

            {/* Máquina y mediciones */}
            <Fila label="Máquina"      value={maquina?.nombre} />
            {producto?.molde && <Fila label="Molde" value={producto.molde} />}
            <Fila label="Ciclo actual" value={tiempoCicloReal != null ? `${tiempoCicloReal} seg` : segCicloMaq ? `${segCicloMaq} s/ciclo (estándar)` : null} color={tiempoCicloReal ? "text-green-300" : "text-gray-200"} />
            <Fila label="Cavidades"    value={cavidades} color={ultimaMed?.cavidades ? "text-green-300" : "text-gray-200"} />
            <Fila label="Temperatura"  value={tempReal != null ? `${tempReal} °C` : null} color="text-orange-300" />
            <Fila label="Peso neto"    value={formatPesoG(pesoNetoG)} color="text-blue-300" />
            <Fila label="Peso bruto"   value={formatPesoKg(pesoBrutoKg)} color={ultimaMed?.peso_bruto_gramos ? "text-green-300" : "text-gray-200"} />
            <Fila label="Ciclos estimados" value={ciclosEstReal?.toLocaleString()} />
            {(() => {
              const total = pedido?.cantidad_unidades ?? ciclosEstReal;
              const pesoG = ultimaMed?.peso_bruto_gramos ?? (pesoBrutoKg != null ? pesoBrutoKg * 1000 : null);
              const kgNecesarios = total && pesoG ? ((total * pesoG) / 1000).toFixed(1) : null;
              return <Fila label="Kg necesarios" value={kgNecesarios ? `${kgNecesarios} kg` : null} color="text-cyan-300" />;
            })()}
            <Fila label="Resina"    value={planItem.resina_asignada}  color="text-yellow-400" />
            <Fila label="Colorante" value={planItem.colorante_asignado} color="text-yellow-400" />

            {/* Resultados de producción */}
            <div className="mt-3 pt-3 border-t border-gray-800/50">
              <Fila label="Envases fabricados" value={planItem.envases_producidos ? planItem.envases_producidos.toLocaleString() + " u" : null} color="text-green-400" />
              <Fila label="Índice de rechazo"  value={planItem.indice_rechazo != null ? planItem.indice_rechazo + "%" + (planItem.envases_producidos ? ` ≈ ${Math.round(planItem.envases_producidos * planItem.indice_rechazo / 100)} u rechazadas` : "") : null} color={planItem.indice_rechazo > 5 ? "text-red-400" : "text-gray-200"} />
              <Fila label="Kg consumidos"      value={planItem.kg_consumidos ? planItem.kg_consumidos.toLocaleString("es-VE") + " kg" : null} color="text-blue-400" />
            </div>

          </div>

          {ultimaMed && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Última actualización:
                </p>
                <span className="text-xs font-semibold text-white">
                  {ultimaMed.inspector_nombre ?? "—"}
                </span>
                <span className={`ml-auto text-xs font-semibold ${ultimaMed.tipo === "arranque" ? "text-green-400" : "text-purple-400"}`}>
                  {ultimaMed.tipo === "arranque" ? "🚀 Arranque" : "⏱ Medición"} ·{" "}
                  {new Date(ultimaMed.fecha_registro + "Z").toLocaleString("es-VE", { timeZone: "America/Caracas", hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {new Date(ultimaMed.fecha_registro + "Z").toLocaleDateString("es-VE", { timeZone: "America/Caracas", day: "2-digit", month: "2-digit" })}
                </span>
              </div>
              <div className={`rounded-lg px-3 py-3 ${ultimaMed.tipo === "arranque" ? "bg-green-900/10 border border-green-800/20" : "bg-purple-900/10 border border-purple-800/20"}`}>
                {ultimaMed.tiempo_ciclo_seg != null && <Fila label="Tiempo ciclo" value={`${ultimaMed.tiempo_ciclo_seg} seg`} color="text-purple-300" />}
                {ultimaMed.temperatura != null && <Fila label="Temperatura" value={`${ultimaMed.temperatura} °C`} color="text-orange-300" />}
                {ultimaMed.peso_neto_gramos != null && <Fila label="Peso neto" value={formatPesoG(ultimaMed.peso_neto_gramos)} color="text-blue-300" />}
                {ultimaMed.peso_bruto_gramos != null && <Fila label="Peso bruto" value={formatPesoG(ultimaMed.peso_bruto_gramos)} color="text-cyan-300" />}
                {ultimaMed.cavidades != null && <Fila label="Cavidades" value={ultimaMed.cavidades} color="text-yellow-300" />}
                {ultimaMed.piezas_por_hora != null && <Fila label="Piezas/hora" value={ultimaMed.piezas_por_hora.toLocaleString()} color="text-green-300" />}
                {ultimaMed.faltante != null && <Fila label="Faltante" value={`${ultimaMed.faltante.toLocaleString()} uds`} />}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Personal del turno</p>
            <Fila label="Inspector producción" value={inspProd?.nombre_completo} />
            <Fila label="Inspector calidad"    value={inspCal?.nombre_completo} />
            {personal.length > 0 && (
              <div className="pt-1.5">
                <p className="text-xs text-gray-500 mb-1.5">Personal adicional</p>
                <div className="flex flex-wrap gap-1.5">
                  {personal.map((p, i) => (
                    <span key={i} className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                      {p.nombre} <span className="text-gray-600">· {p.rol?.replace(/_/g, " ")}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-5">
          <button onClick={onClose} className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function DatosPage() {
  const location = useLocation();
  const [tab, setTab]             = useState("producciones");
  const [ciclos, setCiclos]       = useState([]);
  const [maquinas, setMaquinas]   = useState([]);
  const [plan, setPlan]           = useState([]);
  const [pedidos, setPedidos]     = useState([]);
  const [productos, setProductos] = useState([]);
  const [directorio, setDirectorio] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filtroMaquina, setFiltroMaquina] = useState("");
  const [busqueda, setBusqueda]   = useState("");
  const [detalle, setDetalle]     = useState(null);
  const [detalleMediciones, setDetalleMediciones] = useState([]);
  const [medicionesMap, setMedicionesMap] = useState({});

  const loadCiclos = (mid) =>
    getCiclos(mid || undefined, 100)
      .then(r => setCiclos(r.data))
      .catch(() => toast.error("Error al cargar ciclos"));

  const cargar = useCallback(() => {
    Promise.all([getMaquinas(), loadCiclos(), getPlan(), getPedidos(), getProductos(), getDirectorio()])
      .then(([rMaq, , rPlan, rPed, rProd, rDir]) => {
        setMaquinas(rMaq.data);
        const planesData = rPlan.data;
        setPlan(planesData);
        setPedidos(rPed.data);
        setProductos(rProd.data);
        setDirectorio(rDir.data);
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
      .catch(() => toast.error("Error al cargar datos"))
      .finally(() => setLoading(false));
  }, []);

  // Recargar al montar y cada vez que el usuario navega a esta página
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

  const handleFiltro = (mid) => { setFiltroMaquina(mid); loadCiclos(mid); };

  const pedMap  = Object.fromEntries(pedidos.map(p => [p.id, p]));
  const maqMap  = Object.fromEntries(maquinas.map(m => [m.id, m]));
  // plan_produccion indexado por pedido_id (último plan por pedido)
  const planPorPedido = Object.fromEntries(plan.map(pl => [pl.pedido_id, pl]));

  // Fuente: TODOS los pedidos, cruzados con su plan si existe
  const prodFiltradas = pedidos.filter(ped => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    const pl = planPorPedido[ped.id];
    return (ped.numero_pedido ?? "").toLowerCase().includes(q)
      || (ped.cliente ?? "").toLowerCase().includes(q)
      || (ped.producto ?? "").toLowerCase().includes(q)
      || (maqMap[pl?.maquina_id]?.nombre ?? "").toLowerCase().includes(q);
  });

  const fmtFecha = (iso) => {
    if (!iso) return "—";
    const s = iso.endsWith("Z") ? iso : iso + "Z";
    return new Date(s).toLocaleString("es-VE", { timeZone: "America/Caracas", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Datos</h1>
          <p className="text-gray-400 text-sm mt-0.5">Registro histórico de producción</p>
        </div>
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
          {[
            { key: "producciones", label: `Producciones (${pedidos.length})` },
            { key: "ciclos",       label: "Ciclos sensor" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab === key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: PRODUCCIONES ── */}
      {tab === "producciones" && (
        <>
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por pedido, cliente, producto, máquina…"
            className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500" />

          {loading ? (
            <div className="text-gray-400 animate-pulse py-10 text-center">Cargando…</div>
          ) : prodFiltradas.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl py-14 text-center text-gray-500">
              {pedidos.length === 0 ? "Sin pedidos registrados aún" : "Sin resultados para la búsqueda"}
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
                  <tr>
                    {["Pedido", "Cliente / Producto", "Máquina", "Estado", "A producir", "Producidos", "Rechazo", "Arranque", "Horas restantes", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prodFiltradas
                    .sort((a, b) => new Date(b.fecha_pedido ?? b.created_at ?? 0) - new Date(a.fecha_pedido ?? a.created_at ?? 0))
                    .map(ped => {
                      const pl   = planPorPedido[ped.id];
                      const maq  = maqMap[pl?.maquina_id];
                      const fent = ped.fecha_entrega ? new Date(ped.fecha_entrega) : null;
                      const ffin = pl?.hora_finalizacion ? new Date(pl.hora_finalizacion.endsWith("Z") ? pl.hora_finalizacion : pl.hora_finalizacion + "Z") : null;
                      const aTiempo = fent && ffin ? ffin <= fent : null;
                      const ESTADO_BADGE = {
                        planificado: "bg-blue-900/40 text-blue-400 border-blue-700/30",
                        en_curso:    "bg-green-900/40 text-green-400 border-green-700/30",
                        completado:  "bg-green-900/40 text-green-400 border-green-700/30",
                      };
                      const estadoPlan = pl?.estado ?? "sin_asignar";
                      const estadoBadge = ESTADO_BADGE[estadoPlan] ?? "bg-gray-800/60 text-gray-500 border-gray-700";
                      const estadoLabel = { planificado:"Planificado", en_curso:"En curso", completado:"Completado", sin_asignar:"Sin asignar" }[estadoPlan] ?? estadoPlan;

                      // Calcular "A producir" y finalización estimada
                      const ultimaMed = pl ? (medicionesMap[pl.id] ?? [])[0] ?? null : null;
                      const cavidades   = pl?.cavidades_arranque ?? ultimaMed?.cavidades ?? null;
                      const pesoBrutoKg = pl?.peso_bruto_arranque ?? (ultimaMed?.peso_bruto_gramos != null ? ultimaMed.peso_bruto_gramos / 1000 : null);
                      const cicloSeg    = ultimaMed?.tiempo_ciclo_seg ?? maq?.tiempo_ciclo_estandar ?? null;
                      const aProducir   = ped.cantidad_unidades
                        ?? (ped.cantidad_kg && pesoBrutoKg ? Math.ceil(ped.cantidad_kg / pesoBrutoKg) : null);
                      // Finalización estimada para planes en curso sin fecha real
                      let finEstimada = null;
                      if (!ffin && pl?.hora_arranque && cavidades && pesoBrutoKg && cicloSeg && ped.cantidad_kg) {
                        const kgCiclo = cavidades * pesoBrutoKg;
                        const durSeg  = kgCiclo > 0 ? Math.ceil(ped.cantidad_kg / kgCiclo) * cicloSeg : null;
                        if (durSeg) {
                          const arr = new Date(pl.hora_arranque.endsWith("Z") ? pl.hora_arranque : pl.hora_arranque + "Z");
                          finEstimada = new Date(arr.getTime() + durSeg * 1000);
                        }
                      }
                      return (
                        <tr key={ped.id} className="border-t border-gray-800 hover:bg-gray-800/40">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-blue-400">{ped.numero_pedido}</span>
                            {ped.prioridad === "urgente" && <span className="ml-1 text-red-400 text-xs">🔴</span>}
                            {aTiempo !== null && (
                              <span className={`ml-1 text-xs ${aTiempo ? "text-green-500" : "text-red-400"}`}>
                                {aTiempo ? "✓" : "✗"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-white font-medium text-xs">{ped.cliente ?? "—"}</p>
                            <p className="text-gray-500 text-xs">{ped.producto}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-300 text-xs">{maq?.nombre ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${estadoBadge}`}>
                              {estadoLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-white">
                            {aProducir != null ? aProducir.toLocaleString() + " u" : <span className="text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-green-400 text-xs font-semibold">
                            {pl?.envases_producidos ? pl.envases_producidos.toLocaleString() + " u" : <span className="text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {pl?.indice_rechazo != null
                              ? <span className={pl.indice_rechazo > 5 ? "text-red-400" : "text-gray-300"}>{pl.indice_rechazo}%</span>
                              : <span className="text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtFecha(pl?.hora_arranque)}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {ffin
                              ? <span className="text-green-400">Completado</span>
                              : finEstimada
                                ? (() => {
                                    const diffMs = finEstimada.getTime() - Date.now();
                                    if (diffMs <= 0) return <span className="text-red-400">Retrasado</span>;
                                    const h = Math.floor(diffMs / 3600000);
                                    const m = Math.round((diffMs % 3600000) / 60000);
                                    return <span className="text-amber-400">~{h > 0 ? `${h}h ${m}min` : `${m}min`}</span>;
                                  })()
                                : <span className="text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {pl && (
                              <button onClick={() => {
                                setDetalle(pl);
                                setDetalleMediciones([]);
                                getMedicionesPlan(pl.id).then(r => setDetalleMediciones(r.data)).catch(() => {});
                              }}
                                className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 rounded-lg whitespace-nowrap">
                                Ver más
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── TAB: CICLOS SENSOR ── */}
      {tab === "ciclos" && (
        <>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handleFiltro("")}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${!filtroMaquina ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              Todas
            </button>
            {maquinas.map(m => (
              <button key={m.id} onClick={() => handleFiltro(m.id)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filtroMaquina === m.id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {m.nombre}
              </button>
            ))}
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
                <tr>
                  {["Producto", "Máquina", "Ciclo (seg)", "Peso Bruto", "Peso Neto", "Temp °C", "Fecha"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Cargando…</td></tr>
                ) : ciclos.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Sin datos registrados</td></tr>
                ) : (
                  ciclos.map(c => (
                    <tr key={c.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-white font-medium">{c.producto ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-300">{maquinas.find(m => m.id === c.maquina_id)?.nombre ?? `Máq. ${c.maquina_id}`}</td>
                      <td className="px-4 py-3 text-gray-300">{c.numero_ciclo}s</td>
                      <td className="px-4 py-3 text-gray-300">{c.peso_kg} kg</td>
                      <td className="px-4 py-3 text-gray-300">{c.peso_neto_kg ?? "—"}{c.peso_neto_kg ? " kg" : ""}</td>
                      <td className="px-4 py-3 text-gray-500">{c.temperatura_proceso ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(c.timestamp).toLocaleString("es-ES")}
                        {c.modo_prueba && <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">prueba</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {detalle && (
        <ModalDetalle
          planItem={detalle}
          pedido={pedMap[detalle.pedido_id]}
          producto={productos.find(p => p.id === pedMap[detalle.pedido_id]?.producto_id) ?? null}
          maquina={maqMap[detalle.maquina_id] ?? null}
          directorio={directorio}
          mediciones={detalleMediciones}
          onClose={() => { setDetalle(null); setDetalleMediciones([]); }}
        />
      )}
    </div>
  );
}
