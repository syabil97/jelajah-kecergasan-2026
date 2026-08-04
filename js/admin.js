/* ================================================================
   KONFIGURASI SUPABASE
   ================================================================ */
   const SUPABASE_URL = "https://tlxvkplyzhrqtulnjujp.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRseHZrcGx5emhycXR1bG5qdWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4Njc5ODcsImV4cCI6MjA5ODQ0Mzk4N30.pe5VDYqU134vXWFd9w8Ajtu-4TlxFiSj_Zr6oQ04IyI";
   const GALERI_BUCKET = "galeri"; // nama Supabase Storage bucket
   
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
   
   async function loadAll() {
     await loadPasukan();
     await loadKategori();
     await loadSukan();
     loadKeputusan();
     loadPingat();
     loadInfo();
     loadGaleri();
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
     const curSukanKategori = sukanKategoriSel.value;
     const curPingatFilterKategori = pingatFilterKategoriSel.value;
     const curSukanFilterKategori = sukanFilterKategoriSel.value;
     sukanKategoriSel.innerHTML = '<option value="">-- pilih kategori --</option>';
     pingatFilterKategoriSel.innerHTML = '<option value="">-- pilih kategori --</option>';
     sukanFilterKategoriSel.innerHTML = '<option value="">-- semua kategori --</option>';
   
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
     });
   
     if (curSukanKategori) sukanKategoriSel.value = curSukanKategori;
     if (curPingatFilterKategori) pingatFilterKategoriSel.value = curPingatFilterKategori;
     if (curSukanFilterKategori) sukanFilterKategoriSel.value = curSukanFilterKategori;
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
     const galeriSukanSel = document.getElementById("galeri-sukan");
     const pingatFilterKategoriSel = document.getElementById("pingat-filter-kategori");
     const curKategori = kategoriSel.value;
     const curGaleriSukan = galeriSukanSel.value;
     kategoriSel.innerHTML = '<option value="">-- pilih --</option>';
     galeriSukanSel.innerHTML = '<option value="">-- tiada --</option>';
   
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
       galeriSukanSel.innerHTML += `<option value="${row.id}">${row.nama_acara}</option>`;
     });
   
     if (curKategori) kategoriSel.value = curKategori;
     if (curGaleriSukan) galeriSukanSel.value = curGaleriSukan;
   
     populatePingatSukanOptions(pingatFilterKategoriSel.value);
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
         <td>${statusLabel[row.status] || row.status || ""}</td>
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
   
   document.getElementById("form-sukan").addEventListener("submit", async (e) => {
     e.preventDefault();
     const id = document.getElementById("sukan-id").value;
     const tarikhMula = document.getElementById("sukan-tarikh").value;
     const tarikhAkhir = document.getElementById("sukan-tarikh-akhir").value;
     if (tarikhMula && tarikhAkhir && tarikhAkhir < tarikhMula) {
       return setMsg("sukan-status-msg", "Ralat: Tarikh Akhir tak boleh sebelum Tarikh Mula.", false);
     }
     const payload = {
       nama_acara: document.getElementById("sukan-nama-acara").value.trim(),
       kategori_sukan: document.getElementById("sukan-kategori").value.trim(),
       tarikh: document.getElementById("sukan-tarikh").value || null,
       tarikh_akhir: document.getElementById("sukan-tarikh-akhir").value || null,
       masa: document.getElementById("sukan-masa").value || null,
       lokasi: document.getElementById("sukan-lokasi").value.trim() || null,
       status: document.getElementById("sukan-status").value,
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
     document.getElementById("sukan-lokasi").value = row.lokasi || "";
     document.getElementById("sukan-status").value = row.status || "akan_datang";
     document.getElementById("sukan-keputusan").value = row.keputusan || "";
     document.getElementById("sukan-cancel").style.display = "inline-block";
   }
   function resetSukanForm() {
     document.getElementById("form-sukan").reset();
     document.getElementById("sukan-id").value = "";
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
   async function loadKeputusan() {
     const { data, error } = await sb.from("perlawanan").select("*").order("tarikh", { ascending: false });
     const tbody = document.querySelector("#keputusan-table tbody");
     tbody.innerHTML = "";
     if (error) { tbody.innerHTML = `<tr><td colspan="8" class="empty-note">Ralat: ${error.message}</td></tr>`; return; }
     if (!data || data.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="empty-note">Belum ada keputusan.</td></tr>`; return; }
   
     const { data: pasukanList } = await sb.from("pasukan").select("*");
     const namaPasukan = id => (pasukanList || []).find(p => p.id === id)?.nama || "-";
   
     data.forEach(row => {
       tbody.innerHTML += `<tr>
         <td>${row.kategori_sukan || ""}</td>
         <td>${row.pusingan || ""}</td>
         <td>${namaPasukan(row.pasukan_a_id)}</td>
         <td>${row.skor_a ?? "-"} : ${row.skor_b ?? "-"}</td>
         <td>${namaPasukan(row.pasukan_b_id)}</td>
         <td>${row.tarikh || ""}</td>
         <td>${statusLabel[row.status] || row.status || ""}</td>
         <td class="row-actions">
           <button class="edit" onclick='editKeputusan(${JSON.stringify(row)})'>Edit</button>
           <button class="del" onclick="deleteKeputusan('${row.id}')">Padam</button>
         </td></tr>`;
     });
   }
   
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
   async function loadPingat() {
     const { data, error } = await sb.from("pingat").select("*").order("dianugerah_pada", { ascending: false });
     const tbody = document.querySelector("#pingat-table tbody");
     tbody.innerHTML = "";
     if (error) { tbody.innerHTML = `<tr><td colspan="5" class="empty-note">Ralat: ${error.message}</td></tr>`; return; }
     if (!data || data.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="empty-note">Belum ada rekod pingat.</td></tr>`; return; }
   
     const { data: pasukanList } = await sb.from("pasukan").select("*");
     const { data: sukanList } = await sb.from("sukan").select("*");
     const namaPasukan = id => (pasukanList || []).find(p => p.id === id)?.nama || "-";
     const namaAcara = id => (sukanList || []).find(s => s.id === id)?.nama_acara || "-";
     const jenisLabel = { emas: "🥇 Emas", perak: "🥈 Perak", gangsa: "🥉 Gangsa" };
   
     data.forEach(row => {
       tbody.innerHTML += `<tr>
         <td>${namaAcara(row.sukan_id)}</td>
         <td>${row.kategori || ""}</td>
         <td>${namaPasukan(row.pasukan_id)}</td>
         <td>${jenisLabel[row.jenis] || row.jenis || ""}</td>
         <td class="row-actions">
           <button class="edit" onclick='editPingat(${JSON.stringify(row)})'>Edit</button>
           <button class="del" onclick="deletePingat('${row.id}')">Padam</button>
         </td></tr>`;
     });
   }
   
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
   
   /* ================= INFO ================= */
   async function loadInfo() {
     const { data, error } = await sb.from("info").select("*").order("dibuat_pada", { ascending: false });
     const tbody = document.querySelector("#info-table tbody");
     tbody.innerHTML = "";
     if (error) { tbody.innerHTML = `<tr><td colspan="4" class="empty-note">Ralat: ${error.message}</td></tr>`; return; }
     if (!data || data.length === 0) { tbody.innerHTML = `<tr><td colspan="4" class="empty-note">Belum ada info.</td></tr>`; return; }
     data.forEach(row => {
       const tarikh = row.dibuat_pada ? new Date(row.dibuat_pada).toLocaleDateString("ms-MY") : "";
       tbody.innerHTML += `<tr>
         <td>${row.tajuk}</td>
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
     const payload = {
       tajuk: document.getElementById("info-tajuk").value.trim(),
       kandungan: document.getElementById("info-kandungan").value.trim(),
       penting: document.getElementById("info-penting").checked,
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
     document.getElementById("info-cancel").style.display = "inline-block";
   }
   function resetInfoForm() {
     document.getElementById("form-info").reset();
     document.getElementById("info-id").value = "";
     document.getElementById("info-cancel").style.display = "none";
   }
   document.getElementById("info-cancel").addEventListener("click", resetInfoForm);
   
   async function deleteInfo(id) {
     if (!confirm("Padam info ini?")) return;
     const { error } = await sb.from("info").delete().eq("id", id);
     if (error) return setMsg("info-status-msg", "Ralat: " + error.message, false);
     loadInfo();
   }
   
   /* ================= GALERI ================= */
   async function loadGaleri() {
     const { data, error } = await sb.from("galeri").select("*").order("dimuat_naik_pada", { ascending: false });
     const wrap = document.getElementById("galeri-preview");
     wrap.innerHTML = "";
     if (error) { wrap.innerHTML = `<div class="empty-note">Ralat: ${error.message}</div>`; return; }
     if (!data || data.length === 0) { wrap.innerHTML = `<div class="empty-note">Belum ada gambar.</div>`; return; }
     data.forEach(row => {
       const { data: urlData } = sb.storage.from(GALERI_BUCKET).getPublicUrl(row.image_path);
       wrap.innerHTML += `<div class="item">
         <img src="${urlData.publicUrl}" alt="${row.tajuk || ''}">
         <div class="caption">${row.tajuk || ""}
           <button onclick="deleteGaleri('${row.id}','${row.image_path}')">Padam</button>
         </div></div>`;
     });
   }
   
   document.getElementById("form-galeri").addEventListener("submit", async (e) => {
     e.preventDefault();
     const fileInput = document.getElementById("galeri-file");
     const file = fileInput.files[0];
     if (!file) return;
     const tajuk = document.getElementById("galeri-tajuk").value.trim();
     const sukanId = document.getElementById("galeri-sukan").value || null;
     const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
   
     setMsg("galeri-status-msg", "Sedang muat naik...", true);
     const { error: uploadError } = await sb.storage.from(GALERI_BUCKET).upload(fileName, file);
     if (uploadError) return setMsg("galeri-status-msg", "Ralat muat naik: " + uploadError.message, false);
   
     const payload = {
       tajuk: tajuk || null,
       image_path: fileName,
       sukan_id: sukanId,
     };
     const { error } = await sb.from("galeri").insert(payload);
     if (error) return setMsg("galeri-status-msg", "Ralat: " + error.message, false);
     setMsg("galeri-status-msg", "Gambar berjaya dimuat naik.");
     document.getElementById("form-galeri").reset();
     loadGaleri();
   });
   
   async function deleteGaleri(id, imagePath) {
     if (!confirm("Padam gambar ini?")) return;
     await sb.storage.from(GALERI_BUCKET).remove([imagePath]);
     const { error } = await sb.from("galeri").delete().eq("id", id);
     if (error) return setMsg("galeri-status-msg", "Ralat: " + error.message, false);
     loadGaleri();
   }