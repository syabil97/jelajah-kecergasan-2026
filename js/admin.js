/* ================================================================
   KONFIGURASI SUPABASE
   ================================================================ */
   const SUPABASE_URL = "https://tlxvkplyzhrqtulnjujp.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRseHZrcGx5emhycXR1bG5qdWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4Njc5ODcsImV4cCI6MjA5ODQ0Mzk4N30.pe5VDYqU134vXWFd9w8Ajtu-4TlxFiSj_Zr6oQ04IyI";
   const GALERI_BUCKET = "galeri-karnival"; // nama Supabase Storage bucket
   
   const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   
   /* ---------- AUTH ---------- */
   const loginScreen = document.getElementById("loginScreen");
   const app = document.getElementById("app");
   const loginError = document.getElementById("loginError");
   
   document.getElementById("loginBtn").addEventListener("click", async () => {
     loginError.style.display = "none";
     const email = document.getElementById("loginEmail").value.trim();
     const password = document.getElementById("loginPassword").value;
     const { error } = await sb.auth.signInWithPassword({ email, password });
     if (error) {
       loginError.textContent = error.message;
       loginError.style.display = "block";
     }
   });
   
   document.getElementById("logoutBtn").addEventListener("click", async () => {
     await sb.auth.signOut();
   });
   
   sb.auth.onAuthStateChange((event, session) => {
     if (session) {
       loginScreen.style.display = "none";
       app.style.display = "block";
       document.getElementById("whoami").textContent = "Log masuk sebagai: " + session.user.email;
       loadAll();
       startSessionTimer();
     } else {
       loginScreen.style.display = "block";
       app.style.display = "none";
       stopSessionTimer();
     }
   });
   
   /* ================= SESI IDLE / AUTO LOG KELUAR ================= */
   const SESSION_TIMEOUT_MINUTES = 30; // <-- tukar di sini kalau nak ubah tempoh
   let idleSeconds = 0;
   let sessionTimerInterval = null;
   
   function resetIdleTimer() {
     idleSeconds = 0;
   }
   
   function startSessionTimer() {
     idleSeconds = 0;
     if (sessionTimerInterval) clearInterval(sessionTimerInterval);
     sessionTimerInterval = setInterval(async () => {
       idleSeconds++;
       const totalSeconds = SESSION_TIMEOUT_MINUTES * 60;
       const remaining = Math.max(totalSeconds - idleSeconds, 0);
       const mins = Math.floor(remaining / 60);
       const secs = remaining % 60;
       const countdownEl = document.getElementById("sessionCountdown");
       if (countdownEl) countdownEl.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
   
       if (idleSeconds >= totalSeconds) {
         clearInterval(sessionTimerInterval);
         await sb.auth.signOut();
         alert("Sesi anda tamat sebab tiada aktiviti. Sila log masuk semula.");
       }
     }, 1000);
   
     // reset idle timer bila ada aktiviti (klik, taip, scroll, gerak tetikus)
     ["mousemove", "mousedown", "keydown", "scroll", "touchstart"].forEach(evt => {
       document.addEventListener(evt, resetIdleTimer);
     });
   }
   
   function stopSessionTimer() {
     if (sessionTimerInterval) clearInterval(sessionTimerInterval);
     ["mousemove", "mousedown", "keydown", "scroll", "touchstart"].forEach(evt => {
       document.removeEventListener(evt, resetIdleTimer);
     });
   }
   
   /* ---------- TABS ---------- */
   document.querySelectorAll(".tab-btn").forEach(btn => {
     btn.addEventListener("click", () => {
       document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
       document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
       btn.classList.add("active");
       document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
     });
   });
   
   function setMsg(id, text, ok = true) {
     const el = document.getElementById(id);
     el.textContent = text;
     el.className = "status-msg " + (ok ? "ok" : "err");
     setTimeout(() => { el.textContent = ""; }, 3500);
   }
   const statusLabel = { akan_datang: "Akan Datang", sedang_berlangsung: "Sedang Berlangsung", selesai: "Selesai", ditangguhkan: "Ditangguhkan" };

   // Kira status sebenar acara secara automatik ikut tarikh & masa semasa.
   // "ditangguhkan" sentiasa manual — tak akan diganti oleh logik auto ni.
   function kiraStatusAuto(row) {
     if (row.status === "ditangguhkan") return "ditangguhkan";
     if (!row.tarikh) return row.status || "akan_datang";

     const now = new Date();
     const mula = new Date(`${row.tarikh}T${row.masa || "00:00"}`);
     const tarikhAkhir = row.tarikh_akhir || row.tarikh;
     // Kalau takda masa tamat, anggap acara berlangsung sampai penghujung hari
     // (23:59) tarikh akhir tu — bukan terus "selesai" sejurus lepas masa mula.
     const akhir = new Date(`${tarikhAkhir}T${row.masa_tamat || "23:59"}`);

     if (now < mula) return "akan_datang";
     if (now > akhir) return "selesai";
     return "sedang_berlangsung";
   }
   
   async function loadAll() {
     await loadPasukan();
     await loadKategori();
     await loadSukan();
     loadKeputusan();
     loadPingat();
     loadInfo();
     loadGaleri();
     loadPaparan();
     loadVideo();
   }
   
   /* ================= KATEGORI SUKAN ================= */
   let semuaKategoriCache = [];
   
   async function loadKategori() {
     const { data, error } = await sb.from("kategori_sukan").select("*").order("nama", { ascending: true });
     const tbody = document.querySelector("#kategori-table tbody");
     tbody.innerHTML = "";
     semuaKategoriCache = data || [];
   
     const sukanKategoriSel = document.getElementById("sukan-kategori");
     const pingatFilterKategoriSel = document.getElementById("pingat-filter-kategori");
     const sukanFilterKategoriSel = document.getElementById("sukan-filter-kategori");
     const galeriFilterKategoriSel = document.getElementById("galeri-filter-kategori");
     const curSukanKategori = sukanKategoriSel.value;
     const curPingatFilterKategori = pingatFilterKategoriSel.value;
     const curSukanFilterKategori = sukanFilterKategoriSel.value;
     const curGaleriFilterKategori = galeriFilterKategoriSel.value;
     sukanKategoriSel.innerHTML = '<option value="">-- pilih kategori --</option>';
     pingatFilterKategoriSel.innerHTML = '<option value="">-- pilih kategori --</option>';
     sukanFilterKategoriSel.innerHTML = '<option value="">-- semua kategori --</option>';
     galeriFilterKategoriSel.innerHTML = '<option value="">-- pilih kategori --</option>';
   
     if (error) { tbody.innerHTML = `<tr><td colspan="2" class="empty-note">Ralat: ${error.message}</td></tr>`; return; }
     if (!data || data.length === 0) { tbody.innerHTML = `<tr><td colspan="2" class="empty-note">Belum ada kategori. Sila tambah dahulu sebelum masuk data Sukan.</td></tr>`; return; }
   
     data.forEach(row => {
       tbody.innerHTML += `<tr>
         <td>${row.nama}</td>
         <td class="row-actions">
           <button class="edit" onclick='editKategori(${JSON.stringify(row)})'>Edit</button>
           <button class="del" onclick="deleteKategori('${row.id}')">Padam</button>
         </td></tr>`;
       sukanKategoriSel.innerHTML += `<option value="${row.nama}">${row.nama}</option>`;
       pingatFilterKategoriSel.innerHTML += `<option value="${row.nama}">${row.nama}</option>`;
       sukanFilterKategoriSel.innerHTML += `<option value="${row.nama}">${row.nama}</option>`;
       galeriFilterKategoriSel.innerHTML += `<option value="${row.nama}">${row.nama}</option>`;
     });
   
     if (curSukanKategori) sukanKategoriSel.value = curSukanKategori;
     if (curPingatFilterKategori) pingatFilterKategoriSel.value = curPingatFilterKategori;
     if (curSukanFilterKategori) sukanFilterKategoriSel.value = curSukanFilterKategori;
     if (curGaleriFilterKategori) galeriFilterKategoriSel.value = curGaleriFilterKategori;
   }
   
   document.getElementById("form-kategori").addEventListener("submit", async (e) => {
     e.preventDefault();
     const id = document.getElementById("kategori-id").value;
     const payload = { nama: document.getElementById("kategori-nama").value.trim() };
     const { error } = id
       ? await sb.from("kategori_sukan").update(payload).eq("id", id)
       : await sb.from("kategori_sukan").insert(payload);
     if (error) return setMsg("kategori-status-msg", "Ralat: " + error.message, false);
     setMsg("kategori-status-msg", "Kategori disimpan.");
     resetKategoriForm();
     loadKategori();
   });
   
   function editKategori(row) {
     document.getElementById("kategori-id").value = row.id;
     document.getElementById("kategori-nama").value = row.nama || "";
     document.getElementById("kategori-cancel").style.display = "inline-block";
   }
   function resetKategoriForm() {
     document.getElementById("form-kategori").reset();
     document.getElementById("kategori-id").value = "";
     document.getElementById("kategori-cancel").style.display = "none";
   }
   document.getElementById("kategori-cancel").addEventListener("click", resetKategoriForm);
   
   async function deleteKategori(id) {
     if (!confirm("Padam kategori ini? Acara sukan sedia ada yang guna kategori ni takkan terjejas, tapi anda perlu kemaskini manual.")) return;
     const { error } = await sb.from("kategori_sukan").delete().eq("id", id);
     if (error) return setMsg("kategori-status-msg", "Ralat: " + error.message, false);
     loadKategori();
   }
   
   /* ================= PASUKAN ================= */
   async function loadPasukan() {
     const { data, error } = await sb.from("pasukan").select("*").order("nama");
     const tbody = document.querySelector("#pasukan-table tbody");
     tbody.innerHTML = "";
   
     const selA = document.getElementById("keputusan-pasukan-a");
     const selB = document.getElementById("keputusan-pasukan-b");
     const selPingat = document.getElementById("pingat-pasukan");
     selA.innerHTML = '<option value="">-- pilih --</option>';
     selB.innerHTML = '<option value="">-- pilih --</option>';
     selPingat.innerHTML = '<option value="">-- pilih --</option>';
   
     if (error) { tbody.innerHTML = `<tr><td colspan="4" class="empty-note">Ralat: ${error.message}</td></tr>`; return; }
     if (!data || data.length === 0) { tbody.innerHTML = `<tr><td colspan="4" class="empty-note">Belum ada pasukan.</td></tr>`; return; }
   
     data.forEach(row => {
       tbody.innerHTML += `<tr>
         <td>${row.nama}</td>
         <td><span class="swatch" style="background:${row.warna || '#ccc'}"></span>${row.warna || ""}</td>
         <td>${row.logo_url ? `<a href="${row.logo_url}" target="_blank">lihat</a>` : ""}</td>
         <td class="row-actions">
           <button class="edit" onclick='editPasukan(${JSON.stringify(row)})'>Edit</button>
           <button class="del" onclick="deletePasukan('${row.id}')">Padam</button>
         </td></tr>`;
       const opt = `<option value="${row.id}">${row.nama}</option>`;
       selA.innerHTML += opt;
       selB.innerHTML += opt;
       selPingat.innerHTML += opt;
     });
   }
   
   document.getElementById("form-pasukan").addEventListener("submit", async (e) => {
     e.preventDefault();
     const id = document.getElementById("pasukan-id").value;
     const payload = {
       nama: document.getElementById("pasukan-nama").value.trim(),
       warna: document.getElementById("pasukan-warna").value,
       logo_url: document.getElementById("pasukan-logo").value.trim() || null,
     };
     const { error } = id
       ? await sb.from("pasukan").update(payload).eq("id", id)
       : await sb.from("pasukan").insert(payload);
     if (error) return setMsg("pasukan-status-msg", "Ralat: " + error.message, false);
     setMsg("pasukan-status-msg", "Berjaya disimpan.");
     resetPasukanForm();
     loadPasukan();
   });
   
   function editPasukan(row) {
     document.getElementById("pasukan-id").value = row.id;
     document.getElementById("pasukan-nama").value = row.nama || "";
     document.getElementById("pasukan-warna").value = row.warna || "#00A99D";
     document.getElementById("pasukan-logo").value = row.logo_url || "";
     document.getElementById("pasukan-cancel").style.display = "inline-block";
   }
   function resetPasukanForm() {
     document.getElementById("form-pasukan").reset();
     document.getElementById("pasukan-id").value = "";
     document.getElementById("pasukan-warna").value = "#00A99D";
     document.getElementById("pasukan-cancel").style.display = "none";
   }
   document.getElementById("pasukan-cancel").addEventListener("click", resetPasukanForm);
   
   async function deletePasukan(id) {
     if (!confirm("Padam pasukan ini?")) return;
     const { error } = await sb.from("pasukan").delete().eq("id", id);
     if (error) return setMsg("pasukan-status-msg", "Ralat: " + error.message, false);
     loadPasukan();
   }
   
   /* ================= SUKAN ================= */
   let semuaSukanCache = [];
   let sukanSearchTerm = "";
   let sukanFilterKategoriNilai = "";
   let sukanCurrentPage = 1;
   const SUKAN_PAGE_SIZE = 10;
   
   async function loadSukan() {
     const { data, error } = await sb.from("sukan").select("*").order("tarikh", { ascending: true });
     const kategoriSel = document.getElementById("keputusan-kategori");
     const pingatFilterKategoriSel = document.getElementById("pingat-filter-kategori");
     const galeriFilterKategoriSel = document.getElementById("galeri-filter-kategori");
     const curKategori = kategoriSel.value;
     kategoriSel.innerHTML = '<option value="">-- pilih --</option>';
   
     if (error) {
       document.querySelector("#sukan-table tbody").innerHTML = `<tr><td colspan="6" class="empty-note">Ralat: ${error.message}</td></tr>`;
       return;
     }
   
     semuaSukanCache = data || [];
     const kategoriSeen = new Set();
   
     semuaSukanCache.forEach(row => {
       if (row.kategori_sukan && !kategoriSeen.has(row.kategori_sukan)) {
         kategoriSeen.add(row.kategori_sukan);
         kategoriSel.innerHTML += `<option value="${row.kategori_sukan}">${row.kategori_sukan}</option>`;
       }
     });
   
     if (curKategori) kategoriSel.value = curKategori;
   
     populatePingatSukanOptions(pingatFilterKategoriSel.value);
     populateGaleriSukanOptions(galeriFilterKategoriSel.value);
     sukanCurrentPage = 1;
     renderSukanTable();
   }
   
   function getSukanTersaring() {
     return semuaSukanCache.filter(row => {
       const kenaKategori = !sukanFilterKategoriNilai || row.kategori_sukan === sukanFilterKategoriNilai;
       const kenaCari = !sukanSearchTerm || (row.nama_acara || "").toLowerCase().includes(sukanSearchTerm);
       return kenaKategori && kenaCari;
     });
   }
   
   function renderSukanTable() {
     const tbody = document.querySelector("#sukan-table tbody");
     const tersaring = getSukanTersaring();
   
     if (tersaring.length === 0) {
       tbody.innerHTML = `<tr><td colspan="6" class="empty-note">Tiada acara sepadan dengan carian/tapisan.</td></tr>`;
       document.getElementById("sukan-page-info").textContent = "";
       document.getElementById("sukan-prev-page").disabled = true;
       document.getElementById("sukan-next-page").disabled = true;
       return;
     }
   
     const jumlahMuka = Math.max(1, Math.ceil(tersaring.length / SUKAN_PAGE_SIZE));
     if (sukanCurrentPage > jumlahMuka) sukanCurrentPage = jumlahMuka;
     if (sukanCurrentPage < 1) sukanCurrentPage = 1;
   
     const mula = (sukanCurrentPage - 1) * SUKAN_PAGE_SIZE;
     const potongan = tersaring.slice(mula, mula + SUKAN_PAGE_SIZE);
   
     tbody.innerHTML = potongan.map(row => `<tr>
         <td>${row.nama_acara}</td>
         <td>${row.kategori_sukan || ""}</td>
         <td>${row.tarikh || ""}</td>
         <td>${row.tarikh_akhir || ""}</td>
         <td>${statusLabel[kiraStatusAuto(row)] || ""}</td>
         <td class="row-actions">
           <button class="edit" onclick='editSukan(${JSON.stringify(row)})'>Edit</button>
           <button class="del" onclick="deleteSukan('${row.id}')">Padam</button>
         </td></tr>`).join("");
   
     document.getElementById("sukan-page-info").textContent =
       `Muka ${sukanCurrentPage} / ${jumlahMuka} (${tersaring.length} acara)`;
     document.getElementById("sukan-prev-page").disabled = sukanCurrentPage <= 1;
     document.getElementById("sukan-next-page").disabled = sukanCurrentPage >= jumlahMuka;
   }
   
   document.getElementById("sukan-search-btn").addEventListener("click", () => {
     sukanSearchTerm = document.getElementById("sukan-search").value.trim().toLowerCase();
     sukanFilterKategoriNilai = document.getElementById("sukan-filter-kategori").value;
     sukanCurrentPage = 1;
     renderSukanTable();
   });
   document.getElementById("sukan-search").addEventListener("keydown", (e) => {
     if (e.key === "Enter") {
       e.preventDefault();
       document.getElementById("sukan-search-btn").click();
     }
   });
   document.getElementById("sukan-filter-kategori").addEventListener("change", () => {
     sukanFilterKategoriNilai = document.getElementById("sukan-filter-kategori").value;
     sukanCurrentPage = 1;
     renderSukanTable();
   });
   document.getElementById("sukan-search-reset").addEventListener("click", () => {
     document.getElementById("sukan-search").value = "";
     document.getElementById("sukan-filter-kategori").value = "";
     sukanSearchTerm = "";
     sukanFilterKategoriNilai = "";
     sukanCurrentPage = 1;
     renderSukanTable();
   });
   document.getElementById("sukan-prev-page").addEventListener("click", () => {
     sukanCurrentPage--;
     renderSukanTable();
   });
   document.getElementById("sukan-next-page").addEventListener("click", () => {
     sukanCurrentPage++;
     renderSukanTable();
   });
   
   // Isi dropdown "Acara Sukan" ikut kategori yang dipilih dalam tab Pingat
   function populatePingatSukanOptions(kategori) {
     const sel = document.getElementById("pingat-sukan");
     const current = sel.value;
   
     if (!kategori) {
       sel.innerHTML = '<option value="">-- pilih kategori dahulu --</option>';
       sel.disabled = true;
       return;
     }
   
     sel.disabled = false;
     sel.innerHTML = '<option value="">-- pilih acara --</option>' +
       semuaSukanCache
         .filter(r => r.kategori_sukan === kategori)
         .map(r => `<option value="${r.id}" data-kategori="${r.kategori_sukan || ''}">${r.nama_acara}</option>`)
         .join("");
   
     if (current) sel.value = current;
   }
   
   // bila pilih kategori dalam tab Pingat, filter senarai acara & auto-isi kategori
   document.getElementById("pingat-filter-kategori").addEventListener("change", (e) => {
     populatePingatSukanOptions(e.target.value);
     document.getElementById("pingat-kategori").value = e.target.value || "";
   });
   
   // bila pilih acara dalam tab Pingat, auto-isi kategori (boleh ubah manual)
   document.getElementById("pingat-sukan").addEventListener("change", (e) => {
     const opt = e.target.selectedOptions[0];
     document.getElementById("pingat-kategori").value = opt ? (opt.dataset.kategori || "") : "";
   });

   // Isi dropdown "Acara Sukan" ikut kategori yang dipilih dalam tab Galeri
   function populateGaleriSukanOptions(kategori) {
     const sel = document.getElementById("galeri-sukan");
     const current = sel.value;

     if (!kategori) {
       sel.innerHTML = '<option value="">-- pilih kategori dahulu --</option>';
       sel.disabled = true;
       return;
     }

     sel.disabled = false;
     sel.innerHTML = '<option value="">-- tiada --</option>' +
       semuaSukanCache
         .filter(r => r.kategori_sukan === kategori)
         .map(r => `<option value="${r.id}">${r.nama_acara}</option>`)
         .join("");

     if (current) sel.value = current;
   }

   // bila pilih kategori dalam tab Galeri, filter senarai acara
   document.getElementById("galeri-filter-kategori").addEventListener("change", (e) => {
     populateGaleriSukanOptions(e.target.value);
   });

   // UX: bila admin isi Kategori Am, disable dropdown Kategori Sukan/Acara Sukan
   // (elak admin isi kedua-dua sekali gus - mengelirukan).
   document.getElementById("galeri-kategori-am").addEventListener("input", (e) => {
     const diisi = e.target.value.trim().length > 0;
     document.getElementById("galeri-filter-kategori").disabled = diisi;
     document.getElementById("galeri-sukan").disabled = diisi || !document.getElementById("galeri-filter-kategori").value;
   });

   document.getElementById("form-sukan").addEventListener("submit", async (e) => {
     e.preventDefault();
     const id = document.getElementById("sukan-id").value;
     const tarikhMula = document.getElementById("sukan-tarikh").value;
     const tarikhAkhir = document.getElementById("sukan-tarikh-akhir").value;
     if (tarikhMula && tarikhAkhir && tarikhAkhir < tarikhMula) {
       return setMsg("sukan-status-msg", "Ralat: Tarikh Akhir tak boleh sebelum Tarikh Mula.", false);
     }
     const masaMula = document.getElementById("sukan-masa").value;
     const masaTamat = document.getElementById("sukan-masa-tamat").value;
     if (masaMula && masaTamat && (!tarikhAkhir || tarikhAkhir === tarikhMula) && masaTamat < masaMula) {
       return setMsg("sukan-status-msg", "Ralat: Masa Tamat tak boleh sebelum Masa Mula.", false);
     }
     const payload = {
       nama_acara: document.getElementById("sukan-nama-acara").value.trim(),
       kategori_sukan: document.getElementById("sukan-kategori").value.trim(),
       tarikh: document.getElementById("sukan-tarikh").value || null,
       tarikh_akhir: document.getElementById("sukan-tarikh-akhir").value || null,
       masa: document.getElementById("sukan-masa").value || null,
       masa_tamat: document.getElementById("sukan-masa-tamat").value || null,
       lokasi: document.getElementById("sukan-lokasi").value.trim() || null,
       // Status "sebenar" (akan_datang/sedang_berlangsung/selesai) dikira automatik
       // masa papar (lihat kiraStatusAuto). Kolum ini cuma simpan togol manual "ditangguhkan".
       status: document.getElementById("sukan-ditangguhkan").checked ? "ditangguhkan" : "akan_datang",
       keputusan: document.getElementById("sukan-keputusan").value.trim() || null,
     };
     const { error } = id
       ? await sb.from("sukan").update(payload).eq("id", id)
       : await sb.from("sukan").insert(payload);
     if (error) return setMsg("sukan-status-msg", "Ralat: " + error.message, false);
     setMsg("sukan-status-msg", "Sukan disimpan.");
     resetSukanForm();
     loadSukan();
   });
   
   function editSukan(row) {
     document.getElementById("sukan-id").value = row.id;
     document.getElementById("sukan-nama-acara").value = row.nama_acara || "";
     document.getElementById("sukan-kategori").value = row.kategori_sukan || "";
     document.getElementById("sukan-tarikh").value = row.tarikh || "";
     document.getElementById("sukan-tarikh-akhir").value = row.tarikh_akhir || "";
     document.getElementById("sukan-masa").value = row.masa || "";
     document.getElementById("sukan-masa-tamat").value = row.masa_tamat || "";
     document.getElementById("sukan-lokasi").value = row.lokasi || "";
     document.getElementById("sukan-ditangguhkan").checked = row.status === "ditangguhkan";
     document.getElementById("sukan-keputusan").value = row.keputusan || "";
     document.getElementById("sukan-cancel").style.display = "inline-block";
   }
   function resetSukanForm() {
     document.getElementById("form-sukan").reset();
     document.getElementById("sukan-id").value = "";
     document.getElementById("sukan-ditangguhkan").checked = false;
     document.getElementById("sukan-cancel").style.display = "none";
   }
   document.getElementById("sukan-cancel").addEventListener("click", resetSukanForm);
   
   async function deleteSukan(id) {
     if (!confirm("Padam sukan ini?")) return;
     const { error } = await sb.from("sukan").delete().eq("id", id);
     if (error) return setMsg("sukan-status-msg", "Ralat: " + error.message, false);
     loadSukan();
   }
   
   /* ================= KEPUTUSAN (perlawanan) ================= */
   let semuaKeputusanCache = [];
   let semuaKeputusanPasukanCache = [];
   let keputusanFilterKategoriNilai = "";
   let keputusanFilterStatusNilai = "";
   let keputusanFilterCariNilai = "";

   async function loadKeputusan() {
     const { data, error } = await sb.from("perlawanan").select("*").order("tarikh", { ascending: false });
     const tbody = document.querySelector("#keputusan-table tbody");
     if (error) { tbody.innerHTML = `<tr><td colspan="8" class="empty-note">Ralat: ${error.message}</td></tr>`; return; }

     const { data: pasukanList } = await sb.from("pasukan").select("*");
     semuaKeputusanCache = data || [];
     semuaKeputusanPasukanCache = pasukanList || [];

     // isi dropdown tapis kategori ikut kategori yang wujud dalam rekod keputusan
     const filterKategoriSel = document.getElementById("keputusan-filter-kategori");
     const curFilterKategori = filterKategoriSel.value;
     filterKategoriSel.innerHTML = '<option value="">-- semua kategori --</option>';
     const kategoriSeen = new Set();
     semuaKeputusanCache.forEach(row => {
       if (row.kategori_sukan && !kategoriSeen.has(row.kategori_sukan)) {
         kategoriSeen.add(row.kategori_sukan);
         filterKategoriSel.innerHTML += `<option value="${row.kategori_sukan}">${row.kategori_sukan}</option>`;
       }
     });
     if (curFilterKategori) filterKategoriSel.value = curFilterKategori;

     renderKeputusanTable();
   }

   function namaPasukanKeputusan(id) {
     return (semuaKeputusanPasukanCache || []).find(p => p.id === id)?.nama || "-";
   }

   function getKeputusanTersaring() {
     return semuaKeputusanCache.filter(row => {
       const kenaKategori = !keputusanFilterKategoriNilai || row.kategori_sukan === keputusanFilterKategoriNilai;
       const kenaStatus = !keputusanFilterStatusNilai || row.status === keputusanFilterStatusNilai;
       const kenaCari = !keputusanFilterCariNilai ||
         namaPasukanKeputusan(row.pasukan_a_id).toLowerCase().includes(keputusanFilterCariNilai) ||
         namaPasukanKeputusan(row.pasukan_b_id).toLowerCase().includes(keputusanFilterCariNilai);
       return kenaKategori && kenaStatus && kenaCari;
     });
   }

   function renderKeputusanTable() {
     const tbody = document.querySelector("#keputusan-table tbody");
     const tersaring = getKeputusanTersaring();

     if (tersaring.length === 0) {
       tbody.innerHTML = `<tr><td colspan="8" class="empty-note">Tiada keputusan sepadan dengan tapisan.</td></tr>`;
       return;
     }

     tbody.innerHTML = tersaring.map(row => `<tr>
         <td>${row.kategori_sukan || ""}</td>
         <td>${row.pusingan || ""}</td>
         <td>${namaPasukanKeputusan(row.pasukan_a_id)}</td>
         <td>${row.skor_a ?? "-"} : ${row.skor_b ?? "-"}</td>
         <td>${namaPasukanKeputusan(row.pasukan_b_id)}</td>
         <td>${row.tarikh || ""}</td>
         <td>${statusLabel[row.status] || row.status || ""}</td>
         <td class="row-actions">
           <button class="edit" onclick='editKeputusan(${JSON.stringify(row)})'>Edit</button>
           <button class="del" onclick="deleteKeputusan('${row.id}')">Padam</button>
         </td></tr>`).join("");
   }

   document.getElementById("keputusan-filter-kategori").addEventListener("change", (e) => {
     keputusanFilterKategoriNilai = e.target.value;
     renderKeputusanTable();
   });
   document.getElementById("keputusan-filter-status").addEventListener("change", (e) => {
     keputusanFilterStatusNilai = e.target.value;
     renderKeputusanTable();
   });
   document.getElementById("keputusan-filter-cari").addEventListener("input", (e) => {
     keputusanFilterCariNilai = e.target.value.trim().toLowerCase();
     renderKeputusanTable();
   });
   document.getElementById("keputusan-filter-reset").addEventListener("click", () => {
     document.getElementById("keputusan-filter-kategori").value = "";
     document.getElementById("keputusan-filter-status").value = "";
     document.getElementById("keputusan-filter-cari").value = "";
     keputusanFilterKategoriNilai = "";
     keputusanFilterStatusNilai = "";
     keputusanFilterCariNilai = "";
     renderKeputusanTable();
   });
   
   document.getElementById("form-keputusan").addEventListener("submit", async (e) => {
     e.preventDefault();
     const id = document.getElementById("keputusan-id").value;
     const payload = {
       kategori_sukan: document.getElementById("keputusan-kategori").value,
       pusingan: document.getElementById("keputusan-pusingan").value.trim() || null,
       pasukan_a_id: document.getElementById("keputusan-pasukan-a").value,
       pasukan_b_id: document.getElementById("keputusan-pasukan-b").value,
       skor_a: document.getElementById("keputusan-skor-a").value === "" ? null : Number(document.getElementById("keputusan-skor-a").value),
       skor_b: document.getElementById("keputusan-skor-b").value === "" ? null : Number(document.getElementById("keputusan-skor-b").value),
       tarikh: document.getElementById("keputusan-tarikh").value || null,
       masa: document.getElementById("keputusan-masa").value || null,
       lokasi: document.getElementById("keputusan-lokasi").value.trim() || null,
       status: document.getElementById("keputusan-status").value,
       catatan: document.getElementById("keputusan-catatan").value.trim() || null,
     };
     const { error } = id
       ? await sb.from("perlawanan").update(payload).eq("id", id)
       : await sb.from("perlawanan").insert(payload);
     if (error) return setMsg("keputusan-status-msg", "Ralat: " + error.message, false);
     setMsg("keputusan-status-msg", "Keputusan disimpan.");
     resetKeputusanForm();
     loadKeputusan();
   });
   
   function editKeputusan(row) {
     document.getElementById("keputusan-id").value = row.id;
     document.getElementById("keputusan-kategori").value = row.kategori_sukan || "";
     document.getElementById("keputusan-pusingan").value = row.pusingan || "";
     document.getElementById("keputusan-pasukan-a").value = row.pasukan_a_id || "";
     document.getElementById("keputusan-pasukan-b").value = row.pasukan_b_id || "";
     document.getElementById("keputusan-skor-a").value = row.skor_a ?? "";
     document.getElementById("keputusan-skor-b").value = row.skor_b ?? "";
     document.getElementById("keputusan-tarikh").value = row.tarikh || "";
     document.getElementById("keputusan-masa").value = row.masa || "";
     document.getElementById("keputusan-lokasi").value = row.lokasi || "";
     document.getElementById("keputusan-status").value = row.status || "akan_datang";
     document.getElementById("keputusan-catatan").value = row.catatan || "";
     document.getElementById("keputusan-cancel").style.display = "inline-block";
   }
   function resetKeputusanForm() {
     document.getElementById("form-keputusan").reset();
     document.getElementById("keputusan-id").value = "";
     document.getElementById("keputusan-cancel").style.display = "none";
   }
   document.getElementById("keputusan-cancel").addEventListener("click", resetKeputusanForm);
   
   async function deleteKeputusan(id) {
     if (!confirm("Padam keputusan ini?")) return;
     const { error } = await sb.from("perlawanan").delete().eq("id", id);
     if (error) return setMsg("keputusan-status-msg", "Ralat: " + error.message, false);
     loadKeputusan();
   }
   
   /* ================= PINGAT ================= */
   const jenisPingatLabel = { emas: "🥇 Emas", perak: "🥈 Perak", gangsa: "🥉 Gangsa" };
   let semuaPingatCache = [];
   let semuaPingatPasukanCache = [];
   let semuaPingatSukanCache = [];
   let pingatTableFilterKategoriNilai = "";
   let pingatTableFilterJenisNilai = "";
   let pingatTableFilterPasukanNilai = "";

   async function loadPingat() {
     const { data, error } = await sb.from("pingat").select("*").order("dianugerah_pada", { ascending: false });
     const tbody = document.querySelector("#pingat-table tbody");
     if (error) { tbody.innerHTML = `<tr><td colspan="5" class="empty-note">Ralat: ${error.message}</td></tr>`; return; }
   
     const { data: pasukanList } = await sb.from("pasukan").select("*");
     const { data: sukanList } = await sb.from("sukan").select("*");
     semuaPingatCache = data || [];
     semuaPingatPasukanCache = pasukanList || [];
     semuaPingatSukanCache = sukanList || [];

     // isi dropdown tapis kategori
     const filterKategoriSel = document.getElementById("pingat-table-filter-kategori");
     const curFilterKategori = filterKategoriSel.value;
     filterKategoriSel.innerHTML = '<option value="">-- semua kategori --</option>';
     const kategoriSeen = new Set();
     semuaPingatCache.forEach(row => {
       if (row.kategori && !kategoriSeen.has(row.kategori)) {
         kategoriSeen.add(row.kategori);
         filterKategoriSel.innerHTML += `<option value="${row.kategori}">${row.kategori}</option>`;
       }
     });
     if (curFilterKategori) filterKategoriSel.value = curFilterKategori;

     // isi dropdown tapis pasukan
     const filterPasukanSel = document.getElementById("pingat-table-filter-pasukan");
     const curFilterPasukan = filterPasukanSel.value;
     filterPasukanSel.innerHTML = '<option value="">-- semua pasukan --</option>' +
       semuaPingatPasukanCache.map(p => `<option value="${p.id}">${p.nama}</option>`).join("");
     if (curFilterPasukan) filterPasukanSel.value = curFilterPasukan;

     renderPingatTable();
   }

   function namaPasukanPingat(id) {
     return (semuaPingatPasukanCache || []).find(p => p.id === id)?.nama || "-";
   }
   function namaAcaraPingat(id) {
     return (semuaPingatSukanCache || []).find(s => s.id === id)?.nama_acara || "-";
   }

   function getPingatTersaring() {
     return semuaPingatCache.filter(row => {
       const kenaKategori = !pingatTableFilterKategoriNilai || row.kategori === pingatTableFilterKategoriNilai;
       const kenaJenis = !pingatTableFilterJenisNilai || row.jenis === pingatTableFilterJenisNilai;
       const kenaPasukan = !pingatTableFilterPasukanNilai || row.pasukan_id === pingatTableFilterPasukanNilai;
       return kenaKategori && kenaJenis && kenaPasukan;
     });
   }

   function renderPingatTable() {
     const tbody = document.querySelector("#pingat-table tbody");
     const tersaring = getPingatTersaring();

     if (tersaring.length === 0) {
       tbody.innerHTML = `<tr><td colspan="5" class="empty-note">Tiada rekod pingat sepadan dengan tapisan.</td></tr>`;
       return;
     }

     tbody.innerHTML = tersaring.map(row => `<tr>
         <td>${namaAcaraPingat(row.sukan_id)}</td>
         <td>${row.kategori || ""}</td>
         <td>${namaPasukanPingat(row.pasukan_id)}</td>
         <td>${jenisPingatLabel[row.jenis] || row.jenis || ""}</td>
         <td class="row-actions">
           <button class="edit" onclick='editPingat(${JSON.stringify(row)})'>Edit</button>
           <button class="del" onclick="deletePingat('${row.id}')">Padam</button>
         </td></tr>`).join("");
   }

   document.getElementById("pingat-table-filter-kategori").addEventListener("change", (e) => {
     pingatTableFilterKategoriNilai = e.target.value;
     renderPingatTable();
   });
   document.getElementById("pingat-table-filter-jenis").addEventListener("change", (e) => {
     pingatTableFilterJenisNilai = e.target.value;
     renderPingatTable();
   });
   document.getElementById("pingat-table-filter-pasukan").addEventListener("change", (e) => {
     pingatTableFilterPasukanNilai = e.target.value;
     renderPingatTable();
   });
   document.getElementById("pingat-table-filter-reset").addEventListener("click", () => {
     document.getElementById("pingat-table-filter-kategori").value = "";
     document.getElementById("pingat-table-filter-jenis").value = "";
     document.getElementById("pingat-table-filter-pasukan").value = "";
     pingatTableFilterKategoriNilai = "";
     pingatTableFilterJenisNilai = "";
     pingatTableFilterPasukanNilai = "";
     renderPingatTable();
   });
   
   document.getElementById("form-pingat").addEventListener("submit", async (e) => {
     e.preventDefault();
     const id = document.getElementById("pingat-id").value;
     const payload = {
       sukan_id: document.getElementById("pingat-sukan").value,
       kategori: document.getElementById("pingat-kategori").value.trim() || null,
       pasukan_id: document.getElementById("pingat-pasukan").value,
       jenis: document.getElementById("pingat-jenis").value,
     };
     const { error } = id
       ? await sb.from("pingat").update(payload).eq("id", id)
       : await sb.from("pingat").insert(payload);
     if (error) return setMsg("pingat-status-msg", "Ralat: " + error.message, false);
     setMsg("pingat-status-msg", "Pingat disimpan.");
     resetPingatForm();
     loadPingat();
   });
   
   function editPingat(row) {
     document.getElementById("pingat-id").value = row.id;
     document.getElementById("pingat-filter-kategori").value = row.kategori || "";
     populatePingatSukanOptions(row.kategori || "");
     document.getElementById("pingat-sukan").value = row.sukan_id || "";
     document.getElementById("pingat-kategori").value = row.kategori || "";
     document.getElementById("pingat-pasukan").value = row.pasukan_id || "";
     document.getElementById("pingat-jenis").value = row.jenis || "";
     document.getElementById("pingat-cancel").style.display = "inline-block";
   }
   function resetPingatForm() {
     document.getElementById("form-pingat").reset();
     document.getElementById("pingat-id").value = "";
     document.getElementById("pingat-filter-kategori").value = "";
     populatePingatSukanOptions("");
     document.getElementById("pingat-cancel").style.display = "none";
   }
   document.getElementById("pingat-cancel").addEventListener("click", resetPingatForm);
   
   async function deletePingat(id) {
     if (!confirm("Padam rekod pingat ini? (Kiraan pingat akan terus berkurang selepas ini)")) return;
     const { error } = await sb.from("pingat").delete().eq("id", id);
     if (error) return setMsg("pingat-status-msg", "Ralat: " + error.message, false);
     loadPingat();
   }
   
   /* Helper: elak bug tarikh "bergeser" akibat penukaran timezone.
      Semua tarikh/masa dikira mengikut zon Malaysia (Asia/Kuala_Lumpur, +8)
      secara eksplisit, tak kira timezone browser peranti admin. */
   function tarikhMasaInputMalaysia(isoString) {
     // Pulangkan format "YYYY-MM-DDTHH:MM" (untuk isi input datetime-local)
     if (!isoString) return "";
     const bahagian = new Intl.DateTimeFormat("en-CA", {
       timeZone: "Asia/Kuala_Lumpur",
       year: "numeric", month: "2-digit", day: "2-digit",
       hour: "2-digit", minute: "2-digit", hour12: false,
     }).formatToParts(new Date(isoString)).reduce((o, p) => (o[p.type] = p.value, o), {});
     return `${bahagian.year}-${bahagian.month}-${bahagian.day}T${bahagian.hour}:${bahagian.minute}`;
   }
   function tarikhSahajaMalaysia(isoString) {
     if (!isoString) return "";
     return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date(isoString));
   }
   function isoDariInputDatetimeMalaysia(datetimeLocalValue) {
     // datetimeLocalValue cth "2026-08-16T09:30" - anggap ia waktu Malaysia (+8), tak kira timezone peranti
     if (!datetimeLocalValue) return new Date().toISOString();
     return `${datetimeLocalValue}:00+08:00`;
   }

   /* ================= INFO ================= */
   let semuaInfoCache = [];
   async function loadInfo() {
     const { data, error } = await sb.from("info").select("*").order("dibuat_pada", { ascending: false });
     const tbody = document.querySelector("#info-table tbody");
     tbody.innerHTML = "";
     if (error) { tbody.innerHTML = `<tr><td colspan="5" class="empty-note">Ralat: ${error.message}</td></tr>`; return; }
     semuaInfoCache = data || [];
     if (!data || data.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="empty-note">Belum ada info.</td></tr>`; return; }
     data.forEach(row => {
       const tarikh = row.dibuat_pada
         ? new Date(row.dibuat_pada).toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
         : "";
       let gambarCell = "";
       if (row.gambar_path) {
         const { data: urlData } = sb.storage.from(GALERI_BUCKET).getPublicUrl(row.gambar_path);
         gambarCell = `<img src="${urlData.publicUrl}" alt="" style="width:60px;height:40px;object-fit:cover;border-radius:4px;">`;
       }
       tbody.innerHTML += `<tr>
         <td>${row.tajuk}</td>
         <td>${gambarCell}</td>
         <td>${row.penting ? '<span class="badge-penting">PENTING</span>' : ""}</td>
         <td>${tarikh}</td>
         <td class="row-actions">
           <button class="edit" onclick='editInfo(${JSON.stringify(row)})'>Edit</button>
           <button class="del" onclick="deleteInfo('${row.id}')">Padam</button>
         </td></tr>`;
     });
   }
   
   document.getElementById("form-info").addEventListener("submit", async (e) => {
     e.preventDefault();
     const id = document.getElementById("info-id").value;
     const tarikhInput = document.getElementById("info-tarikh").value;
     const file = document.getElementById("info-file").files[0];

     let gambarPath = id ? (semuaInfoCache.find(r => r.id === id)?.gambar_path || null) : null;
     const buangCb = document.getElementById("info-gambar-buang");
     if (buangCb && buangCb.checked) {
       if (gambarPath) await sb.storage.from(GALERI_BUCKET).remove([gambarPath]);
       gambarPath = null;
     }

     if (file) {
       const fileName = `info/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
       setMsg("info-status-msg", "Sedang muat naik gambar...", true);
       const { error: uploadError } = await sb.storage.from(GALERI_BUCKET).upload(fileName, file);
       if (uploadError) return setMsg("info-status-msg", "Ralat muat naik: " + uploadError.message, false);
       gambarPath = fileName;
     }

     const payload = {
       tajuk: document.getElementById("info-tajuk").value.trim(),
       kandungan: document.getElementById("info-kandungan").value.trim(),
       penting: document.getElementById("info-penting").checked,
       gambar_path: gambarPath,
       dibuat_pada: isoDariInputDatetimeMalaysia(tarikhInput),
     };
     const { error } = id
       ? await sb.from("info").update(payload).eq("id", id)
       : await sb.from("info").insert(payload);
     if (error) return setMsg("info-status-msg", "Ralat: " + error.message, false);
     setMsg("info-status-msg", "Info disimpan.");
     resetInfoForm();
     loadInfo();
   });
   
   function editInfo(row) {
     document.getElementById("info-id").value = row.id;
     document.getElementById("info-tajuk").value = row.tajuk || "";
     document.getElementById("info-kandungan").value = row.kandungan || "";
     document.getElementById("info-penting").checked = !!row.penting;
     document.getElementById("info-tarikh").value = tarikhMasaInputMalaysia(row.dibuat_pada);
     document.getElementById("info-file").value = "";
     renderInfoGambarPreview(row.gambar_path);
     document.getElementById("info-cancel").style.display = "inline-block";
   }
   function resetInfoForm() {
     document.getElementById("form-info").reset();
     document.getElementById("info-id").value = "";
     document.getElementById("info-tarikh").value = "";
     document.getElementById("info-cancel").style.display = "none";
     renderInfoGambarPreview(null);
   }
   function renderInfoGambarPreview(gambarPath) {
     const el = document.getElementById("info-gambar-preview");
     if (!gambarPath) { el.innerHTML = ""; return; }
     const { data: urlData } = sb.storage.from(GALERI_BUCKET).getPublicUrl(gambarPath);
     el.innerHTML = `
       <img src="${urlData.publicUrl}" alt="" style="width:120px;height:80px;object-fit:cover;border-radius:6px;display:block;margin-bottom:6px;">
       <label style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px;">
         <input type="checkbox" id="info-gambar-buang" style="width:auto;"> Buang gambar sedia ada
       </label>`;
   }
   document.getElementById("info-cancel").addEventListener("click", resetInfoForm);
   
   async function deleteInfo(id) {
     if (!confirm("Padam info ini?")) return;
     const row = semuaInfoCache.find(r => r.id === id);
     if (row?.gambar_path) await sb.storage.from(GALERI_BUCKET).remove([row.gambar_path]);
     const { error } = await sb.from("info").delete().eq("id", id);
     if (error) return setMsg("info-status-msg", "Ralat: " + error.message, false);
     loadInfo();
   }
   
   /* ================= GALERI ================= */
   let semuaGaleriCache = [];
   let galeriAdminFilterKategori = "";
   let galeriAdminFilterSukan = "";
   let galeriAdminFilterKategoriAm = "";
   let galeriAdminSearchTerm = "";

   async function loadGaleri() {
     const { data, error } = await sb
       .from("galeri")
       .select("*, sukan(nama_acara, kategori_sukan)")
       .order("dimuat_naik_pada", { ascending: false });
     const wrap = document.getElementById("galeri-preview");
     const filterKategoriSel = document.getElementById("galeri-admin-filter-kategori");
     const curFilterKategori = filterKategoriSel.value;

     if (error) { wrap.innerHTML = `<div class="empty-note">Ralat: ${error.message}</div>`; return; }

     semuaGaleriCache = data || [];

     // Isi dropdown "Tapis Kategori" guna kategori sedia ada (semuaKategoriCache dari loadKategori)
     filterKategoriSel.innerHTML = '<option value="">-- semua kategori --</option>' +
       semuaKategoriCache.map(k => `<option value="${k.nama}">${k.nama}</option>`).join("");
     if (curFilterKategori) filterKategoriSel.value = curFilterKategori;

     populateGaleriAdminFilterSukan(filterKategoriSel.value);
     populateGaleriKategoriAmOptions();
     renderGaleriPreview();
   }

   // Isi datalist (form upload) & dropdown tapis dengan nilai kategori_am unik yang sedia ada,
   // supaya admin nampak apa yang dah pernah digunakan (elak duplikat macam "Pendaftaran" vs "pendaftaran").
   function populateGaleriKategoriAmOptions() {
     const nilaiUnik = [...new Set(semuaGaleriCache.map(r => r.kategori_am).filter(Boolean))].sort();

     const datalist = document.getElementById("galeri-kategori-am-list");
     if (datalist) datalist.innerHTML = nilaiUnik.map(v => `<option value="${v}"></option>`).join("");

     const filterSel = document.getElementById("galeri-admin-filter-kategori-am");
     if (filterSel) {
       const current = filterSel.value;
       filterSel.innerHTML = '<option value="">-- semua kategori am --</option>' +
         nilaiUnik.map(v => `<option value="${v}">${v}</option>`).join("");
       if (current) filterSel.value = current;
     }
   }

   function populateGaleriAdminFilterSukan(kategori) {
     const sel = document.getElementById("galeri-admin-filter-sukan");
     const current = sel.value;

     if (!kategori) {
       sel.innerHTML = '<option value="">-- semua acara --</option>';
       sel.disabled = true;
       galeriAdminFilterSukan = "";
       return;
     }

     sel.disabled = false;
     sel.innerHTML = '<option value="">-- semua acara --</option>' +
       semuaSukanCache
         .filter(r => r.kategori_sukan === kategori)
         .map(r => `<option value="${r.id}">${r.nama_acara}</option>`)
         .join("");

     if (current) sel.value = current;
   }

   document.getElementById("galeri-admin-filter-kategori").addEventListener("change", (e) => {
     galeriAdminFilterKategori = e.target.value;
     populateGaleriAdminFilterSukan(galeriAdminFilterKategori);
     galeriAdminFilterSukan = "";
     renderGaleriPreview();
   });
   document.getElementById("galeri-admin-filter-sukan").addEventListener("change", (e) => {
     galeriAdminFilterSukan = e.target.value;
     renderGaleriPreview();
   });
   document.getElementById("galeri-admin-search").addEventListener("input", (e) => {
     galeriAdminSearchTerm = e.target.value.trim().toLowerCase();
     renderGaleriPreview();
   });
   document.getElementById("galeri-admin-filter-kategori-am").addEventListener("change", (e) => {
     galeriAdminFilterKategoriAm = e.target.value;
     renderGaleriPreview();
   });
   document.getElementById("galeri-admin-filter-reset").addEventListener("click", () => {
     document.getElementById("galeri-admin-filter-kategori").value = "";
     document.getElementById("galeri-admin-search").value = "";
     document.getElementById("galeri-admin-filter-kategori-am").value = "";
     galeriAdminFilterKategori = "";
     galeriAdminFilterSukan = "";
     galeriAdminFilterKategoriAm = "";
     galeriAdminSearchTerm = "";
     populateGaleriAdminFilterSukan("");
     renderGaleriPreview();
   });

   function renderGaleriPreview() {
     const wrap = document.getElementById("galeri-preview");

     const tersaring = semuaGaleriCache.filter(row => {
       const kenaKategori = !galeriAdminFilterKategori || row.sukan?.kategori_sukan === galeriAdminFilterKategori;
       const kenaSukan = !galeriAdminFilterSukan || row.sukan_id === galeriAdminFilterSukan;
       const kenaKategoriAm = !galeriAdminFilterKategoriAm || row.kategori_am === galeriAdminFilterKategoriAm;
       const kenaCari = !galeriAdminSearchTerm || (row.tajuk || "").toLowerCase().includes(galeriAdminSearchTerm);
       return kenaKategori && kenaSukan && kenaKategoriAm && kenaCari;
     });

     if (tersaring.length === 0) {
       wrap.innerHTML = `<div class="empty-note">Tiada gambar sepadan.</div>`;
       return;
     }

     // Kumpul ikut nama acara sukan, atau kategori am (kalau tiada acara), atau "Lain-lain"
     const kumpulan = new Map();
     tersaring.forEach(row => {
       const nama = row.sukan?.nama_acara || row.kategori_am || "Lain-lain";
       if (!kumpulan.has(nama)) kumpulan.set(nama, []);
       kumpulan.get(nama).push(row);
     });
     const namaList = [...kumpulan.keys()].sort((a, b) => {
       if (a === "Lain-lain") return 1;
       if (b === "Lain-lain") return -1;
       return a.localeCompare(b);
     });

     wrap.innerHTML = namaList.map(nama => `
       <div class="gallery-group-admin">
         <div class="gallery-group-admin-title">${nama} <span class="gallery-group-count">(${kumpulan.get(nama).length})</span></div>
         <div class="gallery-preview-inner">
           ${kumpulan.get(nama).map(kadGaleriAdmin).join("")}
         </div>
       </div>
     `).join("");
   }

   function kadGaleriAdmin(row) {
     const { data: urlData } = sb.storage.from(GALERI_BUCKET).getPublicUrl(row.image_path);
     return `<div class="item" id="galeri-item-${row.id}">
       <img src="${urlData.publicUrl}" alt="${row.tajuk || ''}">
       <div class="caption">
         <span class="caption-text">${row.tajuk || '<em>(tiada tajuk)</em>'}</span>
         <input type="text" class="edit-input" value="${(row.tajuk || '').replace(/"/g, '&quot;')}" style="display:none;">
         <div class="caption-actions">
           <button class="edit-btn" onclick="mulaEditGaleri('${row.id}')">Edit</button>
           <button class="save-btn" onclick="simpanEditGaleri('${row.id}')" style="display:none;">Simpan</button>
           <button class="cancel-btn" onclick="batalEditGaleri('${row.id}')" style="display:none;">Batal</button>
           <button onclick="deleteGaleri('${row.id}','${row.image_path}')">Padam</button>
         </div>
       </div>
     </div>`;
   }

   function mulaEditGaleri(id) {
     const item = document.getElementById(`galeri-item-${id}`);
     item.querySelector(".caption-text").style.display = "none";
     item.querySelector(".edit-input").style.display = "block";
     item.querySelector(".edit-btn").style.display = "none";
     item.querySelector(".save-btn").style.display = "inline-block";
     item.querySelector(".cancel-btn").style.display = "inline-block";
     item.querySelector(".edit-input").focus();
   }

   function batalEditGaleri(id) {
     const item = document.getElementById(`galeri-item-${id}`);
     item.querySelector(".caption-text").style.display = "inline";
     item.querySelector(".edit-input").style.display = "none";
     item.querySelector(".edit-btn").style.display = "inline-block";
     item.querySelector(".save-btn").style.display = "none";
     item.querySelector(".cancel-btn").style.display = "none";
   }

   async function simpanEditGaleri(id) {
     const item = document.getElementById(`galeri-item-${id}`);
     const tajukBaru = item.querySelector(".edit-input").value.trim();
     const { error } = await sb.from("galeri").update({ tajuk: tajukBaru || null }).eq("id", id);
     if (error) { alert("Ralat: " + error.message); return; }
     loadGaleri();
   }

   document.getElementById("form-galeri").addEventListener("submit", async (e) => {
     e.preventDefault();
     const fileInput = document.getElementById("galeri-file");
     const file = fileInput.files[0];
     if (!file) return;
     const tajuk = document.getElementById("galeri-tajuk").value.trim();
     const kategoriAm = document.getElementById("galeri-kategori-am").value.trim();
     // Kalau Kategori Am diisi, abaikan Acara Sukan (saling eksklusif — gambar
     // tak boleh sekali gus kaitan acara sukan DAN kategori am).
     const sukanId = kategoriAm ? null : (document.getElementById("galeri-sukan").value || null);
     const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
   
     setMsg("galeri-status-msg", "Sedang muat naik...", true);
     const { error: uploadError } = await sb.storage.from(GALERI_BUCKET).upload(fileName, file);
     if (uploadError) return setMsg("galeri-status-msg", "Ralat muat naik: " + uploadError.message, false);
   
     const payload = {
       tajuk: tajuk || null,
       image_path: fileName,
       sukan_id: sukanId,
       kategori_am: kategoriAm || null,
     };
     const { error } = await sb.from("galeri").insert(payload);
     if (error) return setMsg("galeri-status-msg", "Ralat: " + error.message, false);
     setMsg("galeri-status-msg", "Gambar berjaya dimuat naik.");
     document.getElementById("form-galeri").reset();
     document.getElementById("galeri-filter-kategori").disabled = false;
     document.getElementById("galeri-sukan").disabled = true;
     populateGaleriSukanOptions("");
     loadGaleri();
   });
   
   async function deleteGaleri(id, imagePath) {
     if (!confirm("Padam gambar ini?")) return;
     await sb.storage.from(GALERI_BUCKET).remove([imagePath]);
     const { error } = await sb.from("galeri").delete().eq("id", id);
     if (error) return setMsg("galeri-status-msg", "Ralat: " + error.message, false);
     loadGaleri();
   }

   /* ================= PAPARAN (BANNER SLIDER & COUNTDOWN) ================= */
   let semuaSlaidCache = [];

   async function loadPaparan() {
     await loadTetapanPaparan();
     await loadSlaid();
   }

   async function loadTetapanPaparan() {
     const { data, error } = await sb.from("tetapan_paparan").select("*").eq("id", 1).maybeSingle();
     if (error) { console.error(error); return; }
     if (!data) return;
     document.getElementById("paparan-banner-aktif").checked = !!data.banner_aktif;
     document.getElementById("paparan-countdown-aktif").checked = !!data.countdown_aktif;
   }

   document.getElementById("paparan-tetapan-simpan").addEventListener("click", async () => {
     const payload = {
       id: 1,
       banner_aktif: document.getElementById("paparan-banner-aktif").checked,
       countdown_aktif: document.getElementById("paparan-countdown-aktif").checked,
       dikemaskini_pada: new Date().toISOString(),
     };
     const { error } = await sb.from("tetapan_paparan").upsert(payload);
     if (error) return setMsg("paparan-tetapan-status-msg", "Ralat: " + error.message, false);
     setMsg("paparan-tetapan-status-msg", "Tetapan disimpan.");
   });

   async function loadSlaid() {
     const { data, error } = await sb.from("banner_slaid").select("*").order("urutan", { ascending: true });
     const tbody = document.querySelector("#slaid-table tbody");
     if (error) { tbody.innerHTML = `<tr><td colspan="5" class="empty-note">Ralat: ${error.message}</td></tr>`; return; }
     semuaSlaidCache = data || [];

     if (semuaSlaidCache.length === 0) {
       tbody.innerHTML = `<tr><td colspan="5" class="empty-note">Belum ada slaid. Banner akan guna teks lalai sehingga slaid ditambah.</td></tr>`;
       return;
     }

     tbody.innerHTML = semuaSlaidCache.map(row => {
       let thumb = "&mdash;";
       if (row.imej_path) {
         const { data: urlData } = sb.storage.from(GALERI_BUCKET).getPublicUrl(row.imej_path);
         thumb = `<img src="${urlData.publicUrl}" alt="" style="width:60px;height:36px;object-fit:cover;border-radius:4px;">`;
       }
       const aktif = row.aktif !== false; // default aktif=true kalau kolum belum diisi
       const statusBadge = aktif
         ? '<span style="color:var(--success);">● Aktif</span>'
         : '<span style="color:var(--danger);">● Tak Aktif</span>';
       return `<tr>
         <td>${row.urutan}</td>
         <td>${row.tajuk || "<em>(gambar sahaja)</em>"}</td>
         <td>${thumb}</td>
         <td>${statusBadge}</td>
         <td class="row-actions">
           <button class="edit" onclick="mulaEditSlaid('${row.id}')">Edit</button>
           <button class="del" onclick="deleteSlaid('${row.id}','${row.imej_path || ""}')">Padam</button>
         </td>
       </tr>`;
     }).join("");
   }

   function mulaEditSlaid(id) {
     const row = semuaSlaidCache.find(r => r.id === id);
     if (!row) return;
     document.getElementById("slaid-id").value = row.id;
     document.getElementById("slaid-eyebrow").value = row.eyebrow || "";
     document.getElementById("slaid-urutan").value = row.urutan || 0;
     document.getElementById("slaid-tajuk").value = row.tajuk || "";
     document.getElementById("slaid-teks").value = row.teks || "";
     document.getElementById("slaid-aktif").checked = row.aktif !== false;
     document.getElementById("slaid-cancel").style.display = "inline-block";
     window.scrollTo({ top: document.getElementById("form-slaid").offsetTop - 20, behavior: "smooth" });
   }

   document.getElementById("slaid-cancel").addEventListener("click", () => {
     document.getElementById("form-slaid").reset();
     document.getElementById("slaid-id").value = "";
     document.getElementById("slaid-aktif").checked = true;
     document.getElementById("slaid-cancel").style.display = "none";
   });

   document.getElementById("form-slaid").addEventListener("submit", async (e) => {
     e.preventDefault();
     const id = document.getElementById("slaid-id").value;
     const file = document.getElementById("slaid-file").files[0];
     const tajuk = document.getElementById("slaid-tajuk").value.trim();

     let imejPath = id ? (semuaSlaidCache.find(r => r.id === id)?.imej_path || null) : null;

     if (!file && !imejPath && !tajuk) {
       return setMsg("slaid-status-msg", "Isi sekurang-kurangnya tajuk ATAU pilih gambar.", false);
     }

     if (file) {
       const fileName = `banner/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
       setMsg("slaid-status-msg", "Sedang muat naik gambar...", true);
       const { error: uploadError } = await sb.storage.from(GALERI_BUCKET).upload(fileName, file);
       if (uploadError) return setMsg("slaid-status-msg", "Ralat muat naik: " + uploadError.message, false);
       imejPath = fileName;
     }

     const payload = {
       eyebrow: document.getElementById("slaid-eyebrow").value.trim() || null,
       tajuk: tajuk || null,
       teks: document.getElementById("slaid-teks").value.trim() || null,
       urutan: parseInt(document.getElementById("slaid-urutan").value, 10) || 0,
       imej_path: imejPath,
       aktif: document.getElementById("slaid-aktif").checked,
     };

     const { error } = id
       ? await sb.from("banner_slaid").update(payload).eq("id", id)
       : await sb.from("banner_slaid").insert(payload);

     if (error) return setMsg("slaid-status-msg", "Ralat: " + error.message, false);
     setMsg("slaid-status-msg", "Slaid disimpan.");
     document.getElementById("form-slaid").reset();
     document.getElementById("slaid-id").value = "";
     document.getElementById("slaid-aktif").checked = true;
     document.getElementById("slaid-cancel").style.display = "none";
     loadSlaid();
   });

   async function deleteSlaid(id, imejPath) {
     if (!confirm("Padam slaid ini?")) return;
     if (imejPath) await sb.storage.from(GALERI_BUCKET).remove([imejPath]);
     const { error } = await sb.from("banner_slaid").delete().eq("id", id);
     if (error) return setMsg("slaid-status-msg", "Ralat: " + error.message, false);
     loadSlaid();
   }

   /* ================= VIDEO SOROTAN ================= */
   let semuaVideoCache = [];

   // Extract YouTube video ID dari pelbagai format link:
   // watch?v=XXXX, youtu.be/XXXX, /embed/XXXX, /shorts/XXXX
   function extractYoutubeId(url) {
     if (!url) return null;
     const patterns = [
       /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
       /(?:youtu\.be\/)([\w-]{11})/,
       /(?:youtube\.com\/embed\/)([\w-]{11})/,
       /(?:youtube\.com\/shorts\/)([\w-]{11})/,
     ];
     for (const p of patterns) {
       const match = url.match(p);
       if (match) return match[1];
     }
     return null;
   }

   async function loadVideo() {
     const { data, error } = await sb.from("video_karnival").select("*").order("urutan", { ascending: true });
     const tbody = document.querySelector("#video-table tbody");
     if (error) { tbody.innerHTML = `<tr><td colspan="5" class="empty-note">Ralat: ${error.message}</td></tr>`; return; }
     semuaVideoCache = data || [];

     if (semuaVideoCache.length === 0) {
       tbody.innerHTML = `<tr><td colspan="5" class="empty-note">Belum ada video ditambah.</td></tr>`;
       return;
     }

     tbody.innerHTML = semuaVideoCache.map(row => {
       const thumb = row.youtube_id
         ? `<img src="https://img.youtube.com/vi/${row.youtube_id}/default.jpg" alt="" style="width:60px;height:45px;object-fit:cover;border-radius:4px;">`
         : "&mdash;";
       const aktif = row.aktif !== false;
       const statusBadge = aktif
         ? '<span style="color:var(--success);">● Aktif</span>'
         : '<span style="color:var(--danger);">● Tak Aktif</span>';
       return `<tr>
         <td>${row.urutan}</td>
         <td>${row.tajuk}</td>
         <td>${thumb}</td>
         <td>${statusBadge}</td>
         <td class="row-actions">
           <button class="edit" onclick="mulaEditVideo('${row.id}')">Edit</button>
           <button class="del" onclick="deleteVideo('${row.id}')">Padam</button>
         </td>
       </tr>`;
     }).join("");
   }

   function mulaEditVideo(id) {
     const row = semuaVideoCache.find(r => r.id === id);
     if (!row) return;
     document.getElementById("video-id").value = row.id;
     document.getElementById("video-tajuk").value = row.tajuk || "";
     document.getElementById("video-url").value = row.youtube_id ? `https://youtu.be/${row.youtube_id}` : "";
     document.getElementById("video-urutan").value = row.urutan || 0;
     document.getElementById("video-aktif").checked = row.aktif !== false;
     document.getElementById("video-cancel").style.display = "inline-block";
     window.scrollTo({ top: document.getElementById("form-video").offsetTop - 20, behavior: "smooth" });
   }

   document.getElementById("video-cancel").addEventListener("click", () => {
     document.getElementById("form-video").reset();
     document.getElementById("video-id").value = "";
     document.getElementById("video-aktif").checked = true;
     document.getElementById("video-cancel").style.display = "none";
   });

   document.getElementById("form-video").addEventListener("submit", async (e) => {
     e.preventDefault();
     const id = document.getElementById("video-id").value;
     const url = document.getElementById("video-url").value.trim();
     const tajuk = document.getElementById("video-tajuk").value.trim();

     const youtubeId = extractYoutubeId(url);
     if (!youtubeId) {
       return setMsg("video-status-msg", "Link YouTube tidak sah. Pastikan link penuh (cth: youtube.com/watch?v=... atau youtu.be/...).", false);
     }

     const payload = {
       tajuk: tajuk,
       youtube_id: youtubeId,
       urutan: parseInt(document.getElementById("video-urutan").value, 10) || 0,
       aktif: document.getElementById("video-aktif").checked,
     };

     const { error } = id
       ? await sb.from("video_karnival").update(payload).eq("id", id)
       : await sb.from("video_karnival").insert(payload);

     if (error) return setMsg("video-status-msg", "Ralat: " + error.message, false);
     setMsg("video-status-msg", "Video disimpan.");
     document.getElementById("form-video").reset();
     document.getElementById("video-id").value = "";
     document.getElementById("video-aktif").checked = true;
     document.getElementById("video-cancel").style.display = "none";
     loadVideo();
   });

   async function deleteVideo(id) {
     if (!confirm("Padam video ini?")) return;
     const { error } = await sb.from("video_karnival").delete().eq("id", id);
     if (error) return setMsg("video-status-msg", "Ralat: " + error.message, false);
     loadVideo();
   }