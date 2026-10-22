const DATA_URL = "./works.json";
const PINNED_WORKS_STORAGE_KEY = "oen-work-hub:pinned-work-ids";

const labels = {
  schemaType: {
    job: "求人",
    generic_work: "取り組み",
  },
  activity: {
    planning: "準備中",
    active: "活動中",
    paused: "休止中",
    completed: "完了",
  },
  publication: {
    draft: "下書き",
    published: "公開中",
    unpublished: "非公開",
  },
};

const byId = (id) => document.getElementById(id);

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function kindLabel(work) {
  return labels.schemaType[work.schema_type] || "WORK";
}

function statusChip(label, value, className = "") {
  const chip = makeElement("span", `status-chip ${className}`.trim(), label);
  chip.title = value;
  return chip;
}

function publicationLabel(status) {
  const labelsByStatus = {
    draft: "0ENで下書き",
    published: "0ENで公開中",
    unpublished: "0ENで非公開",
  };
  return labelsByStatus[status] || `0ENで${status}`;
}

function matchesSearch(work, query) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ja");
  if (!normalizedQuery) return true;

  const revision = work.current_revision;
  const searchableText = [
    revision.title,
    revision.summary,
    revision.actor?.display_name,
    ...(revision.categories || []),
  ].filter(Boolean).join(" ").toLocaleLowerCase("ja");
  return searchableText.includes(normalizedQuery);
}

