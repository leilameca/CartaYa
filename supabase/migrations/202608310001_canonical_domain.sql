-- Replace the temporary Vercel hostname stored in existing table QR metadata.
update public.tables
set qr_code_url = regexp_replace(
  qr_code_url,
  '^https://cartaya-seven\.vercel\.app',
  'https://www.tucartaya.com'
)
where qr_code_url like 'https://cartaya-seven.vercel.app/%';
