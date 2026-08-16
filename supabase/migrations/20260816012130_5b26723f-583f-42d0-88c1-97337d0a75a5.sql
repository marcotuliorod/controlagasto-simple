-- Add theme_preference to profiles for ONBD-03 (auto light/dark by time of
-- day, with a manual override that persists across devices).
-- NULL = no override, theme follows time of day.
-- 'light' | 'dark' = explicit user choice, always wins over the automatic
-- time-of-day theme.
ALTER TABLE public.profiles
  ADD COLUMN theme_preference text CHECK (theme_preference IN ('light', 'dark'));
