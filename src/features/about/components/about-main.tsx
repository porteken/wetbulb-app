"use client";

import { PageShell } from "@/components/app/page-shell";
import { APP_CONFIG } from "@/lib/constants";
import {
  getWetbulbRangeLabel,
  WETBULB_INDEX_LEGEND_ITEMS,
} from "@/lib/utils/wetbulb-index";
import Link from "next/link";
import React from "react";

import type { AboutProperties } from "../model/types";
import type { FC } from "react";

const About: FC<AboutProperties> = ({ LocationOptions }: AboutProperties) => (
  <PageShell
    LocationOptions={LocationOptions}
    mainClassName="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10"
  >
    <section className="fade-in-up rounded-3xl p-6 glass-panel sm:p-8 lg:p-10">
      <h1 className="sr-only">About</h1>
      <p className="mb-3 text-sm font-semibold tracking-[0.24em] text-primary uppercase sm:text-base">
        Purpose of the Application
      </p>
      <p className="mt-4 max-w-3xl text-base/7 text-muted-foreground">
        This app combines interactive maps, city-level rankings, and detailed
        historical comparisons so you can see how wet-bulb temperature has
        shifted over time.
      </p>
    </section>

    <section className="mt-8">
      <article className="fade-in-up rounded-3xl p-6 glass-panel sm:p-8 lg:p-10">
        <h2 className="mb-3 text-sm font-semibold tracking-[0.24em] text-primary uppercase sm:text-base">
          What is Wetbulb?
        </h2>
        <p className="mt-4 max-w-3xl text-base/7 text-muted-foreground">
          Wet-bulb temperature is the temperature a wet thermometer bulb settles
          at as water evaporates from its surface. It combines the effects of
          heat and humidity into a single number. The human body relies on the
          same sweating to shed heat, which is why wet-bulb temperature is such
          a useful measure of heat stress. At high humidity, sweat can't
          evaporate efficiently, no matter how hot it feels, and the body starts
          to lose its ability to cool down.
        </p>

        <div className="mt-6 max-w-3xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                <th className="py-2 pr-4">Level</th>
                <th className="py-2">Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {WETBULB_INDEX_LEGEND_ITEMS.map((item) => (
                <tr key={item.level}>
                  <td className={`py-2 pr-4 font-medium ${item.colorClass}`}>
                    {item.level}
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {getWetbulbRangeLabel(item, "F")} (
                    {getWetbulbRangeLabel(item, "C")})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 max-w-3xl text-base/7 text-muted-foreground">
          The 68–76°F (20–24°C) low-risk range is based on{" "}
          <Link
            className="text-primary underline underline-offset-4 transition hover:text-primary/80"
            href={APP_CONFIG.WETBULB_LOW_RISK_URL}
          >
            this research
          </Link>
          . The 77–94°F (25–34°C) moderate-through-extreme thresholds, where the
          body's ability to cool itself through sweat becomes increasingly
          limited, are based on{" "}
          <Link
            className="text-primary underline underline-offset-4 transition hover:text-primary/80"
            href={APP_CONFIG.WETBULB_EXERCISE_SAFETY_URL}
          >
            these excercise guidelines
          </Link>
          . A wet-bulb temperature of 95°F (35°C) has long been the
          theoretically limit at which the body can no longer shed heat through
          sweating at all. However,{" "}
          <Link
            className="text-primary underline underline-offset-4 transition hover:text-primary/80"
            href={APP_CONFIG.WETBULB_LIMIT_URL}
          >
            recent research
          </Link>{" "}
          found that this empirical limit is actually closer to 88°F (31°C) for
          young, healthy adults under real-world conditions.
        </p>
      </article>
    </section>
  </PageShell>
);

export default About;
