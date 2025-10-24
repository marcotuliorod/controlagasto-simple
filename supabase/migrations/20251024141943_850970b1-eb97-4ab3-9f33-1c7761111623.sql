-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule: Process recurring expenses daily at 00:01
SELECT cron.schedule(
  'process-recurring-expenses-daily',
  '1 0 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://mnznxdewqjyhvrctllgh.supabase.co/functions/v1/process-recurring-expenses',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uem54ZGV3cWp5aHZyY3RsbGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjE5OTEsImV4cCI6MjA3NjczNzk5MX0.VSbqTCAIJpa7iQ70DnzqUwk05IockVqen0LHPoGsnZc"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Schedule: Process scheduled exports - check every hour
SELECT cron.schedule(
  'process-scheduled-exports-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://mnznxdewqjyhvrctllgh.supabase.co/functions/v1/process-scheduled-exports',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uem54ZGV3cWp5aHZyY3RsbGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjE5OTEsImV4cCI6MjA3NjczNzk5MX0.VSbqTCAIJpa7iQ70DnzqUwk05IockVqen0LHPoGsnZc"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Create function to check scheduled exports (called by cron)
CREATE OR REPLACE FUNCTION check_scheduled_exports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function is called by the edge function
  -- We don't need to do anything here since the edge function handles the logic
  RETURN;
END;
$$;

COMMENT ON FUNCTION check_scheduled_exports IS 'Placeholder function called by process-scheduled-exports edge function via pg_cron';
