import {
  LayoutDashboard,
  Users,
  Package,
  Boxes,
  ShoppingCart,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

// ─── Info Aplikasi ──────────────────────────────────────────────
export const APP_NAME = "OrderFlow";
export const APP_TAGLINE = "Sistem Manajemen Usaha";

// ─── Tipe data ──────────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// ─── Navigasi Sidebar ───────────────────────────────────────────
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Customer", href: "/customer", icon: Users },
  { label: "Produk", href: "/produk", icon: Package },
  { label: "Stok", href: "/stok", icon: Boxes },
  { label: "Order Masuk", href: "/order", icon: ShoppingCart },
  { label: "Pembelian", href: "/pembelian", icon: ShoppingBag },
  { label: "Transaksi", href: "/transaksi", icon: CreditCard },
  { label: "Cashflow", href: "/cashflow", icon: TrendingUp },
  { label: "Laporan", href: "/laporan", icon: BarChart3 },
  { label: "Pengaturan", href: "/pengaturan", icon: Settings },
];

// ─── Navigasi Mobile (bottom bar, tampilkan 5 item utama) ───────
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Order", href: "/order", icon: ShoppingCart },
  { label: "Produk", href: "/produk", icon: Package },
  { label: "Cashflow", href: "/cashflow", icon: TrendingUp },
  { label: "Lainnya", href: "/pengaturan", icon: Settings },
];

// ─── Warna Tema ─────────────────────────────────────────────────
export const COLORS = {
  primary: "#2563eb", // blue-600
  primaryDark: "#1d4ed8", // blue-700
  primaryLight: "#dbeafe", // blue-100
  sidebar: "#0f172a", // slate-900
  sidebarHover: "#1e293b", // slate-800
  sidebarActive: "#2563eb", // blue-600
  success: "#16a34a", // green-600
  warning: "#d97706", // amber-600
  danger: "#dc2626", // red-600
} as const;
