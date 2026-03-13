import { describe, expect, it } from "vitest"
import {
  ORG_ROLE_RECORDS,
  buildOrgStructureFromRoles,
  getDepartmentsFromRoles,
  getRecommendedManagerIdsForRole,
  getRoleOptionsByDepartment,
  isValidOrgSelectionInRoles,
} from "@/lib/org-structure"

describe("org structure helpers", () => {
  it("derives departments and roles from the managed role list", () => {
    const departments = getDepartmentsFromRoles(ORG_ROLE_RECORDS)
    const creativeRoles = getRoleOptionsByDepartment(ORG_ROLE_RECORDS, "Creative & Digital")

    expect(departments).toContain("Creative & Digital")
    expect(creativeRoles.map((role) => role.title)).toEqual([
      "Creative Lead",
      "Content Creator",
      "Social Media",
    ])
  })

  it("validates department/position combinations against the available roles", () => {
    expect(isValidOrgSelectionInRoles(ORG_ROLE_RECORDS, "Creative & Digital", "Creative Lead")).toBe(true)
    expect(isValidOrgSelectionInRoles(ORG_ROLE_RECORDS, "Creative & Digital", "Dispatcher")).toBe(false)
  })

  it("recommends the parent-role occupant as line manager", () => {
    const users = [
      { id: "ceo", department: "Executive", position: "MD/CEO", status: "active" },
      { id: "creative-lead-1", department: "Creative & Digital", position: "Creative Lead", status: "active" },
      { id: "content-1", department: "Creative & Digital", position: "Content Creator", status: "active" },
    ]

    expect(
      getRecommendedManagerIdsForRole(ORG_ROLE_RECORDS, users, "Creative & Digital", "Content Creator")
    ).toEqual(["creative-lead-1"])
  })

  it("builds the nested hierarchy from flat role records", () => {
    const tree = buildOrgStructureFromRoles(ORG_ROLE_RECORDS)
    const mdCeo = tree[0]
    const creative = mdCeo.children?.find((node) => node.title === "Creative Lead")

    expect(mdCeo.title).toBe("MD/CEO")
    expect(creative?.children?.map((node) => node.title)).toEqual(["Content Creator", "Social Media"])
  })
})
