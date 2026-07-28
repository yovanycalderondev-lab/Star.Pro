// config.js — Credenciales públicas de tu proyecto de Supabase
//
// 1. Entrá a https://supabase.com/dashboard → tu proyecto → Project Settings → API
// 2. Copiá "Project URL" y pegalo abajo en SUPABASE_URL
// 3. Copiá la clave "anon public" y pegala abajo en SUPABASE_ANON_KEY
//
// Esta clave "anon" es pública y segura de exponer en el frontend:
// la seguridad real la dan las políticas RLS de supabase/schema.sql.

const SAMAZIL_CONFIG = {
  SUPABASE_URL: 'https://nywnruzqyqkoobjwymvt.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55d25ydXpxeXFrb29iand5bXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODc3NDYsImV4cCI6MjA5NDQ2Mzc0Nn0.kCuw9O5hVUDn2Fp-v6j-n3LxXaTquxctLvuAaUq4YK4'
};

window.SAMAZIL_CONFIG = SAMAZIL_CONFIG;
