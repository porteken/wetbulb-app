import type { TemperatureUnit } from "@/lib/constants";

/** Exact F->C conversion; the DB stores wetbulb values in °F. */
export const fahrenheitToCelsius = (fahrenheit: number): number =>
  ((fahrenheit - 32) * 5) / 9;

/** C->F conversion rounded to the nearest whole °F, per the app's threshold convention. */
export const celsiusToFahrenheit = (celsius: number): number =>
  Math.round((celsius * 9) / 5 + 32);

/** Converts a °F/year (or other delta) rate, which has no +32 offset to apply. */
export const fahrenheitDeltaToCelsius = (fahrenheitDelta: number): number =>
  (fahrenheitDelta * 5) / 9;

export const convertFromFahrenheit = (
  fahrenheitValue: number,
  unit: TemperatureUnit,
): number =>
  unit === "C" ? fahrenheitToCelsius(fahrenheitValue) : fahrenheitValue;

export const formatTemperature = (
  fahrenheitValue: number,
  unit: TemperatureUnit,
  decimals = 1,
): string =>
  `${convertFromFahrenheit(fahrenheitValue, unit).toFixed(decimals)}°${unit}`;
