"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { useControllable } from "../lib/use-controllable";
import { Input, type InputProps } from "./input";
import { PHONE_COUNTRIES, type PhoneCountry } from "./phone-countries";
import { Select } from "./select";

export interface PhoneInputProps extends Omit<InputProps, "type" | "value" | "defaultValue" | "onChange"> {
  /** The number after the prefix, as the person typed it. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** The chosen country, by ISO code. */
  country?: string;
  defaultCountry?: string;
  onCountryChange?: (country: PhoneCountry) => void;
  /** The countries on offer; the default is a short list (`PHONE_COUNTRIES`). */
  countries?: readonly PhoneCountry[];
  /** The prefix button's name, told the country: "Country code: Spain, +34". */
  countryLabel?: (country: PhoneCountry) => string;
}

/**
 * PhoneInput (Lib-Controls § Input · Phone): the country's prefix as a button that opens a list (the library's
 * `Select`: each option is the prefix with the country's name under it), and the number beside it. The prefix
 * button is named for what it holds ("Country code: Spain, +34"), never just "+34". Join them for the form with
 * `${country.dial}${value}`; this piece does not guess a national format.
 */
export function PhoneInput({
  value,
  defaultValue = "",
  onValueChange,
  country,
  defaultCountry = "ES",
  onCountryChange,
  countries = PHONE_COUNTRIES,
  countryLabel = (c) => `Country code: ${c.name}, ${c.dial}`,
  className,
  disabled,
  ...rest
}: PhoneInputProps) {
  const [iso, setIso] = useControllable(country, defaultCountry);
  const [number, setNumber] = useControllable(value, defaultValue, onValueChange);
  const chosen = countries.find((c) => c.iso === iso) ?? countries[0];
  return (
    <div className="flex flex-row gap-2">
      <Select
        aria-label={countryLabel(chosen)}
        value={chosen.iso}
        disabled={disabled}
        menuWidth={260}
        className="w-auto min-w-[5.5rem] shrink-0"
        options={countries.map((c) => ({ value: c.iso, label: c.dial, description: c.name }))}
        onChange={(next) => {
          const picked = countries.find((c) => c.iso === next);
          if (!picked) return;
          setIso(picked.iso);
          onCountryChange?.(picked);
        }}
      />
      <Input
        {...rest}
        type="tel"
        inputMode="tel"
        autoComplete={rest.autoComplete ?? "tel-national"}
        disabled={disabled}
        value={number}
        onChange={(event) => setNumber(event.target.value)}
        className={cn("min-w-0 flex-1", className)}
      />
    </div>
  );
}
