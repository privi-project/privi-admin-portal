import { NavLink } from "@/components/nav-link";
import { notFound } from "next/navigation";
import { getCategory } from "@/lib/categories/queries";
import { EditCategoryForm } from "./edit-category-form";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await getCategory(id);

  if (!category) {
    notFound();
  }

  return (
    <div className="p-6">
      <NavLink href="/categories" className="text-sm text-gold">
        ← Back to categories
      </NavLink>
      <h1 className="mt-2 text-lg font-medium">Edit category</h1>
      <EditCategoryForm category={category} />
    </div>
  );
}
