import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="no-print border-b border-border bg-paper/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-accent font-display text-lg font-bold text-accent">
            V
          </span>
          <span>
            <span className="block font-display text-lg font-semibold leading-none">Validator Dokumen</span>
            <span className="label-mono">Verifikasi awal · UU 43/2009</span>
          </span>
        </Link>
        <nav className="flex gap-1 text-sm">
          <Link
            to="/"
            className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted"
            activeProps={{ className: "bg-muted text-foreground font-medium" }}
            activeOptions={{ exact: true }}
          >
            Periksa
          </Link>
          <Link
            to="/acuan"
            className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted"
            activeProps={{ className: "bg-muted text-foreground font-medium" }}
          >
            Data Acuan
          </Link>
        </nav>
      </div>
    </header>
  );
}
