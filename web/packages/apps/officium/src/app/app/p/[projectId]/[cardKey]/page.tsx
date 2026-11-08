import { CardPageSurface } from "@/components/backlog/CardPageSurface";

export const metadata = {
  title: "Officium — Card",
};

/** A card's own page (JAVA-1567): the card fills the work canvas. The board's modal opens no address of its own. */
export default async function ProjectCardPage({ params }: { params: Promise<{ projectId: string; cardKey: string }> }) {
  const { projectId, cardKey } = await params;
  return <CardPageSurface key={`${projectId}/${cardKey}`} projectId={projectId} cardKey={cardKey} />;
}
