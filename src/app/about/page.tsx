import { DatabaseError } from "@/components/app/database-error";
import About from "@/features/about";
import { FetchLocations as fetchLocations } from "@/lib/api/fetch-server";

const Page = async () => {
  let locationData;
  try {
    locationData = await fetchLocations();
  } catch {
    return (
      <DatabaseError
        message="Unable to connect to the database. Please try again later."
        title="Database Connection Error"
      />
    );
  }

  return <About LocationOptions={locationData.LocationOptions} />;
};

export default Page;
