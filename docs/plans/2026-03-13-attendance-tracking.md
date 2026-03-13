# Attendance Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add attendance tracking so employees can view check-in/check-out history and overtime while managers and HR can monitor attendance records.

**Architecture:** Introduce an attendance record model plus shared duration/overtime helpers, then add an employee attendance page and a management oversight page with server actions for recording attendance entries. Reuse the existing admin/portal navigation and role-scoping patterns already used by the HR modules.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, PostgreSQL, Zod

---

### Task 1: Extend attendance data model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260313162000_attendance_tracking/migration.sql`

**Step 1:** Add attendance records linked to employees with check-in, check-out, overtime, and department snapshot fields.

### Task 2: Add shared attendance helpers and actions

**Files:**
- Create: `lib/attendance.ts`
- Create: `app/admin/attendance/actions.ts`

**Step 1:** Centralize worked-hours and overtime calculations.

**Step 2:** Add management actions to log attendance and close attendance sessions.

### Task 3: Add attendance pages and navigation

**Files:**
- Create: `app/attendance/page.tsx`
- Create: `app/attendance/layout.tsx`
- Create: `app/admin/attendance/page.tsx`
- Modify: `components/Navbar.tsx`
- Modify: `components/AdminShellNav.tsx`
- Modify: `lib/rbac.ts`
- Modify: `app/admin/page.tsx`

**Step 1:** Add employee attendance history and overtime summaries.

**Step 2:** Add HR/manager attendance oversight and attendance logging tools.

### Task 4: Validate

**Files:**
- Modify if needed: touched files above

**Step 1:** Run Prisma validate/generate.

**Step 2:** Run lint and typecheck.
