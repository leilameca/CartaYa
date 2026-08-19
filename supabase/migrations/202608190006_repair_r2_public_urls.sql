-- Repair image URLs accidentally saved from a Markdown-formatted R2 base URL.
update public.menu_items
set image_url = regexp_replace(
  image_url,
  '^\[[^]]+\]\((https://[^)]+)\)',
  '\1'
)
where image_url ~ '^\[[^]]+\]\(https://[^)]+\)/';

