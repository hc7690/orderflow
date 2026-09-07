"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  BellOff,
  Package,
  ShoppingCart,
  AlertTriangle,
  PackageCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  type Notification,
} from "@/app/api/notifications/actions";
import { onNotificationsChanged } from "@/lib/notifications-refresh";

interface HeaderProps {
  onToggleSidebar: () => void;
}

// ─── Notification Icon by Type ──────────────────────────────────
function NotifIcon({ type }: { type: string }) {
  switch (type) {
    case "stock_empty":
      return (
        <div className="p-1.5 rounded-full bg-red-100">
          <Package className="w-4 h-4 text-red-500" />
        </div>
      );
    case "stock_low":
      return (
        <div className="p-1.5 rounded-full bg-amber-100">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        </div>
      );
    case "order_action":
      return (
        <div className="p-1.5 rounded-full bg-blue-100">
          <ShoppingCart className="w-4 h-4 text-blue-500" />
        </div>
      );
    case "purchase_action":
      return (
        <div className="p-1.5 rounded-full bg-purple-100">
          <PackageCheck className="w-4 h-4 text-purple-500" />
        </div>
      );
    default:
      return (
        <div className="p-1.5 rounded-full bg-slate-100">
          <Bell className="w-4 h-4 text-slate-500" />
        </div>
      );
  }
}

// ─── Time Ago Helper ────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr + "Z"); // ensure UTC
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHr < 24) return `${diffHr} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return date.toLocaleDateString("id-ID");
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const initial =
    user?.displayName?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";
  const displayName = user?.displayName || user?.email || "User";

  // ─── Fetch notifications ───────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Re-fetch when other components emit a refresh event
  useEffect(() => {
    const unsubscribe = onNotificationsChanged(() => {
      fetchNotifications();
    });
    return unsubscribe;
  }, [fetchNotifications]);

  // ─── Click outside to close ─────────────────────────────────
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Handle notification click (navigate + mark read) ──────
  const handleNotifClick = async (notif: Notification) => {
    if (!notif.read) {
      try {
        // Mark as read optimistically
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        // Server-side mark read
        const { markNotificationRead } = await import(
          "@/app/api/notifications/actions"
        );
        await markNotificationRead(notif.id);
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }
    setShowNotifications(false);
    window.location.href = notif.href;
  };

  // ─── Handle mark all as read ────────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      await markAllNotificationsRead();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // ─── Handle logout ──────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-header-bg border-b border-border px-4 lg:px-6">
      <div className="flex items-center justify-between h-16">
        {/* Kiri: Tombol hamburger + Judul */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-slate-100 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="text-lg font-semibold text-foreground lg:hidden">
            OrderFlow
          </h2>
        </div>

        {/* Tengah: Pencarian */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        {/* Kanan: Notifikasi + Profil */}
        <div className="flex items-center gap-2">
          {/* ─── Notification Bell Dropdown ──────────────────── */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Notifikasi"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Notifikasi
                    {unreadCount > 0 && (
                      <span className="ml-1.5 text-xs font-normal text-slate-400">
                        ({unreadCount} belum dibaca)
                      </span>
                    )}
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary hover:text-primary-dark font-medium"
                    >
                      Tandai semua sudah dibaca
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                      <BellOff className="w-8 h-8 mb-2" />
                      <p className="text-sm">Tidak ada notifikasi</p>
                      <p className="text-xs mt-1">
                        Semua stok dan order dalam kondisi aman
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={`flex items-start gap-3 w-full px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 text-left ${
                          !notif.read ? "bg-blue-50/30" : ""
                        }`}
                      >
                        <NotifIcon type={notif.type} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-sm truncate ${
                                !notif.read
                                  ? "font-semibold text-slate-800"
                                  : "font-medium text-slate-600"
                              }`}
                            >
                              {notif.title}
                            </p>
                            {notif.priority === "high" && (
                              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                                Urgent
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {notif.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {timeAgo(notif.createdAt)}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── User Profile Dropdown ──────────────────────── */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 pl-2 ml-2 border-l border-border hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                {initial}
              </div>
              <span className="hidden sm:block text-sm font-medium text-slate-700">
                {displayName}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  showUserMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {user?.email}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      window.location.href = "/pengaturan";
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Edit Profil
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      window.location.href = "/pengaturan";
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Pengaturan
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-slate-100 py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
