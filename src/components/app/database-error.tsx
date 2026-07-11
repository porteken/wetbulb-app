"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { reloadPage } from "@/utils/reload";
import React from "react";

interface DatabaseErrorProperties {
  message?: string;
  showContactInfo?: boolean;
  title?: string;
}

export const DatabaseError: React.FC<DatabaseErrorProperties> = ({
  message = "Unable to connect to the database. Please try again later.",
  showContactInfo = true,
  title = "Database Connection Error",
}) => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="mx-auto max-w-md p-6 text-center">
      <div className="mb-6">
        <svg
          aria-hidden="true"
          className="mx-auto size-12 text-destructive"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </div>

      <h1 className="mb-4 text-2xl font-bold text-foreground">{title}</h1>

      <p className="mb-6 text-muted-foreground">{message}</p>

      {showContactInfo && (
        <Alert className="mb-6 text-left" variant="default">
          <AlertTitle>Need help?</AlertTitle>
          <AlertDescription>
            Contact Kenneth Porter at{" "}
            <a
              className="text-primary underline hover:text-primary/80"
              href="mailto:porteken@gmail.com"
            >
              porteken@gmail.com
            </a>
          </AlertDescription>
        </Alert>
      )}

      <Button onClick={reloadPage} type="button">
        Try Again
      </Button>
    </div>
  </div>
);
