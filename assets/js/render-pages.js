(function () {
  let data = null;
  let talks = [];
  let writing = { platforms: [], featured: [] };
  let notes = [];
  let noteBodies = {};
  let publicationSortKey = "date";
  let publicationFilters = {
    year: "",
    type: "",
    search: "",
    theme: ""
  };

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

  function toSiteUrl(value) {
    const url = String(value || "").trim();
    if (!url) return "";
    if (/^(https?:|mailto:|tel:|#|\?)/i.test(url)) return url;
    if (url.startsWith("/")) return url;
    return `/${url}`;
  }

  function renderList(items) {
    return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function formatNoteDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function parseNoteMarkdown(text) {
    const source = String(text || "").replace(/\r\n/g, "\n");
    const meta = { title: "", date: "", summary: "" };
    const lines = source.split("\n");
    let bodyStart = 0;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) continue;

      const titleMatch = line.match(/^Title:\s*(.+)$/i);
      if (titleMatch) {
        meta.title = titleMatch[1].trim();
        bodyStart = i + 1;
        continue;
      }

      const dateMatch = line.match(/^Date:\s*(.+)$/i);
      if (dateMatch) {
        meta.date = dateMatch[1].trim();
        bodyStart = i + 1;
        continue;
      }

      const summaryMatch = line.match(/^Summary:\s*(.+)$/i);
      if (summaryMatch) {
        meta.summary = summaryMatch[1].trim();
        bodyStart = i + 1;
        continue;
      }

      if (/^Text:\s*$/i.test(line)) {
        bodyStart = i + 1;
        break;
      }
    }

    return {
      ...meta,
      body: lines.slice(bodyStart).join("\n").trim()
    };
  }

  function renderInlineMarkdown(text) {
    const escaped = escapeHtml(text);
    return escaped
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  function markdownToHtml(markdown) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let listItems = [];
    let orderedItems = [];
    let inCodeBlock = false;
    let codeLines = [];

    function flushParagraph() {
      if (!paragraph.length) return;
      html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    }

    function flushUnordered() {
      if (!listItems.length) return;
      html.push(`<ul class="feature-list compact-list">${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
      listItems = [];
    }

    function flushOrdered() {
      if (!orderedItems.length) return;
      html.push(`<ol class="feature-list compact-list">${orderedItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ol>`);
      orderedItems = [];
    }

    function flushCode() {
      if (!codeLines.length) return;
      const escaped = codeLines.join("\n")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      html.push(`<pre><code>${escaped}</code></pre>`);
      codeLines = [];
    }

    lines.forEach((rawLine) => {
      const line = rawLine.trim();

      if (line.startsWith("```")) {
        if (inCodeBlock) {
          flushCode();
          inCodeBlock = false;
        } else {
          flushParagraph();
          flushUnordered();
          flushOrdered();
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeLines.push(rawLine);
        return;
      }

      if (!line) {
        flushParagraph();
        flushUnordered();
        flushOrdered();
        return;
      }

      if (line === "---") {
        flushParagraph();
        flushUnordered();
        flushOrdered();
        html.push("<hr />");
        return;
      }

      const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
      if (headingMatch) {
        flushParagraph();
        flushUnordered();
        flushOrdered();
        const level = Math.min(headingMatch[1].length + 1, 4);
        html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
        return;
      }

      const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
      if (unorderedMatch) {
        flushParagraph();
        flushOrdered();
        listItems.push(unorderedMatch[1]);
        return;
      }

      const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
      if (orderedMatch) {
        flushParagraph();
        flushUnordered();
        orderedItems.push(orderedMatch[1]);
        return;
      }

      paragraph.push(line);
    });

    flushParagraph();
    flushUnordered();
    flushOrdered();
    if (inCodeBlock) flushCode();

    return html.join("");
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
      .map(
        (theme) => `
          <button
            type="button"
            class="theme-chip${publicationFilters.theme === theme ? " is-active" : ""}"
            data-research-theme="${escapeHtml(theme)}"
            aria-pressed="${publicationFilters.theme === theme ? "true" : "false"}"
          >
            ${escapeHtml(theme)}
          </button>
        `
      )
      .join("");
  }

  function renderPublications() {
    const target = document.querySelector("[data-render='publications']");
    if (!target) return;

    const filteredPublications = sortPublications(filterPublications(data.publications || []));

    target.innerHTML = filteredPublications
      .map(
        (item) => `
          <article class="publication-item">
            <div class="publication-meta-row">
              <p class="card-kicker">${escapeHtml(item.kicker)}</p>
              <span class="publication-badge publication-badge-${escapeHtml(item.typeTone || "general")}">${escapeHtml(item.typeLabel || "Publication")}</span>
            </div>
            <h2>${item.linkUrl ? `<a href="${escapeHtml(toSiteUrl(item.linkUrl))}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}</h2>
            <p>${item.summaryHtml || escapeHtml(item.summary)}</p>
            ${item.themes && item.themes.length ? `<div class="tag-row publication-theme-row">${item.themes.map((theme) => `<span>${escapeHtml(theme)}</span>`).join("")}</div>` : ""}
            ${item.linkUrl ? `<a href="${escapeHtml(toSiteUrl(item.linkUrl))}" target="_blank" rel="noreferrer">${escapeHtml(item.linkLabel || "Open publication")}</a>` : ""}
          </article>
        `
      )
      .join("");

    if (!filteredPublications.length) {
      target.innerHTML = `
        <article class="publication-item">
          <h2>No matching publications</h2>
          <p>Try adjusting the filters or search text to broaden the result set.</p>
        </article>
      `;
    }

    renderPublicationResults(filteredPublications.length, (data.publications || []).length);
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

  function parseAuthorNames(authorText) {
    if (!authorText) return "";

    return authorText
      .split(/\s+and\s+/i)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((name) => {
        if (name.includes(",")) {
          const parts = name.split(",").map((item) => item.trim());
          return {
            full: name,
            family: parts[0] || name,
            given: parts.slice(1).join(" ")
          };
        }

        const parts = name.split(/\s+/).filter(Boolean);
        return {
          full: name,
          family: parts[parts.length - 1] || name,
          given: parts.slice(0, -1).join(" ")
        };
      });
  }

  function isRidwanAuthor(author) {
    const family = String(author.family || "").toLowerCase();
    const given = String(author.given || "").toLowerCase();
    const full = String(author.full || "").toLowerCase();

    return family.includes("amure") || given.includes("ridwan") || full.includes("ridwan");
  }

  function renderAuthorLabel(author) {
    const label = escapeHtml(author.family || author.full || "");
    return isRidwanAuthor(author) ? `<strong>${label}</strong>` : label;
  }

  function formatAuthors(authorText) {
    const authors = parseAuthorNames(authorText);
    if (!authors.length) return "";

    if (authors.length <= 3) {
      return authors.map(renderAuthorLabel).join(", ");
    }

    const ridwanIndex = authors.findIndex(isRidwanAuthor);
    const visibleCount = ridwanIndex >= 0 ? Math.max(3, ridwanIndex + 1) : 3;
    const visibleAuthors = authors.slice(0, visibleCount);

    if (visibleAuthors.length >= authors.length) {
      return visibleAuthors.map(renderAuthorLabel).join(", ");
    }

    return `${visibleAuthors.map(renderAuthorLabel).join(", ")}, et al.`;
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

  function publicationTypeMeta(fields) {
    const type = fields.entrytype || "";

    if (type === "article") {
      return { label: "Journal", tone: "journal" };
    }

    if (type === "inproceedings" || type === "conference" || type === "proceedings") {
      return { label: "Conference", tone: "conference" };
    }

    if (type === "book" || type === "inbook" || type === "incollection") {
      return { label: "Book", tone: "book" };
    }

    return { label: "Publication", tone: "general" };
  }

  function publicationVenueName(fields) {
    return fields.journal || fields.booktitle || fields.organization || "";
  }

  function publicationLink(fields) {
    if (fields.url) return fields.url;
    if (!fields.doi) return "";

    const doi = fields.doi.trim();
    if (/^https?:\/\//i.test(doi)) return doi;
    if (/^doi\.org\//i.test(doi)) return `https://${doi}`;
    return `https://doi.org/${doi.replace(/^doi:\s*/i, "")}`;
  }

  function publicationThemesFor(fields) {
    const themeMap = data.publicationThemeMap || {};
    const entryKey = String(fields.entrykey || "").trim();
    const themes = Array.isArray(themeMap[entryKey]) ? themeMap[entryKey] : [];
    return themes.filter((theme) => (data.researchThemes || []).includes(theme));
  }

  function compareText(a, b) {
    return String(a || "").localeCompare(String(b || ""), undefined, { sensitivity: "base" });
  }

  function filterPublications(items) {
    return items.filter((item) => {
      const matchesYear = !publicationFilters.year || String(item.year || "") === publicationFilters.year;
      const matchesType = !publicationFilters.type || item.typeLabel === publicationFilters.type;
      const matchesTheme = !publicationFilters.theme || (item.themes || []).includes(publicationFilters.theme);
      const haystack = [item.title, item.venueName, item.publisher, item.summary]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !publicationFilters.search || haystack.includes(publicationFilters.search.toLowerCase());

      return matchesYear && matchesType && matchesTheme && matchesSearch;
    });
  }

  function sortPublications(items) {
    return [...items].sort((a, b) => {
      if (publicationSortKey === "type") {
        return compareText(a.typeLabel, b.typeLabel) || (b.year || 0) - (a.year || 0) || compareText(a.title, b.title);
      }

      if (publicationSortKey === "publisher") {
        return compareText(a.publisher, b.publisher) || (b.year || 0) - (a.year || 0) || compareText(a.title, b.title);
      }

      if (publicationSortKey === "journal") {
        return compareText(a.venueName, b.venueName) || (b.year || 0) - (a.year || 0) || compareText(a.title, b.title);
      }

      if (publicationSortKey === "title") {
        return compareText(a.title, b.title) || (b.year || 0) - (a.year || 0);
      }

      return (b.year || 0) - (a.year || 0) || compareText(a.title, b.title);
    });
  }

  function normalizeBibPublications(entries) {
    return entries
      .map(parseBibFields)
      .filter((fields) => fields.title)
      .map((fields) => ({
        kicker: `${fields.year || "In progress"} - ${sentenceCaseVenue(fields)}`,
        typeLabel: publicationTypeMeta(fields).label,
        typeTone: publicationTypeMeta(fields).tone,
        title: fields.title,
        summary: publicationSummary(fields),
        summaryHtml: publicationSummary(fields),
        publisher: fields.publisher || "",
        venueName: publicationVenueName(fields),
        linkLabel: publicationLink(fields) ? "Open publication" : "",
        linkUrl: publicationLink(fields),
        themes: publicationThemesFor(fields),
        year: Number.parseInt(fields.year || "0", 10) || 0
      }))
      .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title))
      .map((item) => item);
  }

  function renderPublicationResults(count, total) {
    const target = document.querySelector("[data-publication-results]");
    if (!target) return;
    target.textContent = `${count} of ${total} publication${total === 1 ? "" : "s"} shown`;
  }

  function populatePublicationFilterControls() {
    const yearControl = document.querySelector("[data-publication-year-filter]");
    const typeControl = document.querySelector("[data-publication-type-filter]");
    if (!yearControl || !typeControl) return;

    const years = [...new Set((data.publications || []).map((item) => item.year).filter(Boolean))].sort((a, b) => b - a);
    const types = [...new Set((data.publications || []).map((item) => item.typeLabel).filter(Boolean))].sort(compareText);

    yearControl.innerHTML = `<option value="">All years</option>${years.map((year) => `<option value="${escapeHtml(String(year))}">${escapeHtml(String(year))}</option>`).join("")}`;
    typeControl.innerHTML = `<option value="">All types</option>${types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}`;

    yearControl.value = publicationFilters.year;
    typeControl.value = publicationFilters.type;
  }

  function bindPublicationSortControl() {
    const control = document.querySelector("[data-publication-sort]");
    if (!control) return;

    control.value = publicationSortKey;
    control.addEventListener("change", (event) => {
      publicationSortKey = event.target.value || "date";
      renderPublications();
    });
  }

  function bindPublicationFilterControls() {
    const yearControl = document.querySelector("[data-publication-year-filter]");
    const typeControl = document.querySelector("[data-publication-type-filter]");
    const searchControl = document.querySelector("[data-publication-search]");
    const clearButton = document.querySelector("[data-publication-clear]");

    if (yearControl) {
      yearControl.addEventListener("change", (event) => {
        publicationFilters.year = event.target.value || "";
        renderPublications();
      });
    }

    if (typeControl) {
      typeControl.addEventListener("change", (event) => {
        publicationFilters.type = event.target.value || "";
        renderPublications();
      });
    }

    if (searchControl) {
      searchControl.value = publicationFilters.search;
      searchControl.addEventListener("input", (event) => {
        publicationFilters.search = (event.target.value || "").trim();
        renderPublications();
      });
    }

    if (clearButton) {
      clearButton.addEventListener("click", () => {
        publicationFilters = { year: "", type: "", search: "", theme: "" };
        if (yearControl) yearControl.value = "";
        if (typeControl) typeControl.value = "";
        if (searchControl) searchControl.value = "";
        renderThemes();
        renderPublications();
      });
    }

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-research-theme]");
      if (!button) return;

      const selectedTheme = button.getAttribute("data-research-theme") || "";
      publicationFilters.theme = publicationFilters.theme === selectedTheme ? "" : selectedTheme;
      renderThemes();
      renderPublications();
    });
  }

  async function loadBibPublications() {
    try {
      const response = await fetch("/articles.bib", { cache: "no-cache" });
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
      const response = await fetch("/data/site-content.json", { cache: "no-cache" });
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
      const response = await fetch("/data/talks.json", { cache: "no-cache" });
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

  async function loadWritingData() {
    try {
      const response = await fetch("/data/writing.json", { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Unable to load writing data: ${response.status}`);
      }

      const payload = await response.json();
      if (payload && typeof payload === "object") {
        writing = {
          platforms: Array.isArray(payload.platforms) ? payload.platforms : [],
          featured: Array.isArray(payload.featured) ? payload.featured : []
        };
      }
    } catch (error) {
      console.warn("Unable to load writing data.", error);
      writing = { platforms: [], featured: [] };
    }
  }

  async function loadNotesData() {
    try {
      const response = await fetch("/data/notes.json", { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Unable to load notes data: ${response.status}`);
      }

      const payload = await response.json();
      const entries = Array.isArray(payload.articles) ? payload.articles : [];
      const hydrated = await Promise.all(
        entries.map(async (entry) => {
          const articleResponse = await fetch(entry.path, { cache: "no-cache" });
          if (!articleResponse.ok) {
            throw new Error(`Unable to load note markdown: ${entry.path}`);
          }

          const raw = await articleResponse.text();
          const parsed = parseNoteMarkdown(raw);
          const note = {
            slug: entry.slug,
            path: entry.path,
            title: parsed.title || entry.title || "Untitled note",
            date: parsed.date || entry.date || "",
            summary: parsed.summary || entry.summary || "",
            body: parsed.body || "",
            bodyHtml: markdownToHtml(parsed.body || "")
          };

          noteBodies[note.slug] = note;
          return note;
        })
      );

      notes = hydrated.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    } catch (error) {
      console.warn("Unable to load notes data.", error);
      notes = [];
      noteBodies = {};
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

    target.innerHTML = [...talks]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .map(
        (item) => `
          <article class="timeline-item talk-card">
            <p class="card-kicker">${escapeHtml(item.venue || "Talk")}</p>
            <h2><a href="/talk-detail/?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></h2>
            <p class="timeline-meta">${escapeHtml(talkMeta(item))}</p>
            <p>${escapeHtml(item.summary)}</p>
            <div class="tag-row">
              ${(item.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
            <a href="/talk-detail/?slug=${encodeURIComponent(item.slug)}">Explore talk details</a>
          </article>
        `
      )
      .join("");
  }

  function linkTone(label) {
    const value = String(label || "").toLowerCase();
    if (value.includes("slide")) return "resource-slides";
    if (value.includes("code") || value.includes("repo") || value.includes("github")) return "resource-code";
    if (value.includes("paper") || value.includes("article")) return "resource-paper";
    return "resource-general";
  }

  function renderResourceCards(links) {
    return links
      .map(
        (link) => `
          <a class="resource-card ${linkTone(link.label)}" href="${escapeHtml(toSiteUrl(link.url))}" target="_blank" rel="noreferrer">
            <span class="resource-label">${escapeHtml(link.label)}</span>
            <span class="resource-hint">Open resource</span>
          </a>
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
          <a class="button button-primary" href="/talks/">Back to talks</a>
        </section>
      `;
      return;
    }

    const hero = talk.assets && talk.assets.heroImage
      ? `
        <div class="talk-detail-media-card">
          <img class="talk-detail-hero-image" src="${escapeHtml(toSiteUrl(talk.assets.heroImage))}" alt="${escapeHtml(talk.title)}" />
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
          ${talk.assets.gallery.map((image) => `<img src="${escapeHtml(toSiteUrl(image))}" alt="${escapeHtml(talk.title)} gallery image" />`).join("")}
        </div>
      `
      : "";

    const links = talk.links && talk.links.length
      ? `
        <div class="resource-grid">
          ${renderResourceCards(talk.links)}
        </div>
      `
      : "<p>No external resources are listed for this talk.</p>";

    const memories = talk.memories && talk.memories.length
      ? `<ul class="feature-list compact-list">${renderList(talk.memories)}</ul>`
      : "<p>No additional notes are available for this talk.</p>";

    const tags = talk.tags && talk.tags.length
      ? `<div class="tag-row">${talk.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`
      : "<p>No tags are listed for this talk.</p>";

    const snapshot = `
      <div class="talk-snapshot-grid">
        <div class="snapshot-card">
          <span class="stat-label">Venue</span>
          <p class="stat-value">${escapeHtml(talk.venue || "TBD")}</p>
        </div>
        <div class="snapshot-card">
          <span class="stat-label">Location</span>
          <p class="stat-value">${escapeHtml(talk.location || "Virtual / Unlisted")}</p>
        </div>
        <div class="snapshot-card">
          <span class="stat-label">Date</span>
          <p class="stat-value">${escapeHtml(formatTalkDate(talk.date) || "TBD")}</p>
        </div>
      </div>
    `;

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
          ${talk.links && talk.links.length ? `<div class="card-actions">${talk.links.slice(0, 2).map((link) => `<a class="button ${link.label.toLowerCase().includes("slide") ? "button-primary" : "button-secondary"}" href="${escapeHtml(toSiteUrl(link.url))}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("")}</div>` : ""}
        </div>
      </section>
      <section class="talk-detail-grid">
        <article class="panel talk-detail-main">
          <h2>Overview</h2>
          <p>${escapeHtml(talk.summary)}</p>
          ${snapshot}
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
              <a class="button ${action.primary ? "button-primary" : "button-secondary"}" href="${escapeHtml(toSiteUrl(action.url))}">${escapeHtml(action.label)}</a>
            `
          )
          .join("");

        const links = (item.links || [])
          .map((link) => `<li><a href="${escapeHtml(toSiteUrl(link.url))}">${escapeHtml(link.label)}</a></li>`)
          .join("");

        const highlights = (item.highlights || [])
          .map((highlight) => `<li>${escapeHtml(highlight)}</li>`)
          .join("");

        return `
          <article class="content-card tall-card">
            <p class="card-kicker">${escapeHtml(item.kicker)}</p>
            <h2>${escapeHtml(item.title)}</h2>
            <p>${escapeHtml(item.summary)}</p>
            ${highlights ? `<ul class="feature-list compact-list">${highlights}</ul>` : ""}
            ${actions ? `<div class="card-actions">${actions}</div>` : ""}
            ${links ? `<ul class="feature-list compact-list">${links}</ul>` : ""}
          </article>
        `;
      })
      .join("");
  }

  function renderWritingPlatforms() {
    const target = document.querySelector("[data-render='writing-platforms']");
    if (!target || !Array.isArray(writing.platforms)) return;

    target.innerHTML = writing.platforms
      .map(
        (item) => `
          <article class="writing-link-card">
            <p class="card-kicker">${escapeHtml(item.name)}</p>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.summary)}</p>
            <a href="${escapeHtml(toSiteUrl(item.url))}" target="_blank" rel="noreferrer">Visit ${escapeHtml(item.name)}</a>
          </article>
        `
      )
      .join("");
  }

  function renderNotesList() {
    const target = document.querySelector("[data-render='notes-list']");
    if (!target) return;

    if (!notes.length) {
      target.innerHTML = `
        <article class="content-card">
          <h3>No notes yet</h3>
          <p>Local essays will appear here once they are added to the notes content folder.</p>
        </article>
      `;
      return;
    }

    target.innerHTML = notes
      .map(
        (item) => `
          <article class="content-card note-card">
            <p class="card-kicker">${escapeHtml(formatNoteDate(item.date) || "Note")}</p>
            <h3><a href="/note-detail/?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></h3>
            <p>${escapeHtml(item.summary)}</p>
            <a href="/note-detail/?slug=${encodeURIComponent(item.slug)}">Read note</a>
          </article>
        `
      )
      .join("");
  }

  function findNoteBySlug() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");
    if (!slug) return null;
    return noteBodies[slug] || null;
  }

  function renderNoteDetail() {
    const target = document.querySelector("[data-render='note-detail']");
    if (!target) return;

    const note = findNoteBySlug();
    if (!note) {
      target.innerHTML = `
        <section class="panel">
          <h2>Note not found</h2>
          <p>The requested note could not be found.</p>
          <a class="button button-primary" href="/writing/">Back to notes</a>
        </section>
      `;
      return;
    }

    document.title = `${note.title} | Ridwan Amure`;

    target.innerHTML = `
      <section class="page-hero note-hero">
        <p class="eyebrow">Notes</p>
        <h1>${escapeHtml(note.title)}</h1>
        <p class="lead">${escapeHtml(note.summary)}</p>
        <p class="timeline-meta">${escapeHtml(formatNoteDate(note.date))}</p>
      </section>
      <article class="panel note-body">
        ${note.bodyHtml}
      </article>
    `;
  }

  function renderWritingFeatured() {
    const target = document.querySelector("[data-render='writing-featured']");
    if (!target || !Array.isArray(writing.featured)) return;

    target.innerHTML = writing.featured
      .map(
        (item) => `
          <article class="content-card">
            <p class="card-kicker">${escapeHtml(item.platform)}</p>
            <h3><a href="${escapeHtml(toSiteUrl(item.url))}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h3>
            <p>${escapeHtml(item.summary)}</p>
            <a href="${escapeHtml(toSiteUrl(item.url))}" target="_blank" rel="noreferrer">Read piece</a>
          </article>
        `
      )
      .join("");
  }

  function renderHomeFeatured() {
    const target = document.querySelector("[data-render='home-featured']");
    if (!target) return;

    const latestPublications = (data.publications || []).slice(0, 2).map(
      (item) => `
        <article class="content-card">
          <p class="card-kicker">${escapeHtml(item.kicker)}</p>
          <h3>${item.linkUrl ? `<a href="${escapeHtml(toSiteUrl(item.linkUrl))}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}</h3>
          <p>${item.summaryHtml || escapeHtml(item.summary)}</p>
          <a href="/research/">See publications</a>
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
            <h3><a href="/talk-detail/?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></h3>
            <p>${escapeHtml(item.summary)}</p>
            <a href="/talk-detail/?slug=${encodeURIComponent(item.slug)}">View talk</a>
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
        const href = primaryAction ? primaryAction.url : "/tools/";

        return `
          <a class="tool-card" href="${escapeHtml(toSiteUrl(href))}">
            <span class="tool-title">${escapeHtml(item.title)}</span>
            <span class="tool-copy">${escapeHtml(item.summary)}</span>
          </a>
        `;
      })
      .join("");
  }

  function renderHomeWriting() {
    const target = document.querySelector("[data-render='home-writing']");
    if (!target) return;

    if (notes.length) {
      target.innerHTML = notes
        .slice(0, 2)
        .map(
          (item) => `
            <article class="content-card">
              <p class="card-kicker">${escapeHtml(formatNoteDate(item.date) || "Note")}</p>
              <h3><a href="/note-detail/?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></h3>
              <p>${escapeHtml(item.summary)}</p>
              <a href="/writing/">Explore notes</a>
            </article>
          `
        )
        .join("");
      return;
    }

    if (!Array.isArray(writing.featured)) return;

    target.innerHTML = writing.featured
      .slice(0, 2)
      .map(
        (item) => `
          <article class="content-card">
            <p class="card-kicker">${escapeHtml(item.platform)}</p>
            <h3><a href="${escapeHtml(toSiteUrl(item.url))}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h3>
            <p>${escapeHtml(item.summary)}</p>
            <a href="/writing/">Explore writing</a>
          </article>
        `
      )
      .join("");
  }

  function renderProfile() {
    const target = document.querySelector("[data-render='profile-links']");
    if (!target) return;

    const items = [`<li>${escapeHtml(data.profile.location)}</li>`];

    if (data.profile.email) {
      items.push(
        `<li><a href="mailto:${escapeHtml(data.profile.email)}">${escapeHtml(data.profile.email)}</a></li>`
      );
    }

    if (data.profile.linkedin) {
      items.push(
        `<li><a href="${escapeHtml(data.profile.linkedin)}" target="_blank" rel="noreferrer">${escapeHtml(data.profile.linkedin.replace("https://", ""))}</a></li>`
      );
    }

    target.innerHTML = items.join("");
  }

  async function init() {
    await loadSiteContent();
    await loadBibPublications();
    await loadTalksData();
    await loadWritingData();
    await loadNotesData();
    renderProfile();
    renderEducation();
    renderExperience();
    renderSimpleList("skills", "[data-render='skills']");
    renderSimpleList("interests", "[data-render='interests']");
    renderThemes();
    populatePublicationFilterControls();
    renderPublications();
    bindPublicationSortControl();
    bindPublicationFilterControls();
    renderTalks();
    renderTalkDetail();
    renderTools();
    renderWritingPlatforms();
    renderWritingFeatured();
    renderNotesList();
    renderNoteDetail();
    renderHomeFeatured();
    renderHomeTools();
    renderHomeWriting();
  }

  init();
})();
