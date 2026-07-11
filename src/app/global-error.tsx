"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

function CaptureError({ error }: Readonly<{ error: Error }>) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return null;
}

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error;
  reset: () => void;
}>) {
  return (
    <html lang="en">
      <body>
        <CaptureError error={error} />
        <div className="mx-auto max-w-xl px-4 py-12">
          <div className="flex flex-col items-center gap-6 text-center">
            <h1 className="text-3xl font-bold text-destructive">
              Something went wrong!
            </h1>
            <p className="max-w-md text-base text-muted-foreground">
              An unexpected error occurred. Please try again.
            </p>

            <div className="flex w-full max-w-md flex-col gap-3">
              <Button className="w-full" onClick={reset} type="button">
                Try again
              </Button>

              <Alert variant="default">
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
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
