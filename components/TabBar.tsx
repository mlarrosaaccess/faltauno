"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const items = [
  { href: "/inicio", label: "Inicio", icon: "home" },
  { href: "/inicio?focus=buscar", label: "Buscar", icon: "search", focus: true },
  { href: "/crear", label: "Crear", icon: "plus" },
  { href: "/perfil", label: "Perfil", icon: "user" },
];

export function TabBar() {
  const path = usePathname();
  const params = useSearchParams();
  const buscando = path === "/inicio" && params.get("focus") === "buscar";

  return (
    <nav className="tabbar" aria-label="Principal">
      {items.map((item) => {
        const active = item.focus
          ? buscando
          : item.href === "/inicio"
            ? (path === "/inicio" || path.startsWith("/partidos")) && !buscando
            : path === item.href;
        return (
          <Link key={item.label} href={item.href} className={active ? "tab active" : "tab"}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Icon({ name }: { name: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }
  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
    );
  }
  if (name === "plus") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8.5v7M8.5 12h7" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.2c1.2-2.8 3.4-4.2 6.5-4.2s5.3 1.4 6.5 4.2" />
    </svg>
  );
}
