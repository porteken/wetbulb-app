import { DatabaseError } from "@/components/app/database-error";
import { ERROR_MESSAGES, ERROR_TITLES } from "@/lib/constants";
import React, { memo, useMemo } from "react";

interface ErrorHandlerProperties {
  error: Error;
}

export const LocationErrorHandler = memo<ErrorHandlerProperties>(
  ({ error }) => {
    const errorConfig = useMemo(() => {
      const isNoDataError = error.message === ERROR_MESSAGES.NO_DATA;

      return {
        message: isNoDataError
          ? ERROR_MESSAGES.NO_DATA_UI
          : ERROR_MESSAGES.DATABASE_CONNECTION,
        title: isNoDataError
          ? ERROR_TITLES.NO_DATA
          : ERROR_TITLES.DATABASE_CONNECTION,
      };
    }, [error.message]);

    return (
      <DatabaseError message={errorConfig.message} title={errorConfig.title} />
    );
  },
);

LocationErrorHandler.displayName = "LocationErrorHandler";
