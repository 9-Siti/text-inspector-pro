import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { DEFAULT_REFERENCE, loadReference, saveReference, type ReferenceData } from "@/lib/reference";
import { loadAcuanRemote } from "@/lib/acuan.functions";
import { validateDocument, type Laporan, type Temuan } from "@/lib/validate.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Validator Dokumen Persyaratan — Verifikasi Awal AI" },
      {
        name: "description",
        content:
          "Periksa kelengkapan, klasifikasi arsip, format persuratan, dan masa berlaku surat sebelum diajukan ke verifikator.",
      },
      { property: "og:title", content: "Validator Dokumen Persyaratan" },
      { property: "og:description", content: "Verifikasi awal surat dan berkas dengan AI dalam hitungan menit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const MAX = 10 * 1024 * 1024;

function toBase64(buf: ArrayBuffer) {
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function Index() {
  const [ref, setRef] = useState<ReferenceData>(DEFAULT_REFERENCE);
  const [docType, setDocType] = useState(DEFAULT_REFERENCE.jenisDokumen[0]?.id ?? "");
  const [teks, setTeks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Laporan[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const validate = useServerFn(validateDocument);

  useEffect(() => {
    const r = loadReference();
    setRef(r);
    if (r.jenisDokumen[0]) setDocType(r.jenisDokumen[0].id);
    loadAcuanRemote()
      .then(({ data }) => {
        if (!data) return;
        const merged = { ...DEFAULT_REFERENCE, ...data };
        saveReference(merged);
        setRef(merged);
        setDocType((cur) => (merged.jenisDokumen.some((d) => d.id === cur) ? cur : (merged.jenisDokumen[0]?.id ?? cur)));
      })
      .catch(() => {});
  }, []);

  const laporan = history[history.length - 1];

  async function run() {
    setError(null);
    const type = ref.jenisDokumen.find((d) => d.id === docType);
    if (!type) return setError("Pilih jenis dokumen.");
    if (!teks.trim() && !file) return setError("Tempel teks surat atau unggah berkas terlebih dahulu.");
    setLoading(true);
    try {
      let extra = teks;
      let payloadFile: { name: string; mime: string; base64: string } | null = null;
      if (file) {
        if (file.size > MAX) throw new Error("Ukuran berkas melebihi 10 MB.");
        const name = file.name.toLowerCase();
        if (name.endsWith(".docx")) {
          const mammoth = await import("mammoth/mammoth.browser");
          const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
          if (!value.trim()) throw new Error("Berkas DOCX tidak berisi teks yang dapat dibaca.");
          extra = (teks ? teks + "\n\n" : "") + value;
        } else if (name.endsWith(".txt") || name.endsWith(".md")) {
          extra = (teks ? teks + "\n\n" : "") + (await file.text());
        } else if (file.type === "application/pdf" || file.type.startsWith("image/")) {
          payloadFile = { name: file.name, mime: file.type, base64: toBase64(await file.arrayBuffer()) };
        } else {
          throw new Error("Jenis berkas tidak didukung. Gunakan PDF, DOCX, JPG/PNG, atau TXT.");
        }
      }
      const prev = laporan ? laporan.temuan.map((t) => `${t.judul} (${t.lokasi})`) : null;
      const result = await validate({
        data: {
          jenisDokumen: type.nama,
          persyaratan: type.persyaratan,
          klasifikasi: ref.klasifikasi,
          pedomanFormat: ref.pedomanFormat,
          dasarHukum: ref.dasarHukum,
          teks: extra || null,
          file: payloadFile,
          sebelumnya: prev,
        },
      });
      setHistory((h) => [...h, result]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pemeriksaan gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="no-print space-y-5">
          <div>
            <p className="label-mono">Langkah 1 · Masukkan dokumen</p>
            <h1 className="mt-1 text-4xl font-semibold leading-tight">
              Periksa surat <em className="text-accent">sebelum</em> diajukan.
            </h1>
            <p className="mt-3 text-muted-foreground">
              Kelengkapan, klasifikasi arsip, format persuratan, dan masa berlaku — diperiksa dalam hitungan menit.
            </p>
          </div>

          <div className="sheet space-y-4 p-5">
            <label className="block space-y-1.5">
              <span className="label-mono">Jenis dokumen / layanan</span>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full rounded-md border border-input bg-paper px-3 py-2"
              >
                {ref.jenisDokumen.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nama}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="label-mono">Tempel teks surat</span>
              <textarea
                rows={9}
                value={teks}
                onChange={(e) => setTeks(e.target.value)}
                placeholder="Nomor : 000.1.2/125/BAG.UMUM/2026&#10;Lampiran : -&#10;Hal : Undangan Rapat&#10;…"
                className="w-full rounded-md border border-input bg-paper p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
              }}
              className="cursor-pointer rounded-md border-2 border-dashed border-border p-5 text-center hover:bg-muted"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">📄 {file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  atau <span className="font-medium text-foreground underline">unggah berkas</span> — PDF, DOCX, gambar
                  pindai (maks. 10 MB)
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              onClick={run}
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Memeriksa dokumen…" : laporan ? "Periksa ulang" : "Periksa dokumen"}
            </button>
            {laporan && !loading && (
              <p className="text-center text-xs text-muted-foreground">
                Perbaiki dokumen lalu periksa ulang — hasilnya akan dibandingkan dengan pemeriksaan sebelumnya.
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Dokumen tidak disimpan. Hasil hanya ada selama halaman ini terbuka.
          </p>
        </section>

        <section>
          {loading && <Loading />}
          {!loading && laporan && <Report laporan={laporan} putaran={history.length} />}
          {!loading && !laporan && <Empty />}
        </section>
      </main>
    </div>
  );
}

function Empty() {
  return (
    <div className="sheet flex h-full min-h-96 flex-col items-center justify-center p-10 text-center">
      <span className="stamp text-muted-foreground/60">Belum diperiksa</span>
      <p className="mt-6 max-w-sm text-muted-foreground">
        Laporan verifikasi akan muncul di sini: status, skor kesiapan, temuan, dan saran perbaikan.
      </p>
    </div>
  );
}

function Loading() {
  return (
    <div className="sheet flex min-h-96 flex-col items-center justify-center gap-4 p-10">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <p className="text-muted-foreground">Mencocokkan dengan data acuan… biasanya kurang dari 2 menit.</p>
    </div>
  );
}

const statusTone: Record<Laporan["status"], string> = {
  Lolos: "text-success",
  "Perlu Perbaikan": "text-warning",
  "Tidak Lolos": "text-destructive",
};
const sevTone: Record<Temuan["keparahan"], string> = {
  kritis: "bg-destructive text-destructive-foreground",
  mayor: "bg-warning text-warning-foreground",
  minor: "bg-secondary text-secondary-foreground",
};
const reqTone = {
  terpenuhi: "text-success",
  "tidak terpenuhi": "text-destructive",
  "tidak terdeteksi": "text-warning",
} as const;

function Report({ laporan, putaran }: { laporan: Laporan; putaran: number }) {
  const sorted = [...laporan.temuan].sort(
    (a, b) => ["kritis", "mayor", "minor"].indexOf(a.keparahan) - ["kritis", "mayor", "minor"].indexOf(b.keparahan),
  );
  const m = laporan.metadata;
  return (
    <article className="sheet space-y-8 p-6 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="label-mono">Laporan verifikasi · Pemeriksaan ke-{putaran}</p>
          <span className={`stamp mt-4 text-2xl ${statusTone[laporan.status]}`}>{laporan.status}</span>
        </div>
        <div className="text-right">
          <p className="label-mono">Skor kesiapan</p>
          <p className="font-display text-6xl font-semibold leading-none">
            {laporan.skor}
            <span className="text-2xl text-muted-foreground">/100</span>
          </p>
        </div>
        <p className="w-full text-sm leading-relaxed">{laporan.ringkasan}</p>
        <div className="no-print flex w-full gap-2">
          <button onClick={() => window.print()} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
            Ekspor PDF
          </button>
        </div>
      </header>

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {(
          [
            ["Nomor", m.nomor],
            ["Tanggal", m.tanggal],
            ["Perihal", m.perihal],
            ["Tujuan", m.tujuan],
            ["Penandatangan", m.penandatangan],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt className="label-mono">{k}</dt>
            <dd className={v ? "" : "text-muted-foreground italic"}>{v ?? "tidak terdeteksi"}</dd>
          </div>
        ))}
      </dl>

      {laporan.perbandingan && (
        <section className="rounded-md bg-muted p-4">
          <h3 className="text-lg font-semibold">Perbandingan dengan pemeriksaan sebelumnya</h3>
          <div className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
            {(
              [
                ["Selesai", laporan.perbandingan.selesai, "text-success"],
                ["Masih terbuka", laporan.perbandingan.masih_terbuka, "text-warning"],
                ["Baru", laporan.perbandingan.baru, "text-destructive"],
              ] as const
            ).map(([t, list, tone]) => (
              <div key={t}>
                <p className={`label-mono ${tone}`}>
                  {t} ({list.length})
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {list.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-lg font-semibold">Klasifikasi arsip</h3>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <code className="rounded bg-muted px-2 py-1 font-mono">{laporan.klasifikasi.kode_dokumen ?? "—"}</code>
          <span
            className={
              laporan.klasifikasi.status === "benar" ? "text-success" : "font-medium text-destructive"
            }
          >
            {laporan.klasifikasi.status}
          </span>
          {laporan.klasifikasi.kode_usulan && (
            <>
              <span className="text-muted-foreground">→ usulan</span>
              <CopyChip text={laporan.klasifikasi.kode_usulan} />
            </>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{laporan.klasifikasi.alasan}</p>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Kelengkapan persyaratan</h3>
        <ul className="mt-2 divide-y divide-border text-sm">
          {laporan.persyaratan.map((p, i) => (
            <li key={i} className="flex gap-3 py-2">
              <span className={`w-32 shrink-0 font-mono text-xs uppercase ${reqTone[p.status]}`}>{p.status}</span>
              <span>
                <span className="font-medium">{p.nama}</span>
                {p.keterangan && <span className="text-muted-foreground"> — {p.keterangan}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Temuan ({sorted.length})</h3>
        {sorted.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Tidak ada temuan.</p>}
        <ol className="mt-3 space-y-3">
          {sorted.map((t, i) => (
            <li key={i} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 font-mono text-xs uppercase ${sevTone[t.keparahan]}`}>
                  {t.keparahan}
                </span>
                <span className="label-mono">{t.kategori.replace("_", " ")}</span>
                {t.perlu_cek_manual && (
                  <span className="rounded border border-accent px-2 py-0.5 font-mono text-xs uppercase text-accent">
                    perlu cek manual
                  </span>
                )}
                <span className="ml-auto font-mono text-xs text-muted-foreground">keyakinan {t.keyakinan}%</span>
              </div>
              <p className="mt-2 font-medium">{t.judul}</p>
              <p className="text-xs text-muted-foreground">Lokasi: {t.lokasi}</p>
              <p className="mt-2 text-sm">{t.saran}</p>
              {t.teks_perbaikan && (
                <div className="mt-2">
                  <CopyChip text={t.teks_perbaikan} block />
                </div>
              )}
              <p className="mt-2 text-xs italic text-muted-foreground">
                Rujukan: {t.rujukan ?? "belum ada rujukan"}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-border pt-6">
        <h3 className="text-lg font-semibold">Ringkasan serah-terima untuk verifikator</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{laporan.serah_terima}</p>
      </section>
    </article>
  );
}

function CopyChip({ text, block }: { text: string; block?: boolean }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
      title="Salin"
      className={`group rounded border border-success/40 bg-success/10 px-2 py-1 text-left font-mono text-sm hover:bg-success/20 ${block ? "block w-full whitespace-pre-wrap" : ""}`}
    >
      {text}
      <span className="no-print ml-2 text-xs text-success">{ok ? "tersalin ✓" : "salin"}</span>
    </button>
  );
}
