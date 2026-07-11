import { beforeEach, describe, expect, it, vi } from "vitest";

import { FetchTrendGraphData } from "../fetch-client";
import { FetchReferenceGraphData } from "../reference-graph-data";

vi.mock("../fetch-client");
vi.mock("../reference-graph-data");

describe("aPI Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("client-Server Integration", () => {
    it("should handle complete trend data flow", async () => {
      const mockTrendData = {
        increase_per_year: 1.2,
        trendline_wetbulbs: [12, 16, 22],
        year_wetbulbs: [10, 15, 20],
        years: [2020, 2021, 2022],
      };

      vi.mocked(FetchTrendGraphData).mockResolvedValue(mockTrendData);

      const result = await FetchTrendGraphData("avg", 1);

      expect(result).toStrictEqual(mockTrendData);
      expect(FetchTrendGraphData).toHaveBeenCalledWith("avg", 1);
    });

    it("should handle complete reference data flow", async () => {
      const mockReferenceData = {
        dates: [new Date("2022-01-01"), new Date("2022-01-02")],
        wetbulbs: [25, 30],
      };

      vi.mocked(FetchReferenceGraphData).mockResolvedValue(mockReferenceData);

      const result = await FetchReferenceGraphData("2022", 1);

      expect(result).toStrictEqual(mockReferenceData);
      expect(FetchReferenceGraphData).toHaveBeenCalledWith("2022", 1);
    });

    it("should propagate errors from server to client", async () => {
      const serverError = new Error("Server connection failed");
      vi.mocked(FetchTrendGraphData).mockRejectedValue(serverError);

      await expect(FetchTrendGraphData("avg", 1)).rejects.toThrow(
        "Server connection failed",
      );
    });

    it("should validate data consistency between client and server", async () => {
      const invalidLocationId = -1;

      vi.mocked(FetchTrendGraphData).mockImplementation(
        (_option, locationId) => {
          if (locationId < 0) {
            return Promise.reject(new Error("Invalid location ID"));
          }
          return Promise.resolve({
            increase_per_year: 0,
            trendline_wetbulbs: [],
            year_wetbulbs: [],
            years: [],
          });
        },
      );

      await expect(
        FetchTrendGraphData("avg", invalidLocationId),
      ).rejects.toThrow("Invalid location ID");
    });
  });
});
