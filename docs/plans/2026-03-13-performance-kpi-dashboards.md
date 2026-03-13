# Performance KPI Dashboards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the existing performance module into a usable KPI management system with scoped goal ownership, employee progress updates, department dashboards, and management visibility.

**Architecture:** Reuse the current goal/KPI/review schema and add shared performance aggregation helpers plus role-aware server actions. Upgrade the employee and admin performance pages to surface personal progress, department performance, and company goal rollups from the existing data model.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, PostgreSQL, Zod

---

### Task 1: Add shared performance helpers

**Files:**
- Create: `lib/performance.ts`

**Step 1:** Centralize KPI percentage and dashboard rollup logic.

### Task 2: Add scoped performance actions

**Files:**
- Modify: `app/admin/performance/actions.ts`

**Step 1:** Restrict company-goal creation to HR/admin roles.

**Step 2:** Restrict department KPI and employee KPI assignment by role scope.

**Step 3:** Add update actions for company, department, and employee KPI progress.

### Task 3: Upgrade employee KPI experience

**Files:**
- Modify: `app/my-kpis/page.tsx`

**Step 1:** Add personal KPI progress update forms.

**Step 2:** Add department and company performance summaries visible to employees.

### Task 4: Upgrade management dashboard

**Files:**
- Modify: `app/admin/performance/page.tsx`

**Step 1:** Add richer progress controls for company goals and department KPIs.

**Step 2:** Add department performance dashboard and team KPI visibility for managers and HR.

### Task 5: Validate

**Files:**
- Modify if needed: touched files above

**Step 1:** Run lint and typecheck.
