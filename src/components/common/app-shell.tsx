"use client"

import { AlertCircle } from "lucide-react"
import type { ReactNode } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  },
  manager: {
    label: "Manager",
    description: "Review pending requests",
  },
} satisfies Record<
  DemoUser["role"],
  {
    readonly label: string
    readonly description: string
  }
>

const getUserInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart.charAt(0).toUpperCase())
    .join("")

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
      >
        <InvalidUserState routeUserId={normalizedRouteUserId} />
      </ShellFrame>
    )
  }

  if (routeUserQuery.isLoading) {
    return (
      <ShellFrame
        description="Resolving the route user before opening a workspace."
      >
        <RouteUserLoading routeUserId={normalizedRouteUserId} />
      </ShellFrame>
    )
  }

  if (routeUserQuery.isError || !routeUser) {
    return (
      <ShellFrame
        description="The requested seeded user cannot be found."
      >
        <InvalidUserState
          error={routeUserQuery.error}
          routeUserId={normalizedRouteUserId}
        />
      </ShellFrame>
    )
  }

  const roleMetadata = routeRoleMetadata[routeUser.role]

  return (
    <ShellFrame
      description={roleMetadata.description}
      userSummary={
        <HeaderUserSummary
          name={routeUser.name}
          roleLabel={roleMetadata.label}
        />
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
  userSummary,
}: Readonly<{
  children: ReactNode
  description: string
  userSummary?: ReactNode
}>) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[92rem] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                ExampleHR Time-Off
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          {userSummary}
        </header>

        {children}
      </div>
    </main>
  )
}

function HeaderUserSummary({
  name,
  roleLabel,
}: Readonly<{
  name: string
  roleLabel: string
}>) {
  return (
    <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
      <div className="text-right leading-none">
        <div className="text-sm font-medium text-foreground">{name}</div>
        <div className="text-xs text-muted-foreground">{roleLabel}</div>
      </div>
      <Avatar aria-label={`${name}, ${roleLabel}`}>
        <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
          {getUserInitials(name)}
        </AvatarFallback>
      </Avatar>
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
      className="grid gap-4"
    >
      <RequestedPtoTable
        employeeId={routeUser.id}
        headerAction={<RequestPtoModal selectedEmployeeId={routeUser.id} />}
      />

      <BalanceSummary employeeId={routeUser.id} />
    </section>
  )
}

function ManagerPanel({
  routeUser,
}: Readonly<{
  routeUser: DemoUser
}>) {
  return (
    <div className="grid gap-5">
      <ManagerWorkspace />

      <section
        aria-label="Manager self-service"
        className="grid gap-4 border-t border-border pt-5"
      >
        <RequestedPtoTable
          employeeId={routeUser.id}
          headerAction={<RequestPtoModal selectedEmployeeId={routeUser.id} />}
        />
        <BalanceSummary employeeId={routeUser.id} />
      </section>
    </div>
  )
}
