/** A country a phone number can start in: its ISO 3166-1 alpha-2 code, its name and its dialing prefix. */
export interface PhoneCountry {
  iso: string;
  name: string;
  dial: string;
}

/**
 * The countries `PhoneInput` offers by default: the ones Javadaba's audience writes from, Spain first. It is a
 * short list on purpose; a product that needs every country passes its own `countries`.
 */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { iso: "ES", name: "Spain", dial: "+34" },
  { iso: "PT", name: "Portugal", dial: "+351" },
  { iso: "FR", name: "France", dial: "+33" },
  { iso: "DE", name: "Germany", dial: "+49" },
  { iso: "IT", name: "Italy", dial: "+39" },
  { iso: "GB", name: "United Kingdom", dial: "+44" },
  { iso: "IE", name: "Ireland", dial: "+353" },
  { iso: "NL", name: "Netherlands", dial: "+31" },
  { iso: "BE", name: "Belgium", dial: "+32" },
  { iso: "CH", name: "Switzerland", dial: "+41" },
  { iso: "AT", name: "Austria", dial: "+43" },
  { iso: "SE", name: "Sweden", dial: "+46" },
  { iso: "NO", name: "Norway", dial: "+47" },
  { iso: "DK", name: "Denmark", dial: "+45" },
  { iso: "FI", name: "Finland", dial: "+358" },
  { iso: "PL", name: "Poland", dial: "+48" },
  { iso: "US", name: "United States", dial: "+1" },
  { iso: "CA", name: "Canada", dial: "+1" },
  { iso: "MX", name: "Mexico", dial: "+52" },
  { iso: "CO", name: "Colombia", dial: "+57" },
  { iso: "AR", name: "Argentina", dial: "+54" },
  { iso: "CL", name: "Chile", dial: "+56" },
  { iso: "PE", name: "Peru", dial: "+51" },
  { iso: "UY", name: "Uruguay", dial: "+598" },
  { iso: "VE", name: "Venezuela", dial: "+58" },
  { iso: "EC", name: "Ecuador", dial: "+593" },
  { iso: "BR", name: "Brazil", dial: "+55" },
  { iso: "AU", name: "Australia", dial: "+61" },
  { iso: "IN", name: "India", dial: "+91" },
  { iso: "JP", name: "Japan", dial: "+81" },
];
