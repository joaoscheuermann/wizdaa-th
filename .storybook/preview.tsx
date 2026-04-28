import type { Decorator, Preview } from "@storybook/nextjs-vite"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

import "@/app/globals.css"
import type { HcmStatePatch } from "@/domain/time-off/types"
import { installHcmFixtureFetch } from "@/test/hcm-fixture-fetch"

interface HcmStoryParameters {
  readonly delaySubmitMs?: number
  readonly failBatch?: boolean
  readonly failEmployeeRequests?: boolean
  readonly failFirstDecision?: boolean
  readonly failFirstSubmit?: boolean
  readonly failPendingRequests?: boolean
  readonly holdEmployeeRequests?: boolean
  readonly statePatch?: HcmStatePatch
}

const withHcmFixtures: Decorator = (Story, context) => {
  const hcm = (context.parameters.hcm ?? {}) as HcmStoryParameters
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  installHcmFixtureFetch(hcm)

  const StoryFrame = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={queryClient}>
      <main className="min-h-screen bg-[#f7f8f5] p-6 text-[#14201b]">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </QueryClientProvider>
  )

  return (
    <StoryFrame>
      <Story />
    </StoryFrame>
  )
}

const preview: Preview = {
  decorators: [withHcmFixtures],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  tags: ["autodocs", "test"],
}

export default preview
