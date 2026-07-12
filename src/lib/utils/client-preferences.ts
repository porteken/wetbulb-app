import { DEFAULT_REFERENCE_YEAR, type GraphSeason } from "@/lib/constants";

interface GraphPreferencesPayload {
  graphMeasure?: string;
  graphSeason?: GraphSeason;
  referenceYear?: string;
}

const persistGraphPreferences = async (
  payload: GraphPreferencesPayload,
): Promise<void> => {
  if (!("fetch" in globalThis)) {
    return;
  }

  const response = await globalThis.fetch("/api/preferences/graph", {
    body: JSON.stringify(payload),
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    keepalive: true,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to persist graph preferences");
  }
};

export const persistGraphMeasurePreference = async (
  measure: string,
): Promise<void> => {
  await persistGraphPreferences({ graphMeasure: measure });
};

export const persistGraphSeasonPreference = async (
  season: GraphSeason,
): Promise<void> => {
  await persistGraphPreferences({ graphSeason: season });
};

export const persistReferenceYearPreference = async (
  referenceYear: string = DEFAULT_REFERENCE_YEAR,
): Promise<void> => {
  await persistGraphPreferences({ referenceYear });
};
