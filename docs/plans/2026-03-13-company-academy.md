# Company Academy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the current training materials feature into a structured Company Academy with targeted learning paths, module-level training content, quizzes, completion tracking, and certification visibility.

**Architecture:** Extend the existing academy schema with course targeting and certificate metadata, then update admin and employee academy flows to manage richer modules and track progress at the module level. Completion should derive from module progress plus assessment outcomes so HR can measure real learning progress instead of simple enrollment state.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, PostgreSQL, Zod

---

### Task 1: Extend academy data model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260313124500_company_academy_expansion/migration.sql`

**Step 1:** Add department, position, learning path, and certificate metadata to courses.

**Step 2:** Add richer module content support and module completion timestamps to enrollments.

### Task 2: Add academy domain helpers and server actions

**Files:**
- Create: `lib/academy.ts`
- Modify: `app/academy/actions.ts`
- Modify: `app/admin/academy/actions.ts`

**Step 1:** Centralize progress calculation and module-completion logic.

**Step 2:** Add employee actions to complete modules and keep enrollment progress in sync.

**Step 3:** Upgrade admin actions to create richer courses and assessments.

### Task 3: Upgrade employee academy experience

**Files:**
- Modify: `app/academy/page.tsx`

**Step 1:** Show targeted learning paths and module-by-module training delivery.

**Step 2:** Add completion controls, quiz flow, and certificate visibility.

### Task 4: Upgrade admin academy management

**Files:**
- Modify: `app/admin/academy/page.tsx`

**Step 1:** Add richer course creation inputs for learning path targeting, certificate title, and module metadata.

**Step 2:** Surface role-based targeting and completion metrics in the admin dashboard.

### Task 5: Validate

**Files:**
- Modify if needed: touched files above

**Step 1:** Run Prisma validate/generate.

**Step 2:** Run lint and typecheck.
