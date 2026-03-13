export type OrgStructureNode = {
  id: string
  title: string
  department: string
  children?: OrgStructureNode[]
}

export type OrgRoleRecord = {
  id: string
  title: string
  department: string
  parentRoleId: string | null
  sortOrder: number
  isActive: boolean
}

export const ORG_STRUCTURE: OrgStructureNode[] = [
  {
    id: "md-ceo",
    title: "MD/CEO",
    department: "Executive",
    children: [
      {
        id: "head-hr",
        title: "Head of Human Resources",
        department: "Human Resources",
        children: [
          { id: "hr-manager", title: "Human Resources Manager", department: "Human Resources" },
          { id: "admin-support", title: "Administrative Support", department: "Human Resources" },
        ],
      },
      {
        id: "marketing-sales-lead",
        title: "Marketing/Sales Lead",
        department: "Marketing & Sales",
        children: [
          { id: "marketing-executive", title: "Marketing Executive", department: "Marketing & Sales" },
          { id: "sales-executive", title: "Sales Executive", department: "Marketing & Sales" },
          { id: "data-analyst", title: "Data Analyst", department: "Marketing & Sales" },
          { id: "customer-service-representatives", title: "Customer Service Representatives", department: "Marketing & Sales" },
          { id: "customer-experience-desk", title: "Customer Experience Desk", department: "Marketing & Sales" },
        ],
      },
      {
        id: "creative-digital",
        title: "Creative Lead",
        department: "Creative & Digital",
        children: [
          { id: "content-creator", title: "Content Creator", department: "Creative & Digital" },
          { id: "social-media", title: "Social Media", department: "Creative & Digital" },
        ],
      },
      {
        id: "operations-manager",
        title: "Operations Manager",
        department: "Operations",
        children: [
          {
            id: "production-manager",
            title: "Production Manager",
            department: "Operations",
            children: [
              { id: "production-assistant-manager", title: "Production Assistant Manager", department: "Operations" },
            ],
          },
          {
            id: "shift-manager-supervisor",
            title: "Shift Manager/Supervisor",
            department: "Operations",
            children: [
              { id: "cook", title: "Cook", department: "Operations" },
              { id: "kitchen-assistant", title: "Kitchen Assistant", department: "Operations" },
              { id: "butchers", title: "Butchers", department: "Operations" },
              { id: "janitors", title: "Janitors", department: "Operations" },
            ],
          },
          {
            id: "procurement-manager",
            title: "Procurement Manager",
            department: "Operations",
            children: [
              { id: "procurement-officer", title: "Procurement Officer", department: "Operations" },
            ],
          },
        ],
      },
      {
        id: "inventory-manager",
        title: "Inventory Manager",
        department: "Inventory",
        children: [
          { id: "inventory-supervisor", title: "Inventory Supervisor", department: "Inventory" },
        ],
      },
      {
        id: "account-finance-manager",
        title: "Account/Finance Manager",
        department: "Finance",
        children: [
          { id: "accountant", title: "Accountant", department: "Finance" },
        ],
      },
      {
        id: "delivery-manager",
        title: "Delivery Manager",
        department: "Delivery",
        children: [
          {
            id: "dispatcher",
            title: "Dispatcher",
            department: "Delivery",
            children: [
              { id: "dispatch-rider", title: "Dispatch Rider", department: "Delivery" },
            ],
          },
        ],
      },
      {
        id: "facility-manager",
        title: "Facility Manager",
        department: "Facilities",
        children: [
          { id: "maintenance-officer", title: "Maintenance Officer", department: "Facilities" },
        ],
      },
    ],
  },
]

export type OrgRoleOption = {
  department: string
  title: string
}

function collectFallbackRoleRecords(
  nodes: OrgStructureNode[],
  parentRoleId: string | null = null,
  orderState: { value: number } = { value: 0 }
): OrgRoleRecord[] {
  return nodes.flatMap((node) => {
    const sortOrder = orderState.value++
    return [
      {
        id: node.id,
        title: node.title,
        department: node.department,
        parentRoleId,
        sortOrder,
        isActive: true,
      },
      ...collectFallbackRoleRecords(node.children ?? [], node.id, orderState),
    ]
  })
}

export function getRoleOptionsByDepartment(roles: Array<OrgRoleRecord | OrgRoleOption>, department: string) {
  return roles
    .filter((item) => item.department === department)
    .map((item) => ({ department: item.department, title: item.title }))
}

export function getDepartmentsFromRoles(roles: Array<OrgRoleRecord | OrgRoleOption>) {
  return Array.from(new Set(roles.map((item) => item.department)))
}

export function buildOrgStructureFromRoles(roles: OrgRoleRecord[]): OrgStructureNode[] {
  const activeRoles = roles
    .filter((role) => role.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))

  const childrenByParent = new Map<string | null, OrgRoleRecord[]>()
  for (const role of activeRoles) {
    const list = childrenByParent.get(role.parentRoleId) ?? []
    list.push(role)
    childrenByParent.set(role.parentRoleId, list)
  }

  function build(parentRoleId: string | null): OrgStructureNode[] {
    return (childrenByParent.get(parentRoleId) ?? []).map((role) => ({
      id: role.id,
      title: role.title,
      department: role.department,
      children: build(role.id),
    }))
  }

  return build(null)
}

export function isValidOrgSelectionInRoles(
  roles: Array<OrgRoleRecord | OrgRoleOption>,
  department: string,
  position: string
) {
  return roles.some((item) => item.department === department && item.title === position)
}

export function getRecommendedManagerIdsForRole(
  roles: OrgRoleRecord[],
  users: Array<{ id: string; department: string | null; position: string | null; status?: string | null }>,
  department: string,
  position: string
) {
  const activeRoles = roles.filter((role) => role.isActive)
  const rolesById = new Map(activeRoles.map((role) => [role.id, role]))
  const currentRole = activeRoles.find((role) => role.department === department && role.title === position)
  if (!currentRole) return []

  let parentRoleId = currentRole.parentRoleId
  while (parentRoleId) {
    const parentRole = rolesById.get(parentRoleId)
    if (!parentRole) break

    const matchingUsers = users
      .filter((user) => user.id && user.department === parentRole.department && user.position === parentRole.title)
      .filter((user) => !user.status || user.status === "active")
      .map((user) => user.id)

    if (matchingUsers.length > 0) {
      return matchingUsers
    }

    parentRoleId = parentRole.parentRoleId
  }

  return []
}

export const ORG_ROLE_RECORDS = collectFallbackRoleRecords(ORG_STRUCTURE)
export const ORG_ROLE_OPTIONS = ORG_ROLE_RECORDS.map((item) => ({
  department: item.department,
  title: item.title,
}))
export const ORG_DEPARTMENTS = getDepartmentsFromRoles(ORG_ROLE_OPTIONS)

export function getRolesByDepartment(department: string) {
  return getRoleOptionsByDepartment(ORG_ROLE_OPTIONS, department)
}
