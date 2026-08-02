import Link from "next/link";

const ITEMS = [
  { href: "/", label: "Home" },
  { href: "/shopping", label: "Shopping" },
  { href: "/jobs", label: "Jobs" },
  { href: "/calendar", label: "Calendar" },
  { href: "/chat", label: "AI" },
];

export function NavBar({ active }: { active: string }) {
  return (
    <nav className="navbar">
      {ITEMS.map((item) => (
        <Link key={item.href} href={item.href} className={`navbtn ${active === item.href ? "active" : ""}`}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
