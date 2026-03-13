CREATE TABLE "OrgRole" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "parentRoleId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgRole_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrgRole_department_sortOrder_title_idx" ON "OrgRole"("department", "sortOrder", "title");
CREATE INDEX "OrgRole_parentRoleId_sortOrder_idx" ON "OrgRole"("parentRoleId", "sortOrder");

ALTER TABLE "OrgRole"
ADD CONSTRAINT "OrgRole_parentRoleId_fkey"
FOREIGN KEY ("parentRoleId") REFERENCES "OrgRole"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "OrgRole" ("id", "title", "department", "parentRoleId", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES
  ('md-ceo', 'MD/CEO', 'Executive', NULL, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('head-hr', 'Head of Human Resources', 'Human Resources', 'md-ceo', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hr-manager', 'Human Resources Manager', 'Human Resources', 'head-hr', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('admin-support', 'Administrative Support', 'Human Resources', 'head-hr', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing-sales-lead', 'Marketing/Sales Lead', 'Marketing & Sales', 'md-ceo', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing-executive', 'Marketing Executive', 'Marketing & Sales', 'marketing-sales-lead', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sales-executive', 'Sales Executive', 'Marketing & Sales', 'marketing-sales-lead', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('data-analyst', 'Data Analyst', 'Marketing & Sales', 'marketing-sales-lead', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('customer-service-representatives', 'Customer Service Representatives', 'Marketing & Sales', 'marketing-sales-lead', 8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('customer-experience-desk', 'Customer Experience Desk', 'Marketing & Sales', 'marketing-sales-lead', 9, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('creative-digital', 'Creative Lead', 'Creative & Digital', 'md-ceo', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('content-creator', 'Content Creator', 'Creative & Digital', 'creative-digital', 11, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('social-media', 'Social Media', 'Creative & Digital', 'creative-digital', 12, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('operations-manager', 'Operations Manager', 'Operations', 'md-ceo', 13, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('production-manager', 'Production Manager', 'Operations', 'operations-manager', 14, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('production-assistant-manager', 'Production Assistant Manager', 'Operations', 'production-manager', 15, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('shift-manager-supervisor', 'Shift Manager/Supervisor', 'Operations', 'operations-manager', 16, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cook', 'Cook', 'Operations', 'shift-manager-supervisor', 17, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kitchen-assistant', 'Kitchen Assistant', 'Operations', 'shift-manager-supervisor', 18, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('butchers', 'Butchers', 'Operations', 'shift-manager-supervisor', 19, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('janitors', 'Janitors', 'Operations', 'shift-manager-supervisor', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('procurement-manager', 'Procurement Manager', 'Operations', 'operations-manager', 21, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('procurement-officer', 'Procurement Officer', 'Operations', 'procurement-manager', 22, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inventory-manager', 'Inventory Manager', 'Inventory', 'md-ceo', 23, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inventory-supervisor', 'Inventory Supervisor', 'Inventory', 'inventory-manager', 24, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('account-finance-manager', 'Account/Finance Manager', 'Finance', 'md-ceo', 25, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('accountant', 'Accountant', 'Finance', 'account-finance-manager', 26, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('delivery-manager', 'Delivery Manager', 'Delivery', 'md-ceo', 27, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dispatcher', 'Dispatcher', 'Delivery', 'delivery-manager', 28, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dispatch-rider', 'Dispatch Rider', 'Delivery', 'dispatcher', 29, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('facility-manager', 'Facility Manager', 'Facilities', 'md-ceo', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('maintenance-officer', 'Maintenance Officer', 'Facilities', 'facility-manager', 31, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
