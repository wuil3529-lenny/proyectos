import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Grupos de roles
const LOGISTICA  = ["jefe_logistica", "operario_logistica"];
const CALIDAD    = ["jefe_calidad", "inspector_calidad"];
const VENTAS     = ["jefe_ventas", "vendedor"];
const PRODUCCION = ["jefe_produccion", "inspector_produccion", "molinero"];
const TECNICO    = ["jefe_tecnico", "tecnico"];

function buildNav(rol) {
  const is  = (...roles) => roles.flat().includes(rol);
  const not = (...roles) => !roles.flat().includes(rol);

  const nav = [];

  // Inicio — todos
  nav.push({ to: "/",              label: "Inicio",        icon: "🏠" });

  // Máquinas — todos excepto logística, calidad, ventas
  if (rol === "admin" || is(PRODUCCION, TECNICO))
    nav.push({ to: "/maquinas",    label: "Máquinas",      icon: "⚙️" });

  // Datos — todos (solo lectura)
  nav.push({ to: "/datos",         label: "Datos",         icon: "🔄" });

  // Alertas — todos
  nav.push({ to: "/alertas",       label: "Alertas",       icon: "🔔" });

  // Productos — calidad + admin
  if (rol === "admin" || is(CALIDAD))
    nav.push({ to: "/productos",   label: "Productos",     icon: "📦" });

  // Pedidos — ventas + admin
  if (rol === "admin" || is(VENTAS))
    nav.push({ to: "/pedidos",     label: "Pedidos",       icon: "🛒" });

  // Planificación — producción + admin
  if (rol === "admin" || is(PRODUCCION))
    nav.push({ to: "/planificacion", label: "Planificación", icon: "📋" });

  // Inspector — inspector_produccion + admin
  if (rol === "admin" || is(PRODUCCION))
    nav.push({ to: "/inspector", label: "Inspector", icon: "🔍" });

  // Materiales — logística + admin
  if (rol === "admin" || is(LOGISTICA))
    nav.push({ to: "/materiales",  label: "Materiales",    icon: "🧪" });

  // Usuarios — solo admin
  if (rol === "admin")
    nav.push({ to: "/usuarios",    label: "Usuarios",      icon: "👥" });

  return nav;
}

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate            = useNavigate();
  const NAV                 = buildNav(usuario?.rol ?? "");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏭</span>
            <div>
              <p className="font-bold text-white text-sm leading-tight">Plataforma</p>
              <p className="text-xs text-gray-400">Industrial</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
              {usuario?.nombre_completo?.[0] ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{usuario?.nombre_completo}</p>
              <p className="text-xs text-gray-400 truncate">{usuario?.rol?.replace(/_/g, " ")}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors text-left px-1"
          >
            Cerrar sesión →
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto min-h-0">
        <Outlet />
      </main>
    </div>
  );
}
