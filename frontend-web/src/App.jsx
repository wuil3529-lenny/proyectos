import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MaquinasPage from "./pages/MaquinasPage";
import DatosPage from "./pages/CiclosPage";
import AlertasPage from "./pages/AlertasPage";
import ProductosPage from "./pages/ReportesPage";
import PedidosPage from "./pages/PedidosPage";
import PlanificacionPage from "./pages/PlanificacionPage";
import MaterialesPage from "./pages/MaterialesPage";
import UsuariosPage from "./pages/UsuariosPage";
import InspectorPage from "./pages/InspectorPage";
import Layout from "./components/Layout";

function PrivateRoute({ children }) {
  const { usuario } = useAuth();
  return usuario ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== "admin") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="maquinas" element={<MaquinasPage />} />
          <Route path="datos" element={<DatosPage />} />
          <Route path="alertas" element={<AlertasPage />} />
          <Route path="productos" element={<ProductosPage />} />
          <Route path="pedidos" element={<PedidosPage />} />
          <Route path="planificacion" element={<PlanificacionPage />} />
          <Route path="materiales" element={<MaterialesPage />} />
          <Route path="inspector" element={<InspectorPage />} />
          <Route
            path="usuarios"
            element={
              <AdminRoute>
                <UsuariosPage />
              </AdminRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
