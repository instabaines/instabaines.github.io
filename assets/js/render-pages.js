(function () {
  let data = null;
  let talks = [];

  if (!data) {
    data = {};
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderList(items) {
    return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function renderEducation() {
    const target = document.querySelector("[data-render='education']");
    if (!target) return;

    target.innerHTML = data.education
      .map(
        (entry) => `
          <article class="timeline-item">
            <h3>${escapeHtml(entry.school)}</h3>
            <p class="timeline-meta">${escapeHtml(entry.detail)}</p>
          </article>
        `
      )
      .join("");
  }

  function renderExperience() {
    const target = document.querySelector("[data-render='experience']");
    if (!target) return;

    target.innerHTML = data.experience
      .map(
        (entry) => `
          <article class="timeline-item">
            <h3>${escapeHtml(entry.company)}</h3>
            <p class="timeline-meta">${escapeHtml(entry.rolePeriod)}</p>
            <ul class="feature-list compact-list">${renderList(entry.bullets)}</ul>
          </article>
        `
      )
      .join("");
  }

  function renderSimpleList(key, selector) {
    const target = document.querySelector(selector);
    if (!target) return;
    target.innerHTML = renderList(data[key]);
  }

  function renderThemes() {
    const target = document.querySelector("[data-render='research-themes']");
    if (!target) return;

    target.innerHTML = data.researchThemes
      .map((theme) => `<span>${escapeHtml(theme)}</span>`)
      .join("");
  }

  function renderPublications() {
    const target = document.querySelector("[data-render='publications']");
    if (!target) return;

    target.innerHTML = data.publications
      .map(
        (item) => `
          <article class="publication-item">
            <p class="card-kicker">${escapeHtml(item.kicker)}</p>
            <h2>${item.linkUrl ? `<a href="${escapeHtml(item.linkUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}</h2>
            <p>${escapeHtml(item.summary)}</p>
            ${item.linkUrl ? `<a href="${escapeHtml(item.linkUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.linkLabel || "Open publication")}</a>` : ""}
          </article>
        `
      )
      .join("");
  }

  function splitBibEntries(text) {
    const entries = [];
    let start = -1;
    let depth = 0;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (char === "@") {
        start = i;
      }

      if (start >= 0 && char === "{") {
        depth += 1;
      }

      if (start >= 0 && char === "}") {
        depth -= 1;

        if (depth === 0) {
          entries.push(text.slice(start, i + 1));
          start = -1;
        }
      }
    }

    return entries;
  }

  function parseBibFields(entryText) {
    const typeMatch = entryText.match(/^@(\w+)\s*\{/);
    const headerMatch = entryText.match(/^@\w+\s*\{\s*([^,]+),/);
    const bodyStart = entryText.indexOf(",") + 1;
    const bodyEnd = entryText.lastIndexOf("}");
    const body = entryText.slice(bodyStart, bodyEnd);
    const fields = {};

    let i = 0;
    while (i < body.length) {
      while (i < body.length && /[\s,]/.test(body[i])) i += 1;
      if (i >= body.length) break;

      const keyStart = i;
      while (i < body.length && /[A-Za-z0-9_-]/.test(body[i])) i += 1;
      const key = body.slice(keyStart, i).trim().toLowerCase();

      while (i < body.length && /[\s=]/.test(body[i])) i += 1;
      if (i >= body.length) break;

      let value = "";
      if (body[i] === "{") {
        let depth = 0;
        i += 1;
        const valueStart = i;
        while (i < body.length) {
          if (body[i] === "{") depth += 1;
          if (body[i] === "}") {
            if (depth === 0) break;
            depth -= 1;
          }
          i += 1;
        }
        value = body.slice(valueStart, i);
        i += 1;
      } else if (body[i] === '"') {
        i += 1;
        const valueStart = i;
        while (i < body.length && body[i] !== '"') i += 1;
        value = body.slice(valueStart, i);
        i += 1;
      } else {
        const valueStart = i;
        while (i < body.length && body[i] !== ",") i += 1;
        value = body.slice(valueStart, i).trim();
      }

      fields[key] = value.replace(/\s+/g, " ").trim();

      while (i < body.length && body[i] !== ",") i += 1;
      if (i < body.length && body[i] === ",") i += 1;
    }

    fields.entrytype = typeMatch ? typeMatch[1].toLowerCase() : "entry";
    fields.entrykey = headerMatch ? headerMatch[1].trim() : "";
    return fields;
  }

  function formatAuthors(authorText) {
    if (!authorText) return "";

    const authors = authorText
      .split(/\s+and\s+/i)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((name) => {
        if (name.includes(",")) {
          const parts = name.split(",").map((item) => item.trim());
          return parts[0];
        }
        const parts = name.split(/\s+/).filter(Boolean);
        return parts[parts.length - 1] || name;
      });

    if (authors.length <= 3) {
      return authors.join(", ");
    }

    return `${authors.slice(0, 3).join(", ")}, et al.`;
  }

  function sentenceCaseVenue(fields) {
    return fields.journal || fields.booktitle || fields.publisher || fields.organization || "Publication";
  }

  function publicationSummary(fields) {
    const summaryBits = [];
    const authors = formatAuthors(fields.author);
    const venue = sentenceCaseVenue(fields);
    const pages = fields.pages ? `pp. ${fields.pages}` : "";

    if (authors) summaryBits.push(authors);
    if (venue) summaryBits.push(venue);
    if (pages) summaryBits.push(pages);

    return summaryBits.join(" - ");
  }

  function publicationLink(fields) {
    if (fields.url) return fields.url;
    if (!fields.doi) return "";

    const doi = fields.doi.trim();
    if (/^https?:\/\//i.test(doi)) return doi;
    if (/^doi\.org\//i.test(doi)) return `https://${doi}`;
    return `https://doi.org/${doi.replace(/^doi:\s*/i, "")}`;
  }

  function normalizeBibPublications(entries) {
    return entries
      .map(parseBibFields)
      .filter((fields) => fields.title)
      .map((fields) => ({
        kicker: `${fields.year || "In progress"} - ${sentenceCaseVenue(fields)}`,
        title: fields.title,
        summary: publicationSummary(fields),
        linkLabel: publicationLink(fields) ? "Open publication" : "",
        linkUrl: publicationLink(fields),
        year: Number.parseInt(fields.year || "0", 10) || 0
      }))
      .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title))
      .map(({ year, ...rest }) => rest);
  }

  async function loadBibPublications() {
    try {
      const response = await fetch("articles.bib", { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Unable to load BibTeX: ${response.status}`);
      }

      const text = await response.text();
      const entries = splitBibEntries(text);
      const publications = normalizeBibPublications(entries);

      if (publications.length > 0) {
        data.publications = publications;
      }
    } catch (error) {
      console.warn("Falling back to built-in publications data.", error);
    }
  }

  async function loadSiteContent() {
    try {
      const response = await fetch("data/site-content.json", { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Unable to load site content: ${response.status}`);
      }

      const payload = await response.json();
      if (payload && typeof payload === "object") {
        data = payload;
      }
    } catch (error) {
      console.warn("Unable to load site content.", error);
      data = {
        profile: {},
        education: [],
        experience: [],
        skills: [],
        interests: [],
        researchThemes: [],
        publications: [],
        tools: []
      };
    }
  }

  async function loadTalksData() {
    try {
      const response = await fetch("data/talks.json", { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Unable to load talks data: ${response.status}`);
      }

      const payload = await response.json();
      if (Array.isArray(payload)) {
        talks = payload;
      }
    } catch (error) {
      console.warn("Unable to load talks data.", error);
      talks = [];
    }
  }

  function formatTalkDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function talkMeta(talk) {
    return [talk.venue, talk.location, formatTalkDate(talk.date)].filter(Boolean).join(" - ");
  }

  function renderTalkMetaPills(talk) {
    return [
      talk.venue ? `<span>${escapeHtml(talk.venue)}</span>` : "",
      talk.location ? `<span>${escapeHtml(talk.location)}</span>` : "",
      talk.date ? `<span>${escapeHtml(formatTalkDate(talk.date))}</span>` : ""
    ]
      .filter(Boolean)
      .join("");
  }

  function findTalkBySlug() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");
    if (!slug) return null;
    return talks.find((talk) => talk.slug === slug) || null;
  }

  function renderTalks() {
    const target = document.querySelector("[data-render='talks']");
    if (!target) return;

    target.innerHTML = talks
      .map(
        (item) => `
          <article class="timeline-item talk-card">
            <p class="card-kicker">${escapeHtml(item.venue || "Talk")}</p>
            <h2><a href="talk-detail.html?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></h2>
            <p class="timeline-meta">${escapeHtml(talkMeta(item))}</p>
            <p>${escapeHtml(item.summary)}</p>
            <div class="tag-row">
              ${(item.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
            <a href="talk-detail.html?slug=${encodeURIComponent(item.slug)}">Explore talk details</a>
          </article>
        `
      )
      .join("");
  }

  function renderTalkDetail() {
    const target = document.querySelector("[data-render='talk-detail']");
    if (!target) return;

    const talk = findTalkBySlug();
    if (!talk) {
      target.innerHTML = `
        <section class="panel">
          <h2>Talk not found</h2>
          <p>The requested talk could not be found. Return to the talks page to browse available entries.</p>
          <a class="button button-primary" href="talks.html">Back to talks</a>
        </section>
      `;
      return;
    }

    const hero = talk.assets && talk.assets.heroImage
      ? `
        <div class="talk-detail-media-card">
          <img class="talk-detail-hero-image" src="${escapeHtml(talk.assets.heroImage)}" alt="${escapeHtml(talk.title)}" />
        </div>
      `
      : `
        <div class="talk-detail-media-card talk-detail-media-fallback">
          <p class="talk-detail-media-kicker">${escapeHtml(talk.venue || "Talk")}</p>
          <h2>${escapeHtml(formatTalkDate(talk.date) || "Featured session")}</h2>
          <p>${escapeHtml(talk.location || "Speaking engagement")}</p>
        </div>
      `;

    const gallery = talk.assets && talk.assets.gallery && talk.assets.gallery.length
      ? `
        <div class="detail-gallery">
          ${talk.assets.gallery.map((image) => `<img src="${escapeHtml(image)}" alt="${escapeHtml(talk.title)} gallery image" />`).join("")}
        </div>
      `
      : "";

    const links = talk.links && talk.links.length
      ? `
        <div class="card-actions">
          ${talk.links.map((link) => `<a class="button button-secondary" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("")}
        </div>
      `
      : "<p>No external resources are listed for this talk.</p>";

    const memories = talk.memories && talk.memories.length
      ? `<ul class="feature-list compact-list">${renderList(talk.memories)}</ul>`
      : "<p>No additional notes are available for this talk.</p>";

    const tags = talk.tags && talk.tags.length
      ? `<div class="tag-row">${talk.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`
      : "<p>No tags are listed for this talk.</p>";

    target.innerHTML = `
      <section class="talk-detail-hero">
        <div class="talk-detail-media">
          ${hero}
        </div>
        <div class="talk-detail-intro">
          <p class="eyebrow">Talk Detail</p>
          <h1>${escapeHtml(talk.title)}</h1>
          <p class="lead">${escapeHtml(talk.summary)}</p>
          <div class="talk-detail-meta-row">
            ${renderTalkMetaPills(talk)}
          </div>
          ${talk.links && talk.links.length ? `<div class="card-actions">${talk.links.slice(0, 2).map((link) => `<a class="button ${link.label.toLowerCase().includes("slide") ? "button-primary" : "button-secondary"}" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("")}</div>` : ""}
        </div>
      </section>
      <section class="talk-detail-grid">
        <article class="panel talk-detail-main">
          <h2>Overview</h2>
          <p>${escapeHtml(talk.summary)}</p>
          <p class="timeline-meta">${escapeHtml(talkMeta(talk))}</p>
        </article>
        <article class="panel talk-detail-side">
          <h2>Resources</h2>
          ${links}
        </article>
      </section>
      <section class="talk-detail-grid">
        <article class="panel talk-detail-main">
          <h2>Memories and notes</h2>
          ${memories}
        </article>
        <article class="panel talk-detail-side">
          <h2>Tags</h2>
          ${tags}
        </article>
      </section>
      ${gallery ? `<section class="panel"><h2>Event gallery</h2>${gallery}</section>` : ""}
    `;
  }

  function renderTools() {
    const target = document.querySelector("[data-render='tools']");
    if (!target) return;

    target.innerHTML = data.tools
      .map((item) => {
        const actions = (item.actions || [])
          .map(
            (action) => `
              <a class="button ${action.primary ? "button-primary" : "button-secondary"}" href="${escapeHtml(action.url)}">${escapeHtml(action.label)}</a>
            `
          )
          .join("");

        const links = (item.links || [])
          .map((link) => `<li><a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a></li>`)
          .join("");

        return `
          <article class="content-card tall-card">
            <p class="card-kicker">${escapeHtml(item.kicker)}</p>
            <h2>${escapeHtml(item.title)}</h2>
            <p>${escapeHtml(item.summary)}</p>
            ${actions ? `<div class="card-actions">${actions}</div>` : ""}
            ${links ? `<ul class="feature-list compact-list">${links}</ul>` : ""}
          </article>
        `;
      })
      .join("");
  }

  function renderHomeFeatured() {
    const target = document.querySelector("[data-render='home-featured']");
    if (!target) return;

    const latestPublications = (data.publications || []).slice(0, 2).map(
      (item) => `
        <article class="content-card">
          <p class="card-kicker">${escapeHtml(item.kicker)}</p>
          <h3>${item.linkUrl ? `<a href="${escapeHtml(item.linkUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary)}</p>
          <a href="research.html">See publications</a>
        </article>
      `
    );

    const latestTalk = [...talks]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 1)
      .map(
        (item) => `
          <article class="content-card">
            <p class="card-kicker">Talk - ${escapeHtml(item.date ? item.date.slice(0, 4) : "Recent")}</p>
            <h3><a href="talk-detail.html?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></h3>
            <p>${escapeHtml(item.summary)}</p>
            <a href="talk-detail.html?slug=${encodeURIComponent(item.slug)}">View talk</a>
          </article>
        `
      );

    target.innerHTML = [...latestPublications, ...latestTalk].join("");
  }

  function renderHomeTools() {
    const target = document.querySelector("[data-render='home-tools']");
    if (!target) return;

    target.innerHTML = (data.tools || [])
      .slice(0, 3)
      .map((item) => {
        const primaryAction = (item.actions || [])[0];
        const href = primaryAction ? primaryAction.url : "tools.html";

        return `
          <a class="tool-card" href="${escapeHtml(href)}">
            <span class="tool-title">${escapeHtml(item.title)}</span>
            <span class="tool-copy">${escapeHtml(item.summary)}</span>
          </a>
        `;
      })
      .join("");
  }

  function renderProfile() {
    const target = document.querySelector("[data-render='profile-links']");
    if (!target) return;

    target.innerHTML = `
      <li>${escapeHtml(data.profile.location)}</li>
      <li><a href="mailto:${escapeHtml(data.profile.email)}">${escapeHtml(data.profile.email)}</a></li>
      <li><a href="${escapeHtml(data.profile.linkedin)}" target="_blank" rel="noreferrer">${escapeHtml(data.profile.linkedin.replace("https://", ""))}</a></li>
    `;
  }

  async function init() {
    await loadSiteContent();
    await loadBibPublications();
    await loadTalksData();
    renderProfile();
    renderEducation();
    renderExperience();
    renderSimpleList("skills", "[data-render='skills']");
    renderSimpleList("interests", "[data-render='interests']");
    renderThemes();
    renderPublications();
    renderTalks();
    renderTalkDetail();
    renderTools();
    renderHomeFeatured();
    renderHomeTools();
  }

  init();
})();
