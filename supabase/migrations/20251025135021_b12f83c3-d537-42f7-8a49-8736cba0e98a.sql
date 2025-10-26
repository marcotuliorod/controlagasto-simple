-- Fix missing INSERT policies for audit_logs and notifications
-- These tables should only be written to by system functions, not directly by users

-- Audit Logs: Only allow INSERT via SECURITY DEFINER functions (triggers)
-- The create_audit_log() function already handles this correctly
CREATE POLICY "Only system can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

COMMENT ON POLICY "Only system can insert audit logs" ON public.audit_logs IS 
'Audit logs are created only via the create_audit_log() SECURITY DEFINER function, which bypasses RLS. This policy explicitly prevents direct user inserts.';

-- Notifications: Only allow INSERT via service role (edge functions)
CREATE POLICY "Only system can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (false);

COMMENT ON POLICY "Only system can insert notifications" ON public.notifications IS 
'Notifications are created only by edge functions using the service role, which bypasses RLS. This policy explicitly prevents direct user inserts.';