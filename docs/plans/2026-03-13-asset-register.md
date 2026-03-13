# Asset Register Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the existing asset module into a fuller asset register with asset IDs, expected return dates, department visibility, and richer asset lifecycle tracking.

**Architecture:** Extend the current asset and assignment models with the missing tracking fields, then update the admin and employee asset pages plus server actions to capture registration, issuance, return, and status changes. Reuse the current asset module instead of creating a parallel inventory system.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, PostgreSQL, Zod

---

### Task 1: Extend asset data model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260313152000_asset_register_enhancements/migration.sql`

**Step 1:** Add business-facing asset ID and expected return tracking fields.

### Task 2: Upgrade asset actions

**Files:**
- Modify: `app/admin/assets/actions.ts`

**Step 1:** Capture asset ID and notes during registration.

**Step 2:** Capture expected return dates and department snapshot on assignment.

**Step 3:** Add richer return and asset status update workflows.

### Task 3: Upgrade asset UI

**Files:**
- Modify: `app/admin/assets/page.tsx`
- Modify: `app/my-assets/page.tsx`

**Step 1:** Surface richer asset register columns and assignment tracking.

**Step 2:** Show expected return dates and asset lifecycle statuses in employee history.

### Task 4: Validate

**Files:**
- Modify if needed: touched files above

**Step 1:** Run Prisma validate/generate.

**Step 2:** Run lint and typecheck.
