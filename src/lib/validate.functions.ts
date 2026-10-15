import { createServerFn } from "@tanstack/react-start";

export type Temuan = {
  kategori: "kelengkapan" | "format" | "klasifikasi" | "masa_berlaku" | "keabsahan" | "bahasa";
  judul: string;
  lokasi: string;
  keparahan: "kritis" | "mayor" | "minor";
  keyakinan: number;
  perlu_cek_manual: boolean;
  rujukan: string | null;
  saran: string;
  teks_perbaikan: string | null;
};

export type Laporan = {
  status: "Lolos" | "Perlu Perbaikan" | "Tidak Lolos";
  skor: number;
  ringkasan: string;
  metadata: {
    nomor: string | null;
    tanggal: string | null;
    perihal: string | null;
    tujuan: string | null;
    penandatangan: string | null;
  };
  persyaratan: { nama: string; status: "terpenuhi" | "tidak terpenuhi" | "tidak terdeteksi"; keterangan: string }[];
  klasifikasi: {
    kode_dokumen: string | null;
    status: "benar" | "keliru" | "tidak ada";
    kode_usulan: string | null;
    alasan: string;
  };
  temuan: Temuan[];
  perbandingan: { selesai: string[]; masih_terbuka: string[]; baru: string[] } | null;
  serah_terima: string;
};

type Input = {
  jenisDokumen: string;
  persyaratan: string;
  klasifikasi: string;
  pedomanFormat: string;
  dasarHukum: string;
  teks: string | null;
  file: { name: string; mime: string; base64: string } | null;
  sebelumnya: string[] | null;
};

const S = { type: "string" } as const;
const NS = { type: ["string", "null"] } as const;
const obj = (props: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  properties: props,
  required: Object.keys(props),
});

const schema = obj({
  status: { type: "string", enum: ["Lolos", "Perlu Perbaikan", "Tidak Lolos"] },
  skor: { type: "integer" },
  ringkasan: S,
  metadata: obj({ nomor: NS, tanggal: NS, perihal: NS, tujuan: NS, penandatangan: NS }),
  persyaratan: {
    type: "array",
    items: obj({
      nama: S,
      status: { type: "string", enum: ["terpenuhi", "tidak terpenuhi", "tidak terdeteksi"] },
      keterangan: S,
    }),
  },
  klasifikasi: obj({
    kode_dokumen: NS,
    status: { type: "string", enum: ["benar", "keliru", "tidak ada"] },
    kode_usulan: NS,
    alasan: S,
  }),
  temuan: {
    type: "array",
    items: obj({
      kategori: {
        type: "string",
        enum: ["kelengkapan", "format", "klasifikasi", "masa_berlaku", "keabsahan", "bahasa"],
      },
      judul: S,
      lokasi: S,
      keparahan: { type: "string", enum: ["kritis", "mayor", "minor"] },
      keyakinan: { type: "integer" },
      perlu_cek_manual: { type: "boolean" },
      rujukan: NS,
      saran: S,
      teks_perbaikan: NS,
    }),
  },
  perbandingan: {
    anyOf: [
      obj({
        selesai: { type: "array", items: S },
        masih_terbuka: { type: "array", items: S },
        baru: { type: "array", items: S },
      }),
      { type: "null" },
    ],
  },
  serah_terima: S,
});

