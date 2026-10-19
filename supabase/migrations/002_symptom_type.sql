-- =====================================================================
-- 002 — allow the notification type 'symptom' (general symptoms such as
-- nauseous, anxious, dizzy; sent from "Other symptoms" on the pain screen).
--
-- DOCUMENTATION ONLY: this has already been run in the Supabase SQL Editor
-- (project yvstfixolrqskmpmjevl) on 2026-10-19. Don't run it again.
-- =====================================================================

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('toilet', 'drink', 'food', 'pain', 'speech', 'symptom'));
