import { requireAdminSession } from "@/lib/auth/session";
import { NavigationBlockerProvider } from "@/lib/navigation-blocker";
import { AdminNav } from "@/components/admin-nav";
import { signOutAction } from "./actions";

// Everything under (admin) is gated by requireAdminSession(), the
// authoritative DAL check (Proxy's aal2 check is only optimistic).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();

  return (
    <NavigationBlockerProvider>
      <div className="flex min-h-screen">
        <aside className="flex w-56 shrink-0 flex-col border-r border-border-hairline bg-white">
          <div className="px-4 py-4 text-sm font-medium">Privi Admin</div>
          <AdminNav />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border-hairline px-6 py-3 text-sm">
            <span>Signed in as {session.email}</span>
            <form action={signOutAction}>
              <button type="submit" className="text-gold">
                Log out
              </button>
            </form>
          </header>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </NavigationBlockerProvider>
  );
}
