import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

// Inyectar token JWT en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirigir a login si 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────
export const login = (email, password) =>
  api.post("/auth/login", { email, password });

export const getMe = () => api.get("/auth/me");

// ── Dashboard ─────────────────────────────────────────────────────
export const getReporteDiario = (fecha) =>
  api.get("/reportes/diario", { params: fecha ? { fecha } : {} });

// ── Máquinas ──────────────────────────────────────────────────────
export const getMaquinas = () => api.get("/maquinas");
export const actualizarMaquina = (id, data) => api.patch(`/maquinas/${id}`, data);

// ── Ciclos ────────────────────────────────────────────────────────
export const getCiclos = (maquina_id, limite = 50) =>
  api.get("/ciclos", { params: { maquina_id, limite } });

export const registrarCiclo = (data) => api.post("/ciclos/registrar", data);

// ── Alertas ───────────────────────────────────────────────────────
export const getAlertas = (noResueltas = false) =>
  api.get("/alertas", { params: { no_resueltas: noResueltas } });

export const resolverAlerta = (id, notas) => api.post(`/alertas/${id}/resolver`, notas ? { notas_resolucion: notas } : {});

// ── Defectos ──────────────────────────────────────────────────────
export const getDefectos = (ciclo_id) =>
  api.get("/defectos", { params: { ciclo_id } });

export const registrarDefecto = (data) => api.post("/defectos", data);

// ── Alertas (crear) ───────────────────────────────────────────────
export const crearAlerta = (data) => api.post("/alertas", data);

// ── Productos ─────────────────────────────────────────────────────
export const getProductos = () => api.get("/productos");
export const crearProducto = (data) => api.post("/productos", data);
export const actualizarProducto = (id, data) => api.patch(`/productos/${id}`, data);
export const eliminarProducto = (id) => api.delete(`/productos/${id}`);

// ── Pedidos ───────────────────────────────────────────────────────
export const getPedidos = () => api.get("/pedidos");
export const crearPedido = (data) => api.post("/pedidos", data);
export const actualizarPedido = (id, data) => api.patch(`/pedidos/${id}`, data);
export const eliminarPedido = (id) => api.delete(`/pedidos/${id}`);

// ── Materiales (logística) ────────────────────────────────────────
export const getMateriales = (tipo) => api.get("/materiales", { params: tipo ? { tipo } : {} });
export const crearMaterial = (data) => api.post("/materiales", data);
export const actualizarMaterial = (id, data) => api.patch(`/materiales/${id}`, data);
export const eliminarMaterial = (id) => api.delete(`/materiales/${id}`);
export const consumirMaterial = (id, cantidad) => api.post(`/materiales/${id}/consumir`, { cantidad });

// ── Planificación ─────────────────────────────────────────────────
export const getPlan = () => api.get("/plan");
export const asignarPlan = (data) => api.post("/plan", data);
export const actualizarPlan = (id, data) => api.patch(`/plan/${id}`, data);
export const quitarPlan = (id) => api.delete(`/plan/${id}`);

// ── Inspector de Producción ───────────────────────────────────────
export const getCierresTurno = (params) => api.get("/inspector/cierres", { params });
export const crearCierreTurno = (data) => api.post("/inspector/cierres", data);
export const getMediciones = (params) => api.get("/inspector/mediciones", { params });
export const getMedicionesPlan = (plan_id) => api.get("/inspector/mediciones", { params: { plan_id } });
export const crearMedicion = (data) => api.post("/inspector/mediciones", data);

// ── Usuarios (admin) ──────────────────────────────────────────────
export const getUsuarios   = () => api.get("/usuarios");
export const getDirectorio = () => api.get("/usuarios/directorio");
export const crearUsuario = (data) => api.post("/usuarios", data);
export const actualizarUsuario = (id, data) => api.patch(`/usuarios/${id}`, data);
export const resetearPassword = (id, nueva_password) =>
  api.post(`/usuarios/${id}/reset-password`, { nueva_password });
export const desactivarUsuario = (id) => api.delete(`/usuarios/${id}`);
