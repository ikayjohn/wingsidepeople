import { describe, expect, it } from "vitest"
import { buildChartTree } from "@/lib/org-chart"
import { normalizeUserImage } from "@/lib/avatar"
import { buildOrgStructureFromRoles, ORG_ROLE_RECORDS } from "@/lib/org-structure"

describe("avatar and org chart helpers", () => {
  it("normalizes legacy avatar paths to user-specific profile photo routes", () => {
    expect(normalizeUserImage("/api/profile/photo", "user-1")).toBe("/api/profile/photo/user-1")
    expect(normalizeUserImage("/uploads/avatars/user-1.jpg", "user-1")).toBe("/api/profile/photo/user-1")
    expect(normalizeUserImage("/api/profile/photo/user-1", "user-1")).toBe("/api/profile/photo/user-1")
  })

  it("matches org-chart occupants by department and position while allowing shared roles", () => {
    const tree = buildChartTree(buildOrgStructureFromRoles(ORG_ROLE_RECORDS), [
      {
        id: "cook-1",
        name: "Cook One",
        preferredName: null,
        position: "Cook",
        department: "Operations",
        image: "/api/profile/photo",
        email: "cook1@example.com",
      },
      {
        id: "cook-2",
        name: "Cook Two",
        preferredName: null,
        position: "Cook",
        department: "Operations",
        image: "/api/profile/photo",
        email: "cook2@example.com",
      },
      {
        id: "analyst-1",
        name: "Analyst",
        preferredName: null,
        position: "Data Analyst",
        department: "Marketing & Sales",
        image: null,
        email: "analyst@example.com",
      },
    ])

    const operations = tree[0].children?.find((node) => node.name === "Operations Manager")
    const shiftManager = operations?.children?.find((node) => node.name === "Shift Manager/Supervisor")
    const cook = shiftManager?.children?.find((node) => node.name === "Cook")
    const marketing = tree[0].children?.find((node) => node.name === "Marketing/Sales Lead")
    const analyst = marketing?.children?.find((node) => node.name === "Data Analyst")

    expect(cook?.headcount).toBe(2)
    expect(cook?.occupantSummary).toBe("2 employees assigned")
    expect(cook?.image).toBe("/api/profile/photo/cook-1")
    expect(analyst?.headcount).toBe(1)
    expect(analyst?.occupantSummary).toBe("Filled by Analyst")
  })
})
