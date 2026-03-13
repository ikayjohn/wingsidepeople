# Employee Onboarding Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade onboarding checklists into a structured, sequential workflow that supports videos, policy/manual reading, document uploads, quizzes, and digital contract signing.

**Architecture:** Extend the existing Prisma onboarding models with typed step metadata and submission fields, then update the admin and employee onboarding flows to create, submit, and track those structured steps. Sequence enforcement should happen in the API and be reflected in the UI so employees cannot skip ahead.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, PostgreSQL, Zod

---

### Task 1: Extend onboarding data model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260313110000_structured_onboarding_workflow/migration.sql`

**Step 1:** Add onboarding item type and metadata fields for links, content, quiz configuration, and upload/signature handling.

**Step 2:** Add progress submission fields for text, JSON responses, and uploaded files.

**Step 3:** Create the SQL migration for the schema changes.

### Task 2: Add workflow rules in onboarding APIs

**Files:**
- Modify: `app/api/admin/onboarding/templates/route.ts`
- Modify: `app/api/admin/onboarding/templates/[id]/route.ts`
- Modify: `app/api/onboarding/my-checklists/route.ts`
- Modify: `app/api/onboarding/progress/[progressId]/route.ts`
- Create: `lib/onboarding-workflow.ts`

**Step 1:** Validate typed onboarding items in admin create/update APIs.

**Step 2:** Return structured onboarding data and stage state in the employee checklist API.

**Step 3:** Enforce ordered completion and typed submissions in the progress update API.

### Task 3: Upgrade admin onboarding management

**Files:**
- Modify: `app/admin/onboarding/page.tsx`
- Modify: `app/api/admin/onboarding/progress/route.ts`

**Step 1:** Replace flat checklist-item inputs with typed onboarding-step inputs.

**Step 2:** Surface richer HR progress details, including current stage and completion summary.

### Task 4: Upgrade employee onboarding experience

**Files:**
- Modify: `app/onboarding/page.tsx`

**Step 1:** Render step-specific actions for videos, reading, uploads, quizzes, and signatures.

**Step 2:** Show locked/unlocked sequence state and prevent skipping ahead in the UI.

### Task 5: Validate the implementation

**Files:**
- Modify if needed: touched files above

**Step 1:** Run Prisma generate/validate.

**Step 2:** Run lint and typecheck.

**Step 3:** Fix any issues discovered during verification.
