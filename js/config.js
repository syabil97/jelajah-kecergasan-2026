// ============================================================
// KONFIGURASI SUPABASE
// ============================================================
// Isi 2 nilai di bawah dengan maklumat projek Supabase anda.
// Dapatkan dari: Supabase Dashboard -> Project Settings -> API Keys
//
// Bergantung bila projek anda dibuat, anda akan nampak SALAH SATU:
//   - "Publishable key"  (bermula "sb_publishable_...")   <- projek baharu
//   - "anon public" key  (bermula "eyJ...", panjang)        <- projek lama
// Kedua-duanya SELAMAT letak di sini (ia untuk sisi browser/client).
//
// ⚠️ JANGAN sekali-kali letak "Secret key" (sb_secret_...) atau
// "service_role" key di fail ini — itu untuk server sahaja.
// ============================================================

const SUPABASE_URL = "https://tlxvkplyzhrqtulnjujp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lQ8k7viyQnOGQtasD8DvwA_OvrrZ4ya";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nama bucket Storage untuk gambar galeri (buat dalam Supabase -> Storage)
const GALERI_BUCKET = "galeri-karnival";

// Fungsi bantuan: tukar path gambar Storage -> URL CDN penuh
// Parameter kedua (options) boleh guna untuk resize gambar supaya
// tak load gambar saiz asal (jimat banyak egress).
// Contoh: getGaleriUrl(path, { width: 400, height: 300, quality: 70 })
function getGaleriUrl(path, options) {
  const { data } = supabaseClient.storage
    .from(GALERI_BUCKET)
    .getPublicUrl(path, options ? { transform: options } : undefined);
  return data.publicUrl;
}

// Versi kecil untuk grid thumbnail (dipapar dalam kotak 4:3 yang kecil)
function getGaleriThumbUrl(path) {
  return getGaleriUrl(path);
}

// Versi lebih besar untuk lightbox (papar penuh, tak perlu saiz asal)
function getGaleriBesarUrl(path) {
  return getGaleriUrl(path);
}