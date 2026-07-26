import { NavLink } from "@/components/nav-link";
import { NewMemberForm } from "./member-form";

export default function NewMemberPage() {
  return (
    <div className="p-6">
      <NavLink href="/members" className="text-sm text-gold">
        ← Back to members
      </NavLink>
      <h1 className="mt-2 text-lg font-medium">Add member</h1>
      <NewMemberForm />
    </div>
  );
}
