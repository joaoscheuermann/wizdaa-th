import { redirect } from "next/navigation"

import { DEFAULT_EMPLOYEE_ID } from "@/domain/time-off/constants"

export default function Home() {
  redirect(`/${DEFAULT_EMPLOYEE_ID}`)
}
