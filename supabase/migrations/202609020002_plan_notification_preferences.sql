-- Store explicit consent before sending proactive WhatsApp plan notifications.
alter table public.restaurants
  add column if not exists plan_notifications_whatsapp boolean not null default false;

comment on column public.restaurants.plan_notifications_whatsapp is
  'Owner opt-in for transactional WhatsApp messages about subscription plan changes.';
