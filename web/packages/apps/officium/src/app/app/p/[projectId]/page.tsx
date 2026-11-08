import { ProjectBoardSurface } from "@/components/backlog/ProjectBoardSurface";

export const metadata = {
  title: "Officium — Board",
};

export default async function ProjectBoardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectBoardSurface projectId={projectId} />;
}
