import { OfficiumLanding } from "@/components/marketing/OfficiumLanding";

// The product page whatever the session (JAVA-1024). It duplicates `/`, so it shares its
// metadata, canonical included: absolute, and no `noindex` (a canonical plus `noindex` sends
// mixed signals).
export { metadata } from "../page";

export default function OfficiumLandingPage() {
  return <OfficiumLanding />;
}
