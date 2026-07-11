import { isProductionRuntime } from "@/config/environment";
import { notFound } from "next/navigation";

import PlotTestClient from "./plot-test-client";

export default function Page() {
  if (isProductionRuntime()) {
    notFound();
  }

  return <PlotTestClient />;
}
