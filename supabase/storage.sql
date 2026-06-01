-- Storage buckets & policies (run after creating buckets in Dashboard)

-- Create buckets in Dashboard: logos, products, hostels, avatars (public)

create policy "Public read logos" on storage.objects for select using (bucket_id = 'logos');
create policy "Auth upload logos" on storage.objects for insert with check (bucket_id = 'logos' and auth.role() = 'authenticated');
create policy "Auth update logos" on storage.objects for update using (bucket_id = 'logos' and auth.role() = 'authenticated');

create policy "Public read products" on storage.objects for select using (bucket_id = 'products');
create policy "Auth upload products" on storage.objects for insert with check (bucket_id = 'products' and auth.role() = 'authenticated');

create policy "Public read hostels" on storage.objects for select using (bucket_id = 'hostels');
create policy "Auth upload hostels" on storage.objects for insert with check (bucket_id = 'hostels' and auth.role() = 'authenticated');

create policy "Public read avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Auth upload avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
