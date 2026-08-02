import { getFamily, getViewerId, pickViewer } from "@/lib/family";
import { AddFamilyMemberForm } from "@/components/AddFamilyMemberForm";
import { NavBar } from "@/components/NavBar";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const family = await getFamily();
  const viewerId = await getViewerId();
  const viewer = pickViewer(family.profiles, viewerId);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 mx-auto w-full max-w-md px-4 pt-8 pb-4">
        <header className="flex items-center justify-between mb-5">
          <div>
            <Link href="/" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
              &larr; Home
            </Link>
            <h1 className="text-xl font-bold tracking-tight mt-1">Settings</h1>
          </div>
          <ProfileSwitcher profiles={family.profiles} viewerId={viewer.id} />
        </header>

        {viewer.role !== "parent" ? (
          <div className="card">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Settings are for parents only — switch to a parent profile with their PIN to make changes here.
            </p>
          </div>
        ) : (
          <>
            <section className="card mb-3">
              <p className="card-title">Family members</p>
              <div className="flex flex-col gap-2 mb-3">
                {family.profiles.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <div className="avatar sm" style={{ background: p.avatarColor }}>
                      {p.avatarInitial}
                    </div>
                    <span className="text-sm font-semibold">{p.name}</span>
                    <span className="chip" style={{ marginLeft: "auto" }}>
                      {p.role === "parent" ? "Parent" : "Child"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <p className="card-title">Add a family member</p>
              <AddFamilyMemberForm familyId={family.id} actingProfileId={viewer.id} />
            </section>
          </>
        )}
      </div>
      <NavBar active="/settings" />
    </div>
  );
}