export const validateDocument = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => {
    if (!input.teks?.trim() && !input.file) throw new Error("Masukkan teks surat atau unggah berkas.");
    if (input.file && input.file.base64.length > 14_000_000) throw new Error("Ukuran berkas melebihi 10 MB.");
    return input;
  })
  .handler(async ({ data }): Promise<Laporan> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Layanan AI belum dikonfigurasi.");

    const today = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });

    const instructions = `Anda adalah verifikator awal dokumen persyaratan instansi pemerintah Indonesia. Periksa dokumen secara teliti terhadap DATA ACUAN berikut, bukan pengetahuan umum. Gunakan bahasa Indonesia baku.

Tanggal hari ini: ${today}. Gunakan untuk menilai masa berlaku (dokumen melewati masa berlaku = kategori masa_berlaku, sebutkan tanggalnya).

Jenis dokumen: ${data.jenisDokumen}
DAFTAR PERSYARATAN:
${data.persyaratan}

DAFTAR KLASIFIKASI ARSIP:
${data.klasifikasi}

PEDOMAN FORMAT PERSURATAN:
${data.pedomanFormat}

DASAR HUKUM:
${data.dasarHukum}

Aturan:
- Setiap butir persyaratan diberi status terpenuhi / tidak terpenuhi / tidak terdeteksi.
- Periksa kode klasifikasi pada nomor surat terhadap daftar dan isi surat; bila keliru beri kode_usulan dan alasan dari data acuan.
- Setiap temuan wajib memiliki lokasi pada dokumen, keparahan, keyakinan 0-100, dan rujukan (butir data acuan atau pasal UU/PP). Bila tidak ada dasar acuan, isi rujukan null.
- perlu_cek_manual = true bila keyakinan < 70 atau data acuan tidak memadai.
- teks_perbaikan berisi kalimat/nomor/kode yang sudah dikoreksi dan siap salin, atau null.
- skor 0-100 kesiapan berkas. Status: Lolos bila tidak ada temuan kritis/mayor; Tidak Lolos bila ada temuan kritis yang mendasar; selain itu Perlu Perbaikan.
- Jangan menebak. Bila dokumen tidak terbaca, nyatakan di ringkasan dan beri status Tidak Lolos dengan temuan keabsahan perlu cek manual.
- serah_terima: ringkasan singkat untuk verifikator manusia (yang sudah beres dan yang masih terbuka).
- perbandingan: ${data.sebelumnya?.length ? "bandingkan dengan temuan pemeriksaan sebelumnya berikut dan isi selesai/masih_terbuka/baru:\n" + data.sebelumnya.map((t) => "- " + t).join("\n") : "isi null (pemeriksaan pertama)."}`;

    const content: unknown[] = [];
    if (data.teks?.trim()) content.push({ type: "input_text", text: "ISI DOKUMEN:\n" + data.teks });
    if (data.file) {
      if (data.file.mime === "application/pdf") {
        content.push({
          type: "input_file",
          filename: data.file.name,
          file_data: `data:application/pdf;base64,${data.file.base64}`,
        });
      } else if (data.file.mime.startsWith("image/")) {
        content.push({ type: "input_image", image_url: `data:${data.file.mime};base64,${data.file.base64}` });
      } else {
        throw new Error("Jenis berkas tidak didukung. Gunakan PDF, DOCX, gambar, atau teks.");
      }
    }
    content.push({ type: "input_text", text: "Periksa dokumen di atas dan kembalikan laporan verifikasi." });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions,
        input: [{ role: "user", content }],
        text: { format: { type: "json_schema", name: "laporan_verifikasi", strict: true, schema } },
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Terlalu banyak permintaan. Coba lagi sebentar lagi.");
      if (res.status === 402) throw new Error("Kuota AI habis. Tambahkan kredit untuk melanjutkan.");
      console.error("AI gateway error", res.status, body);
      throw new Error(`Pemeriksaan gagal (kode ${res.status}). Silakan coba lagi.`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    let failure: string | null = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const line = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta;
          else if (ev.type === "response.refusal.delta") failure = "Dokumen tidak dapat diperiksa oleh AI.";
          else if (ev.type === "response.failed" || ev.type === "error")
            failure = ev.response?.error?.message ?? ev.message ?? "Pemeriksaan gagal.";
        } catch {
          /* ignore partial */
        }
      }
    }
    if (failure) throw new Error(failure);
    try {
      return JSON.parse(text) as Laporan;
    } catch {
      throw new Error("Hasil AI tidak dapat dibaca. Silakan coba lagi.");
    }
  });
