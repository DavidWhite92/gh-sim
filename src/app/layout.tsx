import Link from "next/link";
import "./globals.css";
import ThemeGate from "./ThemeGate";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <style>{`
          /* Tema claro: overrides mínimos usando data-theme en <html> */
          html[data-theme="light"] body { background: #fff; color: #111; }
          html[data-theme="light"] .bg { display: none; }
          html[data-theme="light"] .topbar {
            background: rgba(255,255,255,0.85);
            border-bottom: 1px solid rgba(0,0,0,0.08);
            backdrop-filter: blur(10px);
          }
          html[data-theme="light"] .footer { color: rgba(0,0,0,0.65); }
          html[data-theme="light"] .muted { color: rgba(0,0,0,0.65); }

          html[data-theme="light"] .card {
            background: #fff;
            border: 1px solid rgba(0,0,0,0.08);
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          }

          html[data-theme="light"] .btn {
            background: rgba(0,0,0,0.06);
            color: #111;
            border: 1px solid rgba(0,0,0,0.12);
          }
          html[data-theme="light"] .btn:hover { background: rgba(0,0,0,0.09); }
          html[data-theme="light"] .btnPrimary {
            background: #111;
            color: #fff;
            border-color: #111;
          }

          /* Badges/chips (nombres, conteos, nominaciones): en claro deben leerse en negro */
          html[data-theme="light"] .badge {
            color: #111;
            background: rgba(0,0,0,0.04);
            border: 1px solid rgba(0,0,0,0.12);
          }
          html[data-theme="light"] .badge b { color: #111; }

          /* Tabla: texto oscuro y bordes visibles en claro */
          html[data-theme="light"] .table { color: #111; }
          html[data-theme="light"] .table th,
          html[data-theme="light"] .table td { border-color: rgba(0,0,0,0.12) !important; }
          html[data-theme="light"] .table thead th {
            background: rgba(0,0,0,0.03);
            color: #111;
          }
          html[data-theme="light"] .summaryRow td,
          html[data-theme="light"] .summaryRow span { color: #111; }
        `}</style>
      </head>
      <body>
        <ThemeGate>
          <div className="bg" />
          <div className="appShell">
            <header className="topbar">
              <Link href="/" className="brand" style={{ color: "inherit", textDecoration: "none" }} aria-label="GH Simulator · Inicio">
                <div className="logoDot" />
                <div>
                  <div className="brandTitle">GH Simulator</div>
                  <div className="brandSub">Simulador</div>
                </div>
              </Link>
            </header>

            <main className="container">{children}</main>

            <footer className="footer">
              <span>© {new Date().getFullYear()} · Simulador GH</span>
            </footer>
          </div>
        </ThemeGate>
      </body>
    </html>
  );
}
