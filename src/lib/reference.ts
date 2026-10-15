export type DocType = { id: string; nama: string; persyaratan: string };
export type ReferenceData = {
  jenisDokumen: DocType[];
  klasifikasi: string;
  pedomanFormat: string;
  dasarHukum: string;
};

export const DEFAULT_REFERENCE: ReferenceData = {
  jenisDokumen: [
    {
      id: "surat-dinas",
      nama: "Surat Dinas",
      persyaratan:
        "Kop surat instansi\nNomor surat sesuai format\nTanggal surat\nSifat dan lampiran\nPerihal/hal\nTujuan surat\nIsi surat\nNama, jabatan, dan tanda tangan penandatangan\nCap dinas\nTembusan (bila ada)",
    },
    {
      id: "nota-dinas",
      nama: "Nota Dinas",
      persyaratan:
        "Kepala nota dinas\nYth. (tujuan)\nDari\nTembusan (bila ada)\nTanggal\nNomor\nSifat\nLampiran\nHal\nIsi\nNama dan jabatan penandatangan",
    },
    {
      id: "surat-keputusan",
      nama: "Surat Keputusan",
      persyaratan:
        "Kop/lambang\nNomor keputusan\nJudul TENTANG\nKonsiderans Menimbang\nDasar hukum Mengingat\nDiktum MEMUTUSKAN/MENETAPKAN\nTempat dan tanggal penetapan\nNama, jabatan, tanda tangan pejabat\nSalinan/tembusan",
    },
    {
      id: "permohonan-layanan",
      nama: "Berkas Permohonan Layanan",
      persyaratan:
        "Surat permohonan bertanda tangan\nFotokopi KTP masih berlaku\nSurat keterangan pendukung berlaku maksimal 6 bulan sejak terbit\nPas foto (bila diminta)\nMaterai pada surat pernyataan",
    },
  ],
  klasifikasi:
    "000 Umum\n000.1 Ketatausahaan dan kerumahtanggaan\n000.1.2 Persuratan\n000.2 Perlengkapan\n000.5 Perencanaan\n000.7 Kearsipan\n000.8 Organisasi dan tata laksana\n100 Pemerintahan\n200 Politik\n300 Keamanan dan ketertiban\n400 Kesejahteraan rakyat\n500 Perekonomian\n600 Pekerjaan umum\n700 Pengawasan\n800 Kepegawaian\n800.1 Formasi dan pengadaan pegawai\n800.2 Mutasi\n800.3 Kesejahteraan pegawai\n900 Keuangan",
  pedomanFormat:
    "Format nomor surat: [Kode Klasifikasi]/[Nomor Urut]/[Kode Unit]/[Tahun], contoh 000.1.2/125/BAG.UMUM/2026.\nTanggal ditulis lengkap: tempat, tanggal bulan (huruf) tahun, contoh Jakarta, 15 Oktober 2026.\nPerihal singkat, jelas, diawali huruf kapital.\nLampiran ditulis jumlah dan satuan (1 berkas, 2 lembar) atau tanda '-'.\nTujuan diawali 'Yth.' diikuti jabatan, bukan nama orang.\nPenandatangan: jabatan, tanda tangan, nama lengkap tanpa gelar kepangkatan di baris terpisah, NIP bila ASN.\nTembusan tanpa kata 'Yth.' dan tidak mencantumkan 'arsip'.\nBahasa Indonesia baku sesuai EYD.",
  dasarHukum:
    "UU No. 43 Tahun 2009 tentang Kearsipan: arsip harus autentik, terpercaya, utuh, dan dapat digunakan; pencipta arsip wajib membuat dan menyimpan arsip dinamis (Pasal 40); klasifikasi arsip sebagai dasar pengelolaan arsip dinamis.\nPP No. 28 Tahun 2012 tentang Pelaksanaan UU 43/2009: pembuatan arsip mengikuti tata naskah dinas; klasifikasi arsip, jadwal retensi, dan sistem klasifikasi keamanan dan akses (Pasal 40-41); penggunaan klasifikasi arsip dalam penomoran naskah dinas.",
};

const KEY = "validator-acuan-v1";

export function loadReference(): ReferenceData {
  if (typeof window === "undefined") return DEFAULT_REFERENCE;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_REFERENCE, ...JSON.parse(raw) } : DEFAULT_REFERENCE;
  } catch {
    return DEFAULT_REFERENCE;
  }
}

export function saveReference(data: ReferenceData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function resetReference() {
  localStorage.removeItem(KEY);
}
