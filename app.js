"use strict";

const byId = (id) => document.getElementById(id);
const screens = [byId("home"), byId("quiz"), byId("result")];
const startButton = byId("start");
const startLabel = byId("start-label");
const heroArt = byId("hero-art");
const questionContent = byId("question-content");
const questionTitle = byId("question-title");
const optionsContainer = byId("options");
const previousButton = byId("previous");
const nextButton = byId("next");
const downloadButton = byId("download");
const downloadStatus = byId("download-status");
const modePicker = byId("quiz-modes");
const makeSession = (questions, label) => ({ questions, label, answers: new Array(questions.length).fill(null), cursor: 0 });
const sessions = {
  quick: makeSession(QUESTIONS.filter((_, index) => index % 4 === 0), "10 题速测"),
  full: makeSession(QUESTIONS, "40 题完整版"),
};
let session = sessions[modePicker?.querySelector("input:checked")?.value ?? "full"];
let currentProfile = null;

heroArt.src = INK_LANDSCAPE;
byId("poster").style.setProperty("--landscape", `url("${INK_LANDSCAPE}")`);

function showScreen(id, focusTarget) {
  for (const screen of screens) screen.hidden = screen.id !== id;
  window.scrollTo(0, 0);
  focusTarget.focus({ preventScroll: true });
}

function updateProgress() {
  const { answers, cursor, questions } = session;
  const questionCount = questions.length;
  const completed = answers.filter((answer) => answer !== null).length;
  byId("answered-count").textContent = `已答 ${completed} / ${questionCount} 题`;
  byId("progress").setAttribute("aria-valuemax", String(questionCount));
  byId("progress").setAttribute("aria-valuenow", String(completed));
  byId("progress-fill").style.width = `${(completed / questionCount) * 100}%`;
  nextButton.disabled = answers[cursor] === null;
}

