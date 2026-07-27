import { NavLink } from "@/components/nav-link";
import { CategoryMultiselect } from "@/components/category-multiselect";
import { SeasonBannerForm } from "@/components/season-banner-form";
import { createSeasonBannerAction } from "../actions";

export default function NewSeasonBannerPage() {
  return (
    <div className="p-6">
      <NavLink href="/app-data/season-banners" className="text-sm text-gold">
        ← Back to season banners
      </NavLink>
      <h1 className="mt-2 text-lg font-medium">Add season banner</h1>
      <SeasonBannerForm
        formAction={createSeasonBannerAction}
        submitLabel="Add banner"
        categoryMultiselect={<CategoryMultiselect />}
      />
    </div>
  );
}
