export { AnalyticsProvider } from "./AnalyticsProvider";
export { ConsentBanner } from "./ConsentBanner";
export { ConsentLink } from "./ConsentLink";

export function trackConversion(_name: string, _detail?: Record<string, string>): void {}
