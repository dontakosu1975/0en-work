const DATA_URL = "./works.json";

const labels = {
  schemaType: {
    job: "求人",
    generic_work: "WORK（暫定）",
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

function allStrings(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => allStrings(item, output));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => allStrings(item, output));
  return output;
}

function kindLabel(work) {
  return labels.schemaType[work.schema_type] || "WORK";
}

function statusChip(label, value, className = "") {
  const chip = makeElement("span", `status-chip ${className}`.trim(), label);
  chip.title = value;
  return chip;
}

function renderCard(work) {
  const revision = work.current_revision;
  const link = makeElement("a", "work-card-link");
  link.href = `detail.html?id=${encodeURIComponent(work.id)}`;
  link.setAttribute("aria-label", `${revision.title} の詳細を見る`);

  const card = makeElement("article", "work-card");
  const header = makeElement("div", "card-label-row");
  header.append(makeElement("span", "kind-chip", kindLabel(work)));

  const stateRow = makeElement("div", "card-state-row");
  stateRow.append(
    statusChip(`活動：${labels.activity[revision.activity_status] || revision.activity_status}`, revision.activity_status),
    statusChip(`公開：${labels.publication[work.publication_status] || work.publication_status}`, work.publication_status, "status-publication"),
  );

  card.append(
    header,
    makeElement("h3", "card-title", revision.title),
    makeElement("p", "card-summary", revision.summary || "紹介文はまだありません。"),
    makeElement("p", "card-actor", `主体：${revision.actor.display_name}`),
    stateRow,
  );

  const categories = makeElement("ul", "category-list");
  (revision.categories || []).forEach((category) => categories.append(makeElement("li", "category-chip", category)));
  if (categories.childElementCount) card.append(categories);
  card.append(makeElement("span", "card-action", "詳細を見る　→"));
  link.append(card);
  return link;
}

function renderList(works) {
  const list = byId("work-list");
  const input = byId("work-search");
  const count = byId("result-count");
  const empty = byId("empty-state");

  const update = () => {
    const query = input.value.trim().toLocaleLowerCase("ja");
    const filtered = works.filter((work) => allStrings(work.current_revision).join(" ").toLocaleLowerCase("ja").includes(query));
    list.replaceChildren(...filtered.map(renderCard));
    count.textContent = `${filtered.length}件`;
    empty.hidden = filtered.length > 0;
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
  byId("publication-status").textContent = labels.publication[work.publication_status] || work.publication_status;
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
    body.append(makeElement("p", "schema-gap-note", "活動状態はWORK自体の状態を示します。募集状況は別概念のため、この例では未設定です。職種コード・雇用形態・給与・勤務地なども推測で補完していません。"));
  } else if (work.schema_type === "generic_work") {
    title.textContent = "取り組みの内容";
    const description = revision.type_data?.generic_work?.description;
    body.append(makeElement("p", "detail-copy", description || "詳しい説明はまだありません。"));
    body.append(makeElement("p", "schema-hint", "「WORK（暫定）」はPhase 1の確認用です。恒久的な「その他」分類を示すものではありません。"));
  } else {
    title.textContent = "詳細";
    body.append(makeElement("p", "schema-gap-note", "このWORK種別の表示方法はまだ定義されていません。"));
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
