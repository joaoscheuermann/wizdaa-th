export const queryKeys = {
  balances: {
    batch: ["balances", "batch"] as const,
    cell: (employeeId: string, locationId: string, timeOffTypeId: string) =>
      ["balance", employeeId, locationId, timeOffTypeId] as const,
  },
  mutations: {
    managerDecision: ["mutations", "manager-decision"] as const,
    submitRequest: ["mutations", "submit-request"] as const,
  },
  requests: {
    employee: (employeeId: string) => ["requests", employeeId] as const,
    pending: ["requests", "pending"] as const,
  },
  users: {
    byId: (userId: string) => ["users", userId] as const,
  },
}
