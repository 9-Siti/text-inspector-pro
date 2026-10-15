import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  DEFAULT_REFERENCE,
  loadReference,
  resetReference,
  saveReference,
  type ReferenceData,
} from "@/lib/reference";

export const Route = createFileRoute("/acuan")({
  head: () => ({
    meta: [
      { title: "Data Acuan — Validator Dokumen" },
      { name: "description", content: "Kelola pedoman format persuratan, klasifikasi arsip, dan daftar persyaratan dokumen." },
      { property: "og:title", content: "Data Acuan — Validator Dokumen" },
      { property: "og:description", content: "Panel admin data acuan untuk unit kearsipan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcuanPage,
});

const area =
  "w-full rounded-md border border-input bg-paper p-3 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring";

function AcuanPage() {
  const [ref, setRef] = useState<ReferenceData>(DEFAULT_REFERENCE);
  const [saved, setSaved] = useState(false);
  useEffect(() => setRef(loadReference()), []);

  const update = (patch: Partial<ReferenceData>) => {
    setRef((r) => ({ ...r, ...patch }));
    setSaved(false);
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-mono">Panel admin</p>
            <h1 className="text-4xl font-semibold">Data Acuan</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Unit kearsipan dapat memperbarui pedoman dan daftar klasifikasi di sini. Satu butir per baris.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetReference();
                setRef(DEFAULT_REFERENCE);
              }}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Kembalikan bawaan
            </button>
            <button
              onClick={() => {
                saveReference(ref);
                setSaved(true);
              }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {saved ? "Tersimpan ✓" : "Simpan"}
            </button>
          </div>
        </div>

        <section className="sheet space-y-4 p-6">
          <h2 className="text-xl font-semibold">Jenis dokumen & persyaratan</h2>
          {ref.jenisDokumen.map((d, i) => (
            <div key={d.id} className="space-y-2 border-t border-border pt-4 first:border-0 first:pt-0">
              <div className="flex gap-2">
                <input
                  value={d.nama}
                  onChange={(e) => {
                    const list = [...ref.jenisDokumen];
                    list[i] = { ...d, nama: e.target.value };
                    update({ jenisDokumen: list });
                  }}
                  className="flex-1 rounded-md border border-input bg-paper px-3 py-2 font-medium"
                />
                <button
                  onClick={() => update({ jenisDokumen: ref.jenisDokumen.filter((_, j) => j !== i) })}
                  className="rounded-md px-3 text-sm text-destructive hover:bg-muted"
                >
                  Hapus
                </button>
              </div>
              <textarea
                rows={5}
                value={d.persyaratan}
                onChange={(e) => {
                  const list = [...ref.jenisDokumen];
                  list[i] = { ...d, persyaratan: e.target.value };
                  update({ jenisDokumen: list });
                }}
                className={area}
              />
            </div>
          ))}
          <button
            onClick={() =>
              update({
                jenisDokumen: [
                  ...ref.jenisDokumen,
                  { id: crypto.randomUUID(), nama: "Jenis dokumen baru", persyaratan: "" },
                ],
              })
            }
            className="rounded-md border border-dashed border-border px-4 py-2 text-sm hover:bg-muted"
          >
            + Tambah jenis dokumen
          </button>
        </section>

        {(
          [
            ["klasifikasi", "Daftar klasifikasi arsip", 10],
            ["pedomanFormat", "Pedoman format persuratan", 9],
            ["dasarHukum", "Ringkasan dasar hukum", 6],
          ] as const
        ).map(([key, title, rows]) => (
          <section key={key} className="sheet space-y-3 p-6">
            <h2 className="text-xl font-semibold">{title}</h2>
            <textarea rows={rows} value={ref[key]} onChange={(e) => update({ [key]: e.target.value })} className={area} />
          </section>
        ))}
        <p className="text-xs text-muted-foreground">Data acuan disimpan di perangkat ini.</p>
      </main>
    </div>
  );
}
