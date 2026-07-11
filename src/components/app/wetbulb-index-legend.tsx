"use client";

import { WETBULB_INDEX_LEGEND_ITEMS } from "@/lib/utils/wetbulb-index";
import React from "react";

interface WetbulbIndexLegendProperties {
  title?: string;
}

const WetbulbIndexLegendComponent: React.FC<WetbulbIndexLegendProperties> = ({
  title = "Wetbulb Index",
}) => (
  <div className="rounded-2xl p-4 glass-panel-muted">
    <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
    <ul className="space-y-2.5">
      {WETBULB_INDEX_LEGEND_ITEMS.map((item) => (
        <li className="flex items-center gap-3" key={item.level}>
          <div
            aria-label={`${item.level} marker`}
            className={`size-5 rounded-sm ${item.fillClass}`}
          />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">
              {item.rangeLabel}
            </span>
            <span className={`text-xs font-medium ${item.colorClass}`}>
              {item.level}
            </span>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

WetbulbIndexLegendComponent.displayName = "WetbulbIndexLegend";

export const WetbulbIndexLegend = React.memo(WetbulbIndexLegendComponent);
