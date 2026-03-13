# Disciplinary Tracking Enhancement Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the existing disciplinary module into a fuller HR-controlled case tracker with warnings, actions, suspensions, investigations, management decisions, and limited employee-facing status visibility.

**Architecture:** Extend the current disciplinary schema with visibility flags, then add richer admin actions for case progress and action logging plus an employee read-only disciplinary page that only exposes HR-approved updates.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, PostgreSQL, Zod

---

### Task 1: Extend disciplinary data model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260313170000_disciplinary_visibility/migration.sql`

**Step 1:** Add employee-visibility flags to disciplinary cases and actions.

### Task 2: Add admin workflows

**Files:**
- Modify: `app/admin/disciplinary/actions.ts`
- Modify: `app/admin/disciplinary/page.tsx`

**Step 1:** Support case status/outcome updates.

**Step 2:** Support disciplinary action logging with optional employee visibility.

### Task 3: Add employee disciplinary view

**Files:**
- Create: `app/disciplinary/page.tsx`
- Create: `app/disciplinary/layout.tsx`
- Modify: `components/Navbar.tsx`

**Step 1:** Show only relevant disciplinary status updates and employee-visible actions.

### Task 4: Validate

**Files:**
- Modify if needed: touched files above

**Step 1:** Run Prisma validate/generate.

**Step 2:** Run lint and typecheck.
