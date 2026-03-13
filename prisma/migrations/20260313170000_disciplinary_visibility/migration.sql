-- Employee-facing visibility controls for disciplinary cases and actions

ALTER TABLE "DisciplinaryCase"
ADD COLUMN "visibleToEmployee" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DisciplinaryAction"
ADD COLUMN "visibleToEmployee" BOOLEAN NOT NULL DEFAULT false;
