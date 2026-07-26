import { NavLink } from "@/components/nav-link";
import { CategoryMultiselect } from "@/components/category-multiselect";
import { NewBusinessForm } from "./business-form";

export default function NewBusinessPage() {
  return (
    <div className="p-6">
      <NavLink href="/businesses" className="text-sm text-gold">
        ← Back to businesses
      </NavLink>
      <h1 className="mt-2 text-lg font-medium">Add business</h1>
      <NewBusinessForm categoryMultiselect={<CategoryMultiselect />} />
    </div>
  );
}
