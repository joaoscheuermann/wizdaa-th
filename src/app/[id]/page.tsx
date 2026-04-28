import { AppShell } from "@/components/common/app-shell"

interface RouteUserPageProps {
  readonly params: Promise<{
    readonly id: string
  }>
}

export default async function RouteUserPage({ params }: RouteUserPageProps) {
  const { id } = await params

  return <AppShell routeUserId={id} />
}
