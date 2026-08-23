import { NavLink } from "@/components/nav-link";
import { notFound } from "next/navigation";
import { getBusiness, getBusinessCategoryIds, getFeaturedLocationIds } from "@/lib/businesses/queries";
import { listLocationsForBusiness } from "@/lib/locations/queries";
import { CategoryMultiselect } from "@/components/category-multiselect";
import { EditBusinessForm } from "./edit-business-form";
import { FeaturedControl } from "./featured-control";
import { BusinessArchiveControl } from "./business-archive-control";
import { BusinessDeleteControl } from "./business-delete-control";
import { LocationsList } from "./locations-list";
import { OffersList } from "./offers-list";

export default async function EditBusinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = await getBusiness(id);
  if (!business) notFound();

  const selectedCategoryIds = await getBusinessCategoryIds(id);
  const locations = await listLocationsForBusiness(id);
  const selectedFeaturedLocationIds = await getFeaturedLocationIds(id);

  return (
    <div className="p-6">
      <NavLink href="/businesses" className="text-sm text-gold">
        ← Back to businesses
      </NavLink>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-lg font-medium">Edit business</h1>
        <div className="flex items-center gap-4">
          <NavLink href={`/businesses/${id}/preview`} className="text-sm text-gold">
            Preview
          </NavLink>
          {business.status === "draft" && (
            <BusinessDeleteControl id={id} name={business.name} />
          )}
          <BusinessArchiveControl
            id={id}
            name={business.name}
            isArchived={business.status === "archived"}
          />
        </div>
      </div>

      <EditBusinessForm
        business={business}
        categoryMultiselect={<CategoryMultiselect selectedIds={selectedCategoryIds} />}
      />

      <FeaturedControl
        business={business}
        locations={locations}
        selectedFeaturedLocationIds={selectedFeaturedLocationIds}
      />

      <LocationsList businessId={id} />
      <OffersList businessId={id} />
    </div>
  );
}
