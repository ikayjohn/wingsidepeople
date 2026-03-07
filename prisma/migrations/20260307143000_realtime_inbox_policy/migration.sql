DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'realtime'
      AND tablename = 'messages'
      AND policyname = 'authenticated_can_receive_user_inbox_broadcasts'
  ) THEN
    CREATE POLICY "authenticated_can_receive_user_inbox_broadcasts"
    ON realtime.messages
    FOR SELECT
    TO authenticated
    USING (
      realtime.messages.extension = 'broadcast'
      AND EXISTS (
        SELECT 1
        FROM public."User"
        WHERE lower("User"."email") = lower(coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), ''))
          AND concat('user-inbox:', "User"."id") = realtime.topic()
      )
    );
  END IF;
END $$;
