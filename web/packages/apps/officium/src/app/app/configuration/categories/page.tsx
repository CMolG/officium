import type { Metadata } from "next";

import { CategoriesView } from "@/components/settings/CategoriesView";

export const metadata: Metadata = {
  title: "Officium — Categories",
};

export default function CategoriesPage() {
  return <CategoriesView />;
}
