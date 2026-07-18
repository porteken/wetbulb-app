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
  <h1 className="mb-8 fade-in-up text-3xl font-black tracking-tight text-primary sm:text-4xl">
    {location.city}, {location.state}
  </h1>
);
