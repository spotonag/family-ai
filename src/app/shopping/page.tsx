import { db } from "@/lib/db";
import { getFamily, getViewerId, pickViewer } from "@/lib/family";
import { ShoppingList } from "@/components/ShoppingList";
import { NavBar } from "@/components/NavBar";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const family = await getFamily();
  const viewerId = await getViewerId();
  const viewer = pickViewer(family.profiles, viewerId);

  const [pending, purchased] = await Promise.all([
    db.shoppingItem.findMany({ where: { familyId: family.id, status: "pending" }, orderBy: { createdAt: "desc" } }),
    db.shoppingItem.findMany({
      where: { familyId: family.id, status: "purchased" },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { addedBy: true },
    }),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 mx-auto w-full max-w-md px-4 pt-8 pb-4">
        <header className="flex items-center justify-between mb-5">
          <div>
            <Link href="/" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
              &larr; Home
            </Link>
            <h1 className="text-xl font-bold tracking-tight mt-1">Shopping List</h1>
          </div>
          <ProfileSwitcher profiles={family.profiles} viewerId={viewer.id} />
        </header>

        <section className="card mb-3">
          <p className="card-title">Pending ({pending.length})</p>
          <ShoppingList items={pending} familyId={family.id} viewerId={viewer.id} full />
        </section>

        <section className="card">
          <p className="card-title">Recently purchased</p>
          {purchased.length === 0 && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Nothing purchased yet.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {purchased.map((item) => (
              <div key={item.id} className="text-sm flex justify-between" style={{ color: "var(--muted)" }}>
                <span style={{ textDecoration: "line-through" }}>{item.name}</span>
                <span className="text-xs">{item.addedBy?.name ?? ""}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <NavBar active="/shopping" />
    </div>
  );
}
