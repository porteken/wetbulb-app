"use client";

import React from "react";

interface LocationInfo {
  city: string;
  state: string;
}

interface PageHeaderProperties {
  location: LocationInfo;
}

export const PageHeader: React.FC<PageHeaderProperties> = ({ location }) => (
  <section className="mb-8 fade-in-up overflow-hidden rounded-4xl glass-panel">
    <div className="bg-primary px-6 py-5 sm:px-8 sm:py-6">
      <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
        {location.city}, {location.state}
      </h1>
    </div>
  </section>
);
