import { NavLink } from "@/components/nav-link";
import { notFound } from "next/navigation";
import { CategoryMultiselect } from "@/components/category-multiselect";
import { SeasonBannerForm } from "@/components/season-banner-form";
import {
  getSeasonBanner,
  getSeasonBannerCategoryIds,
} from "@/lib/season-banners/queries";
import { updateSeasonBannerAction } from "../../actions";
import { SeasonBannerDeleteControl } from "./season-banner-delete-control";

export default async function EditSeasonBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const banner = await getSeasonBanner(id);
  if (!banner) notFound();

  const selectedCategoryIds = await getSeasonBannerCategoryIds(id);
  const updateWithId = updateSeasonBannerAction.bind(null, id);

  return (
    <div className="p-6">
      <NavLink href="/app-data/season-banners" className="text-sm text-gold">
        ← Back to season banners
      </NavLink>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-lg font-medium">Edit season banner</h1>
        {!banner.is_active && (
          <SeasonBannerDeleteControl id={id} title={banner.title} />
        )}
      </div>

      <SeasonBannerForm
        formAction={updateWithId}
        submitLabel="Save changes"
        categoryMultiselect={<CategoryMultiselect selectedIds={selectedCategoryIds} />}
        initial={{
          title: banner.title,
          message: banner.message,
          action_type: banner.action_type,
          action_url: banner.action_url,
        }}
      />
    </div>
  );
}
