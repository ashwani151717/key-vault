import { NavLink } from 'react-router-dom';

const linkClass = ({ isActive }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    isActive ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
  }`;

export function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1220]/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-400 text-sm font-extrabold text-slate-950">
              KV
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Key Vault Manager</p>
            </div>
          </div>
          <nav className="flex rounded-full bg-white/10 p-1 ring-1 ring-white/10">
            <NavLink to="/" end className={linkClass}>
              View Vault
            </NavLink>
            <NavLink to="/update" className={linkClass}>
              Update Vault
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
