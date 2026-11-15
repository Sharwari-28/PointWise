import { NavLink, Outlet, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Downlines from "./pages/Downlines";
import NewBill from "./pages/NewBill";
import PublicBill from "./pages/PublicBill";
import Login from "./pages/Login";
import Reports from "./pages/Reports";

function AdminLayout() {
  return (
    <>
      <nav className="navbar">
        <span className="brand">Pointwise</span>
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/downlines">Downlines</NavLink>
        <NavLink to="/new-bill">New Bill</NavLink>
        <NavLink to="/reports">Reports</NavLink>
      </nav>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/reports" element={<Reports />} />
      <Route path="/b/:token" element={<PublicBill />} />
      <Route element={<AdminLayout />}>
      <Route path="/login" element={<Login />} />.
        <Route path="/" element={<Dashboard />} />
        <Route path="/downlines" element={<Downlines />} />
        <Route path="/new-bill" element={<NewBill />} />
      </Route>
    </Routes>
  );
}
