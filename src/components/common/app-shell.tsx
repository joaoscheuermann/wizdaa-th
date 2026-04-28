"use client"

import {
  AlertCircle,
  CalendarClock,
  Clock3,
  RefreshCcw,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import {
  BALANCE_FRESHNESS_THRESHOLD_MS,
  DEMO_TIME_ZONE,
  HCM_WRITE_TIMEOUT_MS,
} from "@/domain/time-off/constants"
import type { DemoUser } from "@/domain/time-off/types"
import { BalanceSummary } from "@/features/employee/balance-summary"
import { RequestPtoModal } from "@/features/employee/request-pto-modal"
import { RequestedPtoTable } from "@/features/employee/requested-pto-table"
import { ManagerWorkspace } from "@/features/manager/manager-workspace"
import { HcmClientError } from "@/lib/hcm-client/errors"
import { useRouteUserQuery } from "@/lib/queries/user-queries"

const routeRoleMetadata = {
  employee: {
    label: "Employee",
    description: "View balances and draft requests",
    icon: UserRound,
  },
  manager: {
    label: "Manager",
    description: "Review pending requests",
    icon: UsersRound,
  },
} satisfies Record<
  DemoUser["role"],
  {
    readonly label: string
    readonly description: string
    readonly icon: LucideIcon
  }
>

const formatSeconds = (milliseconds: number) =>
  `${Math.round(milliseconds / 1_000)}s`

interface AppShellProps {
  readonly routeUserId: string
}

export function AppShell({ routeUserId }: AppShellProps) {
  const normalizedRouteUserId = routeUserId.trim()
  const routeUserQuery = useRouteUserQuery(normalizedRouteUserId)
  const routeUser = routeUserQuery.data?.user

  if (normalizedRouteUserId.length === 0) {
    return (
      <ShellFrame
        description="The requested seeded user cannot be found."
        identityBadges={<Badge variant="destructive">Invalid user</Badge>}
      >
        <InvalidUserState routeUserId={normalizedRouteUserId} />
      </ShellFrame>
    )
  }

  if (routeUserQuery.isLoading) {
    return (
      <ShellFrame
        description="Resolving the route user before opening a workspace."
        identityBadges={
          <Badge variant="outline">Resolving {normalizedRouteUserId}</Badge>
        }
      >
        <RouteUserLoading routeUserId={normalizedRouteUserId} />
      </ShellFrame>
    )
  }

  if (routeUserQuery.isError || !routeUser) {
    return (
      <ShellFrame
        description="The requested seeded user cannot be found."
        identityBadges={<Badge variant="destructive">Invalid user</Badge>}
      >
        <InvalidUserState
          error={routeUserQuery.error}
          routeUserId={normalizedRouteUserId}
        />
      </ShellFrame>
    )
  }

  const roleMetadata = routeRoleMetadata[routeUser.role]
  const RoleIcon = roleMetadata.icon

  return (
    <ShellFrame
      description={roleMetadata.description}
      identityBadges={
        <>
          <Badge variant="secondary">{routeUser.name}</Badge>
          <Badge variant="outline">
            <RoleIcon data-icon="inline-start" />
            {roleMetadata.label}
          </Badge>
        </>
      }
    >
      {routeUser.role === "manager" ? (
        <ManagerPanel key={routeUser.id} routeUser={routeUser} />
      ) : (
        <EmployeePanel key={routeUser.id} routeUser={routeUser} />
      )}
    </ShellFrame>
  )
}

function ShellFrame({
  children,
  description,
  identityBadges,
}: Readonly<{
  children: ReactNode
  description: string
  identityBadges: ReactNode
}>) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/40 bg-card">
                ExampleHR
              </Badge>
              {identityBadges}
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                ExampleHR Time-Off
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3 lg:min-w-[34rem]">
            <StatusPill
              icon={CalendarClock}
              label="Demo timezone"
              value={DEMO_TIME_ZONE}
            />
            <StatusPill
              icon={RefreshCcw}
              label="Freshness"
              value={formatSeconds(BALANCE_FRESHNESS_THRESHOLD_MS)}
            />
            <StatusPill
              icon={Clock3}
              label="Write timeout"
              value={formatSeconds(HCM_WRITE_TIMEOUT_MS)}
            />
          </div>
        </header>

        {children}
      </div>
    </main>
  )
}

function StatusPill({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: LucideIcon
  label: string
  value: string
}>) {
  return (
    <div className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <div>
        <div className="text-xs font-medium uppercase text-muted-foreground">
          {label}
        </div>
        <div className="font-medium text-foreground">{value}</div>
      </div>
    </div>
  )
}

function RouteUserLoading({
  routeUserId,
}: Readonly<{
  routeUserId: string
}>) {
  return (
    <section
      aria-labelledby="route-user-loading-heading"
      className="rounded-lg border border-border bg-card px-4 py-8"
    >
      <h2 id="route-user-loading-heading" className="text-lg font-semibold">
        Resolving workspace
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Loading {routeUserId} from mock HCM.
      </p>
    </section>
  )
}

function InvalidUserState({
  error,
  routeUserId,
}: Readonly<{
  error?: unknown
  routeUserId: string
}>) {
  return (
    <section
      aria-labelledby="invalid-route-user-heading"
      className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-8"
    >
      <div className="flex max-w-2xl gap-3">
        <AlertCircle className="mt-1 size-5 text-destructive" aria-hidden="true" />
        <div>
          <h2 id="invalid-route-user-heading" className="text-lg font-semibold">
            User not found
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {getInvalidUserMessage(routeUserId, error)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Use one of the seeded paths: /emp-avery, /emp-jordan, or
            /mgr-morgan.
          </p>
        </div>
      </div>
    </section>
  )
}

const getInvalidUserMessage = (routeUserId: string, error: unknown) => {
  if (routeUserId.length === 0) return "No route user was provided."
  if (error instanceof HcmClientError) return error.message
  if (error instanceof Error) return error.message

  return `No seeded ExampleHR user exists for "${routeUserId}".`
}

function EmployeePanel({
  routeUser,
}: Readonly<{
  routeUser: DemoUser
}>) {
  return (
    <section
      aria-labelledby="employee-workspace-heading"
      className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"
    >
      <BalanceSummary employeeId={routeUser.id} />

      <RequestedPtoTable
        employeeId={routeUser.id}
        headerAction={<RequestPtoModal selectedEmployeeId={routeUser.id} />}
      />
    </section>
  )
}

function ManagerPanel({
  routeUser,
}: Readonly<{
  routeUser: DemoUser
}>) {
  return (
    <div className="grid gap-4">
      <ManagerWorkspace />

      <section
        aria-label="Manager self-service"
        className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <BalanceSummary employeeId={routeUser.id} />
        <RequestedPtoTable
          employeeId={routeUser.id}
          headerAction={<RequestPtoModal selectedEmployeeId={routeUser.id} />}
        />
      </section>
    </div>
  )
}
