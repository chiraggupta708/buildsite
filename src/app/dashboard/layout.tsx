import { Sidebar } from "./sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar userName={session.user?.name || undefined} />
      <main className="flex-1 min-w-0 overflow-y-auto p-4 pt-14 sm:p-6 lg:p-10 md:pt-6">
        <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}
