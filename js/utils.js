// ============================================================
// UTILITI BERSAMA
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
  }

  // Tandakan link nav aktif berdasarkan fail semasa
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((a) => {
    if (a.getAttribute("href") === current) a.classList.add("active");
  });
});

const BULAN_MS = [
  "Jan", "Feb", "Mac", "Apr", "Mei", "Jun",
  "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"
];

function formatTarikh(tarikhStr) {
  if (!tarikhStr) return "";
  const d = new Date(tarikhStr + "T00:00:00");
  return `${d.getDate()} ${BULAN_MS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatMasa(masaStr) {
  if (!masaStr) return "";
  const [h, m] = masaStr.split(":");
  const jam = parseInt(h, 10);
  const ampm = jam >= 12 ? "PTG" : "PAGI";
  const jam12 = jam % 12 === 0 ? 12 : jam % 12;
  return `${jam12}:${m} ${ampm}`;
}

function statusLabel(status) {
  const map = {
    akan_datang: "Akan Datang",
    sedang_berlangsung: "Sedang Berlangsung",
    selesai: "Selesai",
    ditangguhkan: "Ditangguhkan",
  };
  return map[status] || status;
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
