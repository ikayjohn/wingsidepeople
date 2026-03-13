ALTER TABLE "SurveyResponse"
ADD COLUMN "responseToken" TEXT;

CREATE INDEX "SurveyResponse_surveyId_responseToken_idx"
ON "SurveyResponse"("surveyId", "responseToken");