function loadPinnedWorkIds() {
  try {
    const savedIds = JSON.parse(window.localStorage.getItem(PINNED_WORKS_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(savedIds) ? savedIds.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function savePinnedWorkIds(pinnedWorkIds) {
  try {
    window.localStorage.setItem(PINNED_WORKS_STORAGE_KEY, JSON.stringify([...pinnedWorkIds]));
    return true;
  } catch {
    return false;
  }
}

function togglePinnedWork(pinnedWorkIds, workId) {
  if (pinnedWorkIds.has(workId)) pinnedWorkIds.delete(workId);
  else pinnedWorkIds.add(workId);
  savePinnedWorkIds(pinnedWorkIds);
  return pinnedWorkIds.has(workId);
}

function prioritizePinned(works, pinnedWorkIds) {
  return [...works].sort((a, b) => Number(pinnedWorkIds.has(b.id)) - Number(pinnedWorkIds.has(a.id)));
}

function renderCard(work, pinnedWorkIds, onPinToggle) {
  const revision = work.current_revision;
  const card = makeElement("article", "work-card");
  const header = makeElement("div", "card-label-row");
  header.append(makeElement("span", "kind-chip", kindLabel(work)));

  const isPinned = pinnedWorkIds.has(work.id);
  const pinButton = makeElement("button", "pin-button", "📌");
  pinButton.type = "button";
  pinButton.dataset.pinWorkId = work.id;
  pinButton.setAttribute("aria-label", isPinned ? "ピン留めを解除する" : "ピン留めする");
  pinButton.setAttribute("aria-pressed", String(isPinned));
  pinButton.title = isPinned ? "ピン留めを解除する" : "ピン留めする";
  pinButton.addEventListener("click", () => onPinToggle(work.id));
  header.append(pinButton);

  const stateRow = makeElement("div", "card-state-row");
  stateRow.append(
    statusChip(`活動：${labels.activity[revision.activity_status] || revision.activity_status}`, revision.activity_status),
    statusChip(publicationLabel(work.publication_status), work.publication_status, "status-publication"),
  );

  const link = makeElement("a", "work-card-link");
  link.href = `detail.html?id=${encodeURIComponent(work.id)}`;
  link.setAttribute("aria-label", `${revision.title} の詳細を見る`);
  link.append(
    makeElement("h3", "card-title", revision.title),
    makeElement("p", "card-summary", revision.summary || "紹介文はまだありません。"),
    makeElement("p", "card-actor", `主体：${revision.actor.display_name}`),
    stateRow,
  );

  const categories = makeElement("ul", "category-list");
  (revision.categories || []).forEach((category) => categories.append(makeElement("li", "category-chip", category)));
  if (categories.childElementCount) link.append(categories);
  link.append(makeElement("span", "card-action", "詳細を見る　→"));
  card.append(header, link);
  return card;
}

function renderList(works) {
  const list = byId("work-list");
  const input = byId("work-search");
  const count = byId("result-count");
  const empty = byId("empty-state");
  const pinnedWorkIds = loadPinnedWorkIds();

  const update = (focusWorkId = null) => {
    const filtered = works.filter((work) => matchesSearch(work, input.value));
    const ordered = prioritizePinned(filtered, pinnedWorkIds);
    list.replaceChildren(...ordered.map((work) => renderCard(work, pinnedWorkIds, (workId) => {
      togglePinnedWork(pinnedWorkIds, workId);
      update(workId);
    })));
    count.textContent = `${filtered.length}件`;
    empty.hidden = filtered.length > 0;

    if (focusWorkId) {
      const pinButton = [...list.querySelectorAll("[data-pin-work-id]")].find((button) => button.dataset.pinWorkId === focusWorkId);
      pinButton?.focus();
    }
  };

  input.addEventListener("input", update);
  update();
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function renderDetail(work) {
  const revision = work.current_revision;
  const article = byId("work-detail");
  byId("work-kind").textContent = kindLabel(work);
  byId("work-title").textContent = revision.title;
  byId("work-summary").textContent = revision.summary || "";
  byId("work-actor").textContent = revision.actor.display_name;
  byId("activity-status").textContent = labels.activity[revision.activity_status] || revision.activity_status;
  byId("publication-status").textContent = publicationLabel(work.publication_status);
  byId("work-updated").textContent = formatDate(work.updated_at);

  const categoryContainer = byId("work-categories");
  categoryContainer.replaceChildren();
  (revision.categories || []).forEach((category) => categoryContainer.append(makeElement("span", "category-chip", category)));
  if (!revision.categories?.length) categoryContainer.textContent = "未設定";

  const title = byId("type-content-title");
  const body = byId("type-content-body");
  body.replaceChildren();

  if (work.schema_type === "job") {
    const job = revision.type_data?.job;
    title.textContent = "求人の内容";
    if (job?.employer?.name) {
      const employer = makeElement("div", "detail-block");
      employer.append(makeElement("h3", "detail-label", "募集主"), makeElement("p", "detail-copy", job.employer.name));
      body.append(employer);
    }
    const description = job?.content?.description;
    if (description) {
      const duties = makeElement("div", "detail-block");
      duties.append(makeElement("h3", "detail-label", "仕事内容"), makeElement("p", "detail-copy", description));
      body.append(duties);
    }
  } else if (work.schema_type === "generic_work") {
    title.textContent = "取り組みの内容";
    const description = revision.type_data?.generic_work?.description;
    body.append(makeElement("p", "detail-copy", description || "詳しい説明はまだありません。"));
  } else {
    title.textContent = "WORKの詳細";
    body.append(makeElement("p", "detail-copy", "詳細情報はまだ登録されていません。"));
  }

  article.hidden = false;
}

async function loadWorks() {
  const response = await fetch(DATA_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`WORK data request failed: ${response.status}`);
  const works = await response.json();
  if (!Array.isArray(works)) throw new Error("WORK data must be an array");
  return works;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const works = await loadWorks();
    if (document.body.dataset.page === "list") {
      renderList(works.filter((work) => work.publication_status === "published"));
      return;
    }

    const workId = new URLSearchParams(location.search).get("id");
    const work = works.find((item) => item.id === workId && item.publication_status === "published");
    if (work) renderDetail(work);
    else byId("not-found").hidden = false;
  } catch (error) {
    console.error(error);
    const errorElement = document.body.dataset.page === "list" ? byId("load-error") : byId("detail-load-error");
    errorElement.hidden = false;
  }
});
