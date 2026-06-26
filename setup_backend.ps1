# iSpy Backend Setup Automation Script
# This script helps link your Supabase project, deploy migrations, and set secrets.

$ErrorActionPreference = "Stop"

$PROJECT_REF = "ocohbiwrrdkoeevipbmx"

Write-Host "--- iSpy Backend Setup ---" -ForegroundColor Cyan

# 1. Check Supabase CLI
Write-Host "Checking for Supabase CLI..."
try {
    & npx supabase --version | Out-Null
    Write-Host "Supabase CLI is available." -ForegroundColor Green
} catch {
    Write-Host "Supabase CLI not found. Please ensure you have it installed or run 'npm install dev'." -ForegroundColor Red
    exit
}

# 2. Link Project
Write-Host "Linking to project $PROJECT_REF..."
Write-Host "You may be asked for your Supabase Database Password." -ForegroundColor Yellow
& npx supabase link --project-ref $PROJECT_REF

# 3. Apply Migrations
Write-Host "Applying migrations to remote project..."
$response = Read-Host "Do you want to push all local migrations to the remote database? (y/n)"
if ($response -eq 'y') {
    & npx supabase db push
    Write-Host "Migrations applied." -ForegroundColor Green
}

# 4. Deploy Functions
Write-Host "Deploying Edge Functions..."
$response = Read-Host "Do you want to deploy all edge functions? (y/n)"
if ($response -eq 'y') {
    & npx supabase functions deploy --all
    Write-Host "Functions deployed." -ForegroundColor Green
}

# 5. Set Secrets
Write-Host "Setting Edge Function Secrets..."
$gemini_key = Read-Host "Enter your GEMINI_API_KEY (leave blank to skip)"
if ($gemini_key) {
    & npx supabase secrets set GEMINI_API_KEY=$gemini_key
}

$stripe_key = Read-Host "Enter your STRIPE_SECRET_KEY (leave blank to skip)"
if ($stripe_key) {
    & npx supabase secrets set STRIPE_SECRET_KEY=$stripe_key
}

Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "Don't forget to update your .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY." -ForegroundColor Yellow