function renderQuestion({ focus = true } = {}) {
  const { answers, cursor, questions } = session;
  const questionCount = questions.length;
  const question = questions[cursor];
  byId("question-meta").textContent = `第 ${cursor + 1} / ${questionCount} 题 · ${question.category}`;
  questionTitle.textContent = question.prompt;

  const options = question.options.map((option, index) => {
    const label = document.createElement("label");
    label.className = "option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "answer";
    input.value = String(index);
    input.checked = answers[cursor] === index;

    const face = document.createElement("span");
    face.className = "option-face";

    const letter = document.createElement("span");
    letter.className = "option-letter";
    letter.setAttribute("aria-hidden", "true");
    letter.textContent = "ABCD"[index];

    const copy = document.createElement("span");
    copy.textContent = option.text;
    face.append(letter, copy);
    label.append(input, face);
    return label;
  });

  optionsContainer.replaceChildren(...options);
  previousButton.disabled = cursor === 0;
  nextButton.textContent = cursor === questionCount - 1 ? "查看结果" : "下一题";
  updateProgress();

  if (focus) {
    window.scrollTo(0, 0);
    questionTitle.focus({ preventScroll: true });
    if (typeof questionContent.animate === "function" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      questionContent.getAnimations().forEach((animation) => animation.cancel());
      questionContent.animate(
        [{ opacity: 0.2, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 210, easing: "ease-out" },
      );
    }
  }
}

function resetQuiz() {
  session.answers.fill(null);
  session.cursor = 0;
  currentProfile = null;
  startLabel.textContent = "开始测试";
}

function enterQuiz() {
  renderQuestion({ focus: false });
  showScreen("quiz", questionTitle);
}

function renderResult({ profile, tendencies }) {
  currentProfile = profile;
  if (byId("result-mode")) byId("result-mode").textContent = session.label;
  byId("poster").style.setProperty("--profile-ink", profile.color);
  byId("result-seal").textContent = profile.seal;
  byId("result-era").textContent = `${profile.era} · ${profile.role}`;
  byId("result-name").textContent = profile.name;
  byId("result-traits").textContent = profile.trait;
  byId("result-quote").textContent = profile.quote;
  byId("result-reason").textContent = profile.reason;
  byId("result-strength").textContent = profile.strength;
  byId("result-easter").textContent = profile.easter;
  downloadStatus.textContent = "";

  const firstCount = tendencies[0][1];
  byId("tendencies").replaceChildren(...tendencies.map(([dimension, count]) => {
    const tendency = DIMENSIONS[dimension];
    const item = document.createElement("li");
    item.className = "tendency";

    const label = document.createElement("strong");
    label.textContent = tendency.label;

    const bar = document.createElement("progress");
    bar.className = "tendency-bar";
    bar.max = firstCount;
    bar.value = count;
    bar.setAttribute("aria-hidden", "true");

    const frequency = document.createElement("span");
    frequency.className = "tendency-count";
    frequency.textContent = `${count} 次`;

    const description = document.createElement("p");
    description.textContent = tendency.description;
    item.append(label, bar, frequency, description);
    return item;
  }));

  showScreen("result", byId("result-heading"));
}

function drawWrappedText(context, copy, x, y, maxWidth, lineHeight) {
  let line = "";
  for (const character of copy) {
    if (line && context.measureText(line + character).width > maxWidth && !"，。！？、：；」〉》）”.?!".includes(character)) {
      context.fillText(line, x, y);
      line = "";
      y += lineHeight;
    }
    line += character;
  }
  if (line) context.fillText(line, x, y);
}

function createShareCanvas(profile) {
  const canvas = document.createElement("canvas");
  const width = 1080;
  const height = 1440;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const style = getComputedStyle(document.documentElement);
  const serif = style.getPropertyValue("--serif");
  const sans = style.getPropertyValue("--sans");
  const paper = "#f4e9d4";

  context.fillStyle = paper;
  context.fillRect(0, 0, width, height);

  const imageTop = 608;
  const imageHeight = height - imageTop;
  const scale = Math.max(width / heroArt.naturalWidth, imageHeight / heroArt.naturalHeight);
  const cropWidth = width / scale;
  const cropHeight = imageHeight / scale;
  context.drawImage(heroArt, (heroArt.naturalWidth - cropWidth) * .64, (heroArt.naturalHeight - cropHeight) * .73, cropWidth, cropHeight, 0, imageTop, width, imageHeight);

  const fade = context.createLinearGradient(0, imageTop, 0, height);
  fade.addColorStop(0, paper);
  fade.addColorStop(.47, "#f4e9d400");
  fade.addColorStop(.74, "#24191000");
  fade.addColorStop(1, "#241910dc");
  context.fillStyle = fade;
  context.fillRect(0, imageTop, width, imageHeight);

  context.strokeStyle = "#927355";
  context.lineWidth = 2;
  context.strokeRect(25, 25, width - 50, height - 50);
  context.strokeStyle = "#b58d68";
  context.lineWidth = 1;
  context.strokeRect(34, 34, width - 68, height - 68);

  context.fillStyle = "#64594d";
  context.font = `700 35px ${serif}`;
  context.fillText("古人灵魂鉴", 84, 139);

  context.save();
  context.translate(917, 140);
  context.rotate(.087);
  context.fillStyle = "#8d3328";
  context.fillRect(-57, -57, 114, 114);
  context.strokeStyle = "#f4dfbd";
  context.lineWidth = 2;
  context.strokeRect(-50, -50, 100, 100);
  context.font = `700 57px ${serif}`;
  context.fillStyle = "#fff7e7";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(profile.seal, 0, 3);
  context.restore();

  context.fillStyle = profile.color;
  context.font = `700 38px ${sans}`;
  context.fillText(`${profile.era} · ${profile.role}`, 84, 250);
  context.font = `700 158px ${serif}`;
  context.fillText(profile.name, 77, 425);

  context.fillStyle = "#292822";
  context.font = `500 39px ${sans}`;
  context.fillText(profile.trait, 84, 510);
  context.fillStyle = profile.color;
  context.fillRect(84, 568, 4, 111);
  context.font = `700 47px ${serif}`;
  drawWrappedText(context, profile.quote, 109, 602, 820, 66);

  context.fillStyle = "#fff8e8";
  context.font = `500 32px ${sans}`;
  context.fillText("测测你的灵魂对应哪位中国历史人物", 84, 1348);
  return canvas;
}

async function downloadShareImage() {
  const profile = currentProfile;
  const source = session;
  if (!profile) return;
  downloadButton.disabled = true;
  downloadStatus.textContent = "正在生成分享图…";

  try {
    await heroArt.decode();
    const canvas = createShareCanvas(profile);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("无法生成分享图。");
    if (profile !== currentProfile || source !== session) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `古人灵魂鉴-${profile.name}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    downloadStatus.textContent = "分享图已生成，请查看浏览器下载。";
  } catch {
    if (profile === currentProfile && source === session) downloadStatus.textContent = "暂时无法保存图片，可以直接截取上方人物卡。";
  } finally {
    downloadButton.disabled = false;
  }
}

function updateStartLabel() {
  startLabel.textContent = session.answers.some((answer) => answer !== null) ? "继续测试" : "开始测试";
}

function returnToHome() {
  updateStartLabel();
  showScreen("home", byId("home-title"));
}

modePicker?.addEventListener("change", (event) => {
  if (event.target.name !== "version") return;
  session = sessions[event.target.value];
  currentProfile = null;
  updateStartLabel();
});
startButton.addEventListener("click", enterQuiz);
byId("back-home").addEventListener("click", returnToHome);
byId("choose-version")?.addEventListener("click", returnToHome);

optionsContainer.addEventListener("change", (event) => {
  if (event.target.name !== "answer" || !event.target.checked) return;
  session.answers[session.cursor] = Number(event.target.value);
  updateProgress();
});

previousButton.addEventListener("click", () => {
  if (session.cursor === 0) return;
  session.cursor -= 1;
  renderQuestion();
});

byId("answer-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (session.answers[session.cursor] === null) return;

  if (session.cursor === session.questions.length - 1) {
    renderResult(scoreAnswers(session.answers, session.questions));
  } else {
    session.cursor += 1;
    renderQuestion();
  }
});

byId("restart").addEventListener("click", () => {
  resetQuiz();
  enterQuiz();
});

byId("show-help").addEventListener("click", () => byId("help").showModal());
downloadButton.addEventListener("click", downloadShareImage);
