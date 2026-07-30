// ============================================================
// LOGIK HALAMAN KIRAAN PINGAT (pingat.html)
// ============================================================

async function muatkanJadualPingat() {
  const el = document.getElementById("jadual-pingat");

  const { data, error } = await supabaseClient
    .from("kiraan_pingat")
    .select("*")
    .order("emas", { ascending: false })
    .order("perak", { ascending: false })
    .order("gangsa", { ascending: false });

  if (error) {
    el.innerHTML = `<tr><td colspan="6" class="loading-pulse">Gagal memuatkan data.</td></tr>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `<tr><td colspan="6" class="loading-pulse">Belum ada pingat direkodkan.</td></tr>`;
    return;
  }

  el.innerHTML = data.map((row, i) => `
    <tr>
      <td class="col-rank">${i + 1}</td>
      <td>
        <span class="team-cell">
          ${row.logo_url
            ? `<img class="team-flag" src="${escapeHtml(row.logo_url)}" alt="">`
            : `<span class="team-dot" style="background:${row.warna || "#00A99D"}"></span>`}
          <span class="team-name">${escapeHtml(row.nama_pasukan)}</span>
        </span>
      </td>
      <td class="col-emas">${row.emas}</td>
      <td class="col-perak">${row.perak}</td>
      <td class="col-gangsa">${row.gangsa}</td>
      <td class="col-jumlah">${row.jumlah}</td>
    </tr>
  `).join("");
}

muatkanJadualPingat();

// Kemas kini automatik secara langsung (realtime) apabila ada pingat baharu direkodkan
supabaseClient
  .channel("pingat-realtime")
  .on("postgres_changes", { event: "*", schema: "public", table: "pingat" }, () => {
    muatkanJadualPingat();
  })
  .subscribe();