// config.js — Credenciales públicas de tu proyecto de Supabase
//
// 1. Entrá a https://supabase.com/dashboard → tu proyecto → Project Settings → API
// 2. Copiá "Project URL" y pegalo abajo en SUPABASE_URL
// 3. Copiá la clave "anon public" y pegala abajo en SUPABASE_ANON_KEY
//
// Esta clave "anon" es pública y segura de exponer en el frontend:
// la seguridad real la dan las políticas RLS de supabase/schema.sql.

const SAMAZIL_CONFIG = {
  SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',
  SUPABASE_ANON_KEY: 'TU-CLAVE-ANON-PUBLICA'
};

window.SAMAZIL_CONFIG = SAMAZIL_CONFIG;
