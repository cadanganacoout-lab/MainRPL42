import React from "react";

const ADMIN_LINKS = [
  { label: "Ringkasan", href: "#/admin", active: "overview" },
  { label: "Siswa & guru", href: "#/admin/data?kind=students", active: "content" },
  { label: "Galeri & video", href: "#/admin/data?kind=gallery", active: "media" },
  { label: "Akun siswa", href: "#/admin?tab=accounts", active: "accounts" },
  { label: "Jadwal pelajaran", href: "#/admin?tab=schedule", active: "schedule" },
  { label: "Piket kelas", href: "#/admin?tab=duties", active: "duties" },
];

function getLinks(user) {
  if (user?.role === "admin") return ADMIN_LINKS;
  if (user?.role === "student") {
    return [
      { label: "Ringkasan", href: "#/dashboard", active: "overview" },
      { label: "Edit card saya", href: "#/card-saya", active: "card" },
    ];
  }
  return [{ label: "Ringkasan", href: "#/dashboard", active: "overview" }];
}

function roleLabel(role) {
  if (role === "admin") return "Administrator";
  if (role === "student") return "Siswa";
  return "Tamu";
}

export function DashboardSidebar({ user, active = "overview" }) {
  const displayName = user?.displayName || user?.username || "Akun";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar-account">
        <span className="dashboard-sidebar-avatar" aria-hidden="true">{initials}</span>
        <span className="dashboard-sidebar-identity">
          <strong>{displayName}</strong>
          <small>{roleLabel(user?.role)} · @{user?.username || "akun"}</small>
        </span>
      </div>
      <nav aria-label="Navigasi dashboard">
        {getLinks(user).map(item => (
          <a
            href={item.href}
            key={item.href}
            aria-current={active === item.active ? "page" : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
