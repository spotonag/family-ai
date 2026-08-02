import { getFamily, getViewerId, pickViewer } from "@/lib/family";
import { ChatWindow } from "@/components/ChatWindow";
import { NavBar } from "@/components/NavBar";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import Link from "next/link";

export default async function ChatPage() {
  const family = await getFamily();
  const viewerId = await getViewerId();
  const viewer = pickViewer(family.profiles, viewerId);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 mx-auto w-full max-w-md px-4 pt-8 pb-4 flex flex-col">
        <header className="flex items-center justify-between mb-5">
          <div>
            <Link href="/" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
              &larr; Home
            </Link>
            <h1 className="text-xl font-bold tracking-tight mt-1">AI Assistant</h1>
          </div>
          <ProfileSwitcher profiles={family.profiles} viewerId={viewer.id} />
        </header>
        <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
          Rule-based demo — understands the phrases below. Swap in a real model per README.
        </p>
        <ChatWindow familyId={family.id} profileId={viewer.id} viewerName={viewer.name} />
      </div>
      <NavBar active="/chat" />
    </div>
  );
}
