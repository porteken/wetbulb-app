import type { TemperatureUnit } from "@/lib/constants";

/** Exact C->F conversion; the DB stores wetbulb values in °C. */
export const celsiusToFahrenheit = (celsius: number): number =>
  (celsius * 9) / 5 + 32;

/** Exact F->C conversion, kept for symmetry/potential reverse use. */
export const fahrenheitToCelsius = (fahrenheit: number): number =>
  ((fahrenheit - 32) * 5) / 9;

/** C->F conversion rounded to the nearest whole °F, used only when deriving
 * the wetbulb index's fixed threshold boundaries for display. */
export const roundedCelsiusToFahrenheit = (celsius: number): number =>
  Math.round(celsiusToFahrenheit(celsius));

/** Converts a °C/year (or other delta) rate, which has no +32 offset to apply. */
export const celsiusDeltaToFahrenheit = (celsiusDelta: number): number =>
  (celsiusDelta * 9) / 5;

export const convertFromCelsius = (
  celsiusValue: number,
  unit: TemperatureUnit,
): number => (unit === "F" ? celsiusToFahrenheit(celsiusValue) : celsiusValue);

export const formatTemperature = (
  celsiusValue: number,
  unit: TemperatureUnit,
  decimals = 1,
): string =>
  `${convertFromCelsius(celsiusValue, unit).toFixed(decimals)}°${unit}`;
