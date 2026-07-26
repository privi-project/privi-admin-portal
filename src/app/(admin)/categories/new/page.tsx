import { NavLink } from "@/components/nav-link";
import { NewCategoryForm } from "./category-form";

export default function NewCategoryPage() {
  return (
    <div className="p-6">
      <NavLink href="/categories" className="text-sm text-gold">
        ← Back to categories
      </NavLink>
      <h1 className="mt-2 text-lg font-medium">Add category</h1>
      <NewCategoryForm />
    </div>
  );
}
