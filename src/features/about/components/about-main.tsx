"use client";

import { PageShell } from "@/components/app/page-shell";
import { APP_CONFIG } from "@/lib/constants";
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
        shifted over time. As the climate warms, both heat and humidity have
        been trending upward across much of the United States, and because
        wet-bulb temperature captures the combined effect of the two, it has
        been rising even faster than dry-bulb air temperature alone in many
        locations. Tracking that shift year over year makes it possible to
        see where heat stress risk is growing fastest.
      </p>
    </section>

    <section className="mt-8">
      <article className="fade-in-up rounded-3xl p-6 glass-panel sm:p-8 lg:p-10">
        <h2 className="mb-3 text-sm font-semibold tracking-[0.24em] text-primary uppercase sm:text-base">
          What is Wetbulb?
        </h2>
        <p className="mt-4 max-w-3xl text-base/7 text-muted-foreground">
          Wet-bulb temperature is the lowest temperature air can reach through
          evaporative cooling alone — the temperature a wet thermometer bulb
          settles at as water evaporates from its surface. It combines the
          effects of heat and humidity into a single number: the lower the
          humidity, the more evaporation can cool the bulb, so wet-bulb
          temperature sits closer to the dry-bulb (regular) air temperature
          when it's dry, and closer to the air temperature itself when the air
          is already saturated with moisture. The human body relies on the
          same evaporative process — sweating — to shed heat, which is why
          wet-bulb temperature is such a useful measure of heat stress: at
          high humidity, sweat can't evaporate efficiently no matter how hot
          it feels, and the body starts to lose its ability to cool down.
        </p>
        <p className="mt-4 max-w-3xl text-base/7 text-muted-foreground">
          At wet-bulb temperatures between 68°F and 77°F, heat-related illness
          risk is generally considered low, though sustained physical
          exertion still warrants caution, as discussed in{" "}
          <Link
            className="text-primary underline underline-offset-4 transition hover:text-primary/80"
            href={APP_CONFIG.WETBULB_LOW_RISK_URL}
          >
            this research
          </Link>
          . Between roughly 77°F and 87°F, risk climbs through moderate,
          high, and extreme categories as the body's ability to cool itself
          through sweat becomes increasingly limited — thresholds outlined in{" "}
          <Link
            className="text-primary underline underline-offset-4 transition hover:text-primary/80"
            href={APP_CONFIG.WETBULB_EXERCISE_SAFETY_URL}
          >
            this exercise-safety guidance
          </Link>
          . Long thought to be the theoretical survivability limit for a
          healthy person at rest, a wet-bulb temperature of 95°F (35°C) is
          the point at which the body can no longer shed heat through
          sweating at all. However,{" "}
          <Link
            className="text-primary underline underline-offset-4 transition hover:text-primary/80"
            href={APP_CONFIG.WETBULB_LIMIT_URL}
          >
            recent research
          </Link>{" "}
          found that this empirical limit is actually lower — closer to
          87°F (30.6°C) — for young, healthy adults under real-world
          conditions.
        </p>
      </article>
    </section>
  </PageShell>
);

export default About;
