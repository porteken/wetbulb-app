"use client";

import { HeaderBar } from "@/features/header-bar";
import React from "react";

import type { NavProperties } from "@/types/types";

interface PageShellProperties extends NavProperties {
  children: React.ReactNode;
  headerWrapperClassName?: string;
  mainClassName: string;
}

const MAIN_CONTENT_ID = "main-content";
const MAIN_CONTENT_HREF = `#${MAIN_CONTENT_ID}`;

export const PageShell = ({
  children,
  headerWrapperClassName,
  mainClassName,
  ...headerProperties
}: PageShellProperties): React.ReactElement => {
  const header = <HeaderBar {...headerProperties} />;

  return (
    <>
      <a className="skip-link" href={MAIN_CONTENT_HREF}>
        Skip to main content
      </a>
      {headerWrapperClassName ? (
        <div className={headerWrapperClassName}>{header}</div>
      ) : (
        header
      )}
      <main className={mainClassName} id={MAIN_CONTENT_ID}>
        {children}
      </main>
    </>
  );
};
