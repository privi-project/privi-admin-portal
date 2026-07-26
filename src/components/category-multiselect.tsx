import { listCategories } from "@/lib/categories/queries";
import { CategoryIcon } from "@/components/category-icon";

// Server Component — fetches categories itself so every call site doesn't
// need to. Renders as a checkbox list (name="categoryIds", multiple values)
// rather than a <select multiple> — easier to scan with icons, and works
// without JS.
export async function CategoryMultiselect({
  selectedIds = [],
}: {
  selectedIds?: string[];
}) {
  const categories = await listCategories();

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm">Categories</legend>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border-hairline p-3">
        {categories.map((category) => (
          <label key={category.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="categoryIds"
              value={category.id}
              defaultChecked={selectedIds.includes(category.id)}
            />
            <CategoryIcon slug={category.slug} className="h-5 w-5 text-charcoal" />
            {category.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
