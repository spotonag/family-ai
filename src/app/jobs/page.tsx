import { db } from "@/lib/db";
import { getFamily, getViewerId, pickViewer } from "@/lib/family";
import { JobItem } from "@/components/JobItem";
import { JobForm } from "@/components/JobForm";
import { NavBar } from "@/components/NavBar";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const family = await getFamily();
  const viewerId = await getViewerId();
  const viewer = pickViewer(family.profiles, viewerId);

  const jobs = await db.job.findMany({
    where: { familyId: family.id },
    include: { assignedTo: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const open = jobs.filter((j) => j.status !== "done");
  const done = jobs.filter((j) => j.status === "done");

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 mx-auto w-full max-w-md px-4 pt-8 pb-4">
        <header className="flex items-center justify-between mb-5">
          <div>
            <Link href="/" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
              &larr; Home
            </Link>
            <h1 className="text-xl font-bold tracking-tight mt-1">Jobs</h1>
          </div>
          <ProfileSwitcher profiles={family.profiles} viewerId={viewer.id} />
        </header>

        <section className="card mb-3">
          <p className="card-title">Add a job</p>
          {viewer.role === "parent" ? (
            <JobForm familyId={family.id} actingProfileId={viewer.id} profiles={family.profiles} />
          ) : (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Ask a parent to add a new job — switch to their profile with their PIN.
            </p>
          )}
        </section>

        <section className="card mb-3">
          <p className="card-title">Open ({open.length})</p>
          {open.length === 0 && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Nothing open — nice work.
            </p>
          )}
          {open.map((job) => (
            <JobItem
              key={job.id}
              id={job.id}
              title={job.title}
              points={job.points}
              done={false}
              assigneeInitial={job.assignedTo?.avatarInitial}
              assigneeColor={job.assignedTo?.avatarColor}
              canDelete={viewer.role === "parent"}
              actingProfileId={viewer.id}
            />
          ))}
        </section>

        <section className="card">
          <p className="card-title">Done ({done.length})</p>
          {done.map((job) => (
            <JobItem
              key={job.id}
              id={job.id}
              title={job.title}
              points={job.points}
              done
              assigneeInitial={job.assignedTo?.avatarInitial}
              assigneeColor={job.assignedTo?.avatarColor}
              canDelete={viewer.role === "parent"}
              actingProfileId={viewer.id}
            />
          ))}
        </section>
      </div>
      <NavBar active="/jobs" />
    </div>
  );
}
