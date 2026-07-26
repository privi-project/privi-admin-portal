import { redirect } from "next/navigation";

// Reaching "/" means Proxy already confirmed an aal2-elevated session
// (otherwise it would have redirected to /login or /mfa/challenge). /home
// itself still runs requireAdminSession() — the authoritative admin check.
export default function RootPage() {
  redirect("/home");
}
