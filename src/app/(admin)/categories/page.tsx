import { NavLink } from "@/components/nav-link";
import { listCategories } from "@/lib/categories/queries";
import { CategoryIcon } from "@/components/category-icon";
import { StatusBadge } from "@/components/status-badge";
import { toggleActiveAction, moveCategoryAction } from "./actions";

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Categories</h1>
        <NavLink
          href="/categories/new"
          className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)]"
        >
          Add category
        </NavLink>
      </div>

      <div className="mt-6 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
        {categories.length === 0 && (
          <p className="p-6 text-sm text-muted-dark">No categories yet.</p>
        )}

        {categories.map((category, index) => (
          <div
            key={category.id}
            className="flex items-center gap-4 px-4 py-3"
          >
            <CategoryIcon
              slug={category.slug}
              className="h-8 w-8 shrink-0 text-charcoal"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{category.label}</p>
              <p className="truncate text-xs text-muted-dark">{category.slug}</p>
            </div>

            <StatusBadge status={category.is_active ? "active" : "inactive"} />

            <div className="flex items-center gap-1">
              <form action={moveCategoryAction.bind(null, category.id, "up")}>
                <button
                  type="submit"
                  disabled={index === 0}
                  aria-label="Move up"
                  className="rounded border border-border-hairline px-2 py-1 text-xs disabled:opacity-30"
                >
                  ↑
                </button>
              </form>
              <form action={moveCategoryAction.bind(null, category.id, "down")}>
                <button
                  type="submit"
                  disabled={index === categories.length - 1}
                  aria-label="Move down"
                  className="rounded border border-border-hairline px-2 py-1 text-xs disabled:opacity-30"
                >
                  ↓
                </button>
              </form>
            </div>

            <NavLink
              href={`/categories/${category.id}/edit`}
              className="text-sm text-gold"
            >
              Edit
            </NavLink>

            <form
              action={toggleActiveAction.bind(
                null,
                category.id,
                category.label,
                !category.is_active,
              )}
            >
              <button type="submit" className="text-sm text-gold">
                {category.is_active ? "Deactivate" : "Activate"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
