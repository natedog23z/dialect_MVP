# Setting Up Local Database with Production Data

## Prerequisites
- Docker installed and running
- Supabase CLI installed (`brew install supabase/tap/supabase`)
- Access to the Supabase project dashboard

## Steps to Mirror Production Database Locally

1. **Reset Database Password** (if needed)
   - Go to Supabase Dashboard > Project Settings > Database
   - Click "Reset Database Password"
   - Copy the new password immediately

2. **Start Local Supabase**
   ```bash
   cd supabase-app
   supabase start
   ```

3. **Link Project**
   ```bash
   # Set password as environment variable (replace with your actual password)
   export SUPABASE_DB_PASSWORD='your-database-password'
   
   # Link to production project
   supabase link --project-ref yqyweqpsumzxsdgmssll
   ```

4. **Pull Database Schema and Data**
   ```bash
   # Create a full database dump
   supabase db dump --file=dump.sql
   
   # Apply the dump to local database
   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f dump.sql
   ```

## Verification
- Check if tables are present:
  ```bash
  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "\dt public.*"
  ```
- Access Supabase Studio at http://127.0.0.1:54323

## Common Commands
```bash
# Start local environment
supabase start

# Stop local environment
supabase stop

# Check status
supabase status

# Reset local database (if needed)
supabase db reset
```

## Important Notes
- All these commands only affect your local database
- Changes made locally won't impact production
- The local database runs in Docker containers
- Local Studio URL: http://127.0.0.1:54323
- Local Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres

## Troubleshooting
If tables aren't showing up:
1. Stop Supabase: `supabase stop`
2. Start Supabase: `supabase start`
3. Repeat the dump and restore process:
   ```bash
   supabase db dump --file=dump.sql
   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f dump.sql
   ```