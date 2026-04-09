import React from "react";
import { Link, useLocation } from "wouter";
import {
  Mic,
  LayoutDashboard,
  History,
  LineChart,
  PlayCircle,
  Menu,
  X,
  LogOut,
  LogIn,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { XpBar } from "./xp-bar";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Record Session", href: "/record", icon: Mic },
    { label: "History", href: "/sessions", icon: History },
    { label: "Progress", href: "/progress", icon: LineChart },
    { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-sidebar-border bg-sidebar hidden md:flex flex-col shrink-0">
        <div className="p-6 border-b border-sidebar-border">
          <Link
            href="/"
            className="flex items-center gap-3 font-bold text-xl tracking-tight cursor-pointer text-sidebar-primary"
          >
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary">
              <PlayCircle size={18} />
            </div>
            <span className="text-sidebar-foreground">EchoCoach</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          {/* XP Bar for authenticated users */}
          {isAuthenticated && <XpBar />}

          {/* User info / auth actions */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent">
              <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold shrink-0">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sidebar-foreground text-sm font-medium truncate">{user.username}</p>
                <p className="text-sidebar-foreground/50 text-xs truncate capitalize">{user.role}</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent">
                <div className="w-8 h-8 rounded-full bg-sidebar-border flex items-center justify-center text-sidebar-foreground/50 text-xs font-bold shrink-0">
                  DU
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sidebar-foreground text-sm font-medium truncate">Demo User</p>
                  <p className="text-sidebar-foreground/50 text-xs truncate">Not signed in</p>
                </div>
              </div>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <LogIn size={15} />
                Sign In / Register
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 md:hidden">
          <Link href="/" className="flex items-center gap-2 font-bold text-base cursor-pointer">
            <PlayCircle size={18} className="text-primary" />
            <span>EchoCoach</span>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-b border-border bg-card/95 backdrop-blur-md z-10">
            <nav className="px-3 py-3 space-y-1">
              {navItems.map((item) => {
                const isActive =
                  location === item.href ||
                  (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <item.icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
              {!isAuthenticated && (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >
                  <LogIn size={17} />
                  Sign In / Register
                </Link>
              )}
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto w-full p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
