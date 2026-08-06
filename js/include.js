// include.js
// Muatkan partials/header.html & partials/footer.html ke dalam setiap page.
// Update header/footer sekali di sini -> semua page auto update.

function includeHTML(placeholderId, url) {
    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`Gagal muatkan ${url}: ${res.status}`);
        return res.text();
      })
      .then(html => {
        const el = document.getElementById(placeholderId);
        if (el) el.innerHTML = html;
      })
      .catch(err => console.error(err));
  }
  
  function setActiveNav() {
    const current = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a[data-nav]").forEach(link => {
      if (link.getAttribute("data-nav") === current) {
        link.classList.add("active");
      }
    });
  }
  
  function setupNavToggle() {
    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", () => {
        links.classList.toggle("open");
      });
    }
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    Promise.all([
      includeHTML("header-placeholder", "partials/header.html"),
      includeHTML("footer-placeholder", "partials/footer.html")
    ]).then(() => {
      setActiveNav();
      setupNavToggle();
      // Beritahu script lain (index.js, dsb) header & footer dah siap dimuatkan
      document.dispatchEvent(new Event("partialsLoaded"));
    });
  });