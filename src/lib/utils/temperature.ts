import type { TemperatureUnit } from "@/lib/constants";

export const celsiusToFahrenheit = (celsius: number): number =>
  (celsius * 9) / 5 + 32;

export const fahrenheitToCelsius = (fahrenheit: number): number =>
  ((fahrenheit - 32) * 5) / 9;

export const roundedCelsiusToFahrenheit = (celsius: number): number =>
  Math.round(celsiusToFahrenheit(celsius));

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
