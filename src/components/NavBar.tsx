import Link from "next/link";

const ITEMS = [
  { href: "/", label: "Home" },
  { href: "/shopping", label: "Shopping" },
  { href: "/jobs", label: "Jobs" },
  { href: "/calendar", label: "Calendar" },
  { href: "/chat", label: "AI" },
];

const ICON_PROPS = {
  width: 30,
  height: 30,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function NavIcon({ href }: { href: string }) {
  switch (href) {
    case "/":
      return (
        <svg {...ICON_PROPS}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10v9.5a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
        </svg>
      );
    case "/shopping":
      return (
        <svg {...ICON_PROPS}>
          <path d="M6 8h12l-1 12H7L6 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case "/jobs":
      return (
        <svg {...ICON_PROPS}>
          <rect x="4" y="4" width="16" height="16" rx="5" />
          <path d="M9 11.5 11 13.5 15.5 9" />
        </svg>
      );
    case "/calendar":
      return (
        <svg {...ICON_PROPS}>
          <rect x="4" y="5" width="16" height="15" rx="2.5" />
          <path d="M9 3v4M15 3v4M4 10h16" />
        </svg>
      );
    case "/chat":
      return (
        <svg {...ICON_PROPS}>
          <path d="M12 3a4 4 0 0 1 4 4v3a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Z" />
          <path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3" />
        </svg>
      );
    default:
      return null;
  }
}

export function NavBar({ active }: { active: string }) {
  return (
    <nav className="navbar">
      {ITEMS.map((item) => (
        <Link key={item.href} href={item.href} className={`navbtn ${active === item.href ? "active" : ""}`}>
          <NavIcon href={item.href} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
