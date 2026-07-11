import { DatabaseError } from "@/components/app/database-error";
import About from "@/features/about";
import { FetchLocations } from "@/lib/api/fetch-server";

const Page = async () => {
  try {
    const { LocationOptions } = await FetchLocations();

    return <About LocationOptions={LocationOptions} />;
  } catch {
    return (
      <DatabaseError
        message="Unable to connect to the database. Please try again later."
        title="Database Connection Error"
      />
    );
  }
};

export default Page;
