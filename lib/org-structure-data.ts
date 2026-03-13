import { prisma } from "@/lib/prisma"
import { hasPrismaDelegates } from "@/lib/prisma-runtime"
import {
  ORG_ROLE_RECORDS,
  buildOrgStructureFromRoles,
  getDepartmentsFromRoles,
  isValidOrgSelectionInRoles,
} from "@/lib/org-structure"

export async function getOrgRoles() {
  if (!hasPrismaDelegates("orgRole")) {
    return ORG_ROLE_RECORDS
  }

  try {
    const roles = await prisma.orgRole.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        department: true,
        parentRoleId: true,
        sortOrder: true,
        isActive: true,
      },
    })

    return roles.length > 0 ? roles : ORG_ROLE_RECORDS
  } catch {
    return ORG_ROLE_RECORDS
  }
}

export async function getOrgDepartments() {
  return getDepartmentsFromRoles(await getOrgRoles())
}

export async function getOrgStructure() {
  return buildOrgStructureFromRoles(await getOrgRoles())
}

export async function isValidOrgSelection(department: string, position: string) {
  return isValidOrgSelectionInRoles(await getOrgRoles(), department, position)
}
