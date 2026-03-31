(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    if (!value) return "";

    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function modeLabel(mode) {
    if (mode === "virtual") return "Virtual";
    if (mode === "hybrid") return "Hybrid";
    return "In person";
  }

  async function loadTalks() {
    const response = await fetch("/data/talks.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load talks data.");
    return response.json();
  }

  function renderMappedList(mapped) {
    const target = document.getElementById("talk-map-list");
    if (!target) return;

    if (!mapped.length) {
      target.innerHTML = `<p class="muted-copy">No mapped talks yet.</p>`;
      return;
    }

    target.innerHTML = mapped
      .map(
        (talk) => `
          <article class="talk-map-entry">
            <div class="talk-map-entry-header">
              <p class="eyebrow">${escapeHtml(modeLabel(talk.map.mode))}</p>
              <p class="talk-map-date">${escapeHtml(formatDate(talk.date))}</p>
            </div>
            <h3><a href="/talk-detail/?slug=${encodeURIComponent(talk.slug)}">${escapeHtml(talk.title)}</a></h3>
            <p class="talk-map-meta">${escapeHtml(talk.venue)} - ${escapeHtml(talk.map.label || talk.location)}</p>
            <button class="button button-secondary talk-map-focus" data-lat="${talk.map.lat}" data-lng="${talk.map.lng}">
              Focus on map
            </button>
          </article>
        `
      )
      .join("");
  }

  function initMap(mapped) {
    const element = document.getElementById("talk-map");
    if (!element || typeof L === "undefined") return null;

    const map = L.map(element, {
      zoomControl: true,
      scrollWheelZoom: false
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const bounds = [];

    mapped.forEach((talk) => {
      const lat = Number(talk.map.lat);
      const lng = Number(talk.map.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const marker = L.marker([lat, lng]).addTo(map);
      const popup = `
        <div class="map-popup">
          <p class="eyebrow">${escapeHtml(talk.venue)}</p>
          <h3>${escapeHtml(talk.title)}</h3>
          <p>${escapeHtml(talk.map.label || talk.location || "")}</p>
          <p>${escapeHtml(formatDate(talk.date))}</p>
          <a href="/talk-detail/?slug=${encodeURIComponent(talk.slug)}">Open talk</a>
        </div>
      `;
      marker.bindPopup(popup);
      bounds.push([lat, lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 5);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else {
      map.setView([20, 0], 2);
    }

    document.querySelectorAll(".talk-map-focus").forEach((button) => {
      button.addEventListener("click", () => {
        const lat = Number(button.getAttribute("data-lat"));
        const lng = Number(button.getAttribute("data-lng"));
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        map.setView([lat, lng], 6, { animate: true });
      });
    });

    return map;
  }

  async function init() {
    if (!document.getElementById("talk-map")) return;

    try {
      const talks = await loadTalks();
      const ordered = talks
        .slice()
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      const mapped = ordered.filter(
        (talk) => talk.map && Number.isFinite(Number(talk.map.lat)) && Number.isFinite(Number(talk.map.lng))
      );
      renderMappedList(mapped);
      initMap(mapped);
    } catch (error) {
      const target = document.getElementById("talk-map");
      if (target) {
        target.innerHTML = `<p class="muted-copy">The talk map could not be loaded right now.</p>`;
      }
      console.error(error);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
