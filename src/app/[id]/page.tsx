import { DatabaseError } from "@/components/app/database-error";
import Page, { PageQueryProvider } from "@/features/page";
import { LocationPageSkeleton } from "@/features/page/components/location-page-skeleton";
import { loadLocationPageData } from "@/features/page/server/location-page-data";
import { notFound } from "next/navigation";
import { Suspense } from "react";

const locationPageSkeleton = <LocationPageSkeleton />;

export async function LocationPageContent({ id }: { readonly id: string }) {
  const result = await loadLocationPageData(id);

  if (result.status === "database-error") {
    return (
      <DatabaseError
        message={result.payload.message}
        title={result.payload.title}
      />
    );
  }

  if (result.status === "invalid-location") {
    notFound();
  }

  return (
    <PageQueryProvider>
      <Page {...result.payload} />
    </PageQueryProvider>
  );
}

export default async function LocationPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={locationPageSkeleton}>
      <LocationPageContent id={id} />
    </Suspense>
  );
}
