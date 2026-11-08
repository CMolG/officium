import { OrganizationSurface } from "@/components/organization/OrganizationSurface";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Officium — Organization",
};

export default function OrganizationPage() {
  return <OrganizationSurface />;
}
