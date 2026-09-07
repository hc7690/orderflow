// ─── Fungsi Format Rupiah ──────────────────────────────────────
export function formatRupiah(angka: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(angka);
}

// ─── Fungsi Format Tanggal Indonesia ────────────────────────────
export function formatTanggal(tanggal: Date | string): string {
  const tgl = typeof tanggal === "string" ? new Date(tanggal) : tanggal;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(tgl);
}

// ─── Fungsi Format Tanggal Singkat ──────────────────────────────
export function formatTanggalSingkat(tanggal: Date | string): string {
  const tgl = typeof tanggal === "string" ? new Date(tanggal) : tanggal;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(tgl);
}

// ─── Fungsi Format Tanggal Waktu ────────────────────────────────
export function formatTanggalWaktu(tanggal: Date | string): string {
  const tgl = typeof tanggal === "string" ? new Date(tanggal) : tanggal;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(tgl);
}

// ─── Fungsi Format Angka ────────────────────────────────────────
export function formatAngka(angka: number): string {
  return new Intl.NumberFormat("id-ID").format(angka);
}

// ─── Fungsi generate ID sederhana ──────────────────────────────
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ─── Fungsi helper class names (clsx-like) ──────────────────────
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ─── Constants: Payment Methods ─────────────────────────────────
export const PAYMENT_METHODS = [
  { value: "tunai", label: "Tunai" },
  { value: "transfer", label: "Transfer" },
  { value: "kartu_kredit", label: "Kartu Kredit" },
  { value: "e_wallet", label: "E-Wallet" },
  { value: "lainnya", label: "Lainnya" },
];

export const EXPENSE_CATEGORIES = [
  { value: "operasional", label: "Operasional" },
  { value: "bahan_baku", label: "Bahan Baku" },
  { value: "gaji", label: "Gaji" },
  { value: "transportasi", label: "Transportasi/Kurir" },
  { value: "promosi", label: "Promosi" },
  { value: "sewa", label: "Sewa" },
  { value: "utilitas", label: "Utilitas" },
  { value: "lainnya", label: "Lainnya" },
];
