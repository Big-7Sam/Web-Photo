// supabase.js — Configuración de Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⚠️ REEMPLAZA estos valores con los de tu proyecto Supabase
// Dashboard: https://supabase.com/dashboard
const SUPABASE_URL = 'https://xwokxrrfcmhuhkcnjsqk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3b2t4cnJmY21odWhrY25qc3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDQxNDAsImV4cCI6MjA5NTIyMDE0MH0.G4WxeSnJfCp7J1Bb-129XEFhSov1RbxnlLx8rY_kt0g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

// Utilidad: obtener URL pública de storage
export function publicUrl(path, bucket = 'portfolio') {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };