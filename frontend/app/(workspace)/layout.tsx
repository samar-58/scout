import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ProjectsProvider } from "@/components/shell/projects-store";
import { WorkspaceShell } from "@/components/shell/workspace-shell";

/**
 * Everything behind sign-in shares one layout: the auth guard, one projects
 * fetch, and the sidebar shell. Previously `/app` and `/projects` each had
 * their own guard and their own header, which is why the two screens never
 * quite felt like the same product.
 */
export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <ProjectsProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </ProjectsProvider>
  );
}
