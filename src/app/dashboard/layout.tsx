import { BottomNav } from "@/components/layout/bottom-nav";
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
    <div className="min-h-screen bg-transparent">
      <main className="pb-24 p-4 sm:p-6 lg:p-10">
        <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 mx-auto max-w-7xl">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}