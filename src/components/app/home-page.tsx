import { LocationErrorHandler } from "@/components/app/error-handlers";
import Home from "@/features/home";
import { HomeQueryProvider } from "@/features/home/components/home-query-provider";
import {
  getForecastPreferencesFromCookies,
  getGraphMeasureFromCookies,
  getGraphSeasonFromCookies,
  getLocationData,
} from "@/lib/utils/app/page-helpers";

const HomePage = async () => {
  try {
    const [
      initialGraphMeasure,
      initialGraphSeason,
      initialForecastPreferences,
      { locations },
    ] = await Promise.all([
      getGraphMeasureFromCookies(),
      getGraphSeasonFromCookies(),
      getForecastPreferencesFromCookies(),
      getLocationData(),
    ]);

    return (
      <HomeQueryProvider>
        <Home
          initialForecastEnabled={initialForecastPreferences.enabled}
          initialForecastYearsAhead={initialForecastPreferences.yearsAhead}
          initialGraphMeasure={initialGraphMeasure}
          initialGraphSeason={initialGraphSeason}
          locations={locations}
        />
      </HomeQueryProvider>
    );
  } catch (error) {
    const errorObject =
      error instanceof Error ? error : new Error(String(error));
    return <LocationErrorHandler error={errorObject} />;
  }
};

export default HomePage;
