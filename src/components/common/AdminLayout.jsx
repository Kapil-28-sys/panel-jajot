import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { SidebarProvider, useSidebar } from "../../context/SidebarContext";

function Shell({ children }) {
  const location = useLocation();
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))] text-ink-950">
      <Sidebar />
      <div
        className="flex min-h-screen min-w-0 flex-1 flex-col transition-[padding] duration-200 md:pl-[var(--sidebar-current-w)]"
        style={{ "--sidebar-current-w": collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)" }}
      >
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div key={location.pathname} className="mx-auto w-full animate-slide-up" style={{ maxWidth: "var(--container-w)" }}>
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <SidebarProvider>
      <Shell>{children}</Shell>
    </SidebarProvider>
  );
}
