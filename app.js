const WORD_BANK = [
  "system",
  "design",
  "service",
  "reliable",
  "data",
  "event",
  "queue",
  "scale",
  "request",
  "database",
  "cache",
  "stream",
  "order",
  "payment",
  "inventory",
  "failure",
  "latency",
  "throughput",
  "consistency",
  "deploy",
  "monitor",
  "trace",
  "recover",
  "client",
  "server",
  "message",
  "transaction",
  "storage",
  "network",
  "process",
  "maintain",
  "improve",
  "learn",
  "practice",
  "focus",
  "steady",
  "accurate",
  "simple",
  "build",
  "review",
];

const QUOTES = [
  "Make it work, make it right, make it fast.",
  "The best systems are designed for change, not only for the happy path.",
  "Simplicity is not the absence of complexity; it is complexity arranged with care.",
];

const DEFAULT_CUSTOM =
  "Reliable systems expect failures. A clear design makes recovery visible, operations predictable, and change safer for every team.";

function makeWords(count, punctuation, numbers) {
  const output = new Array(count);

  for (let index = 0; index < count; index += 1) {
    let word = WORD_BANK[(index * 7 + 3) % WORD_BANK.length];

    if (numbers && index > 0 && index % 11 === 0) {
      word = String(10 + ((index * 17) % 90));
    }

    if (punctuation) {
      if (index % 12 === 0) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }

      if (index % 12 === 11 || index === count - 1) word += ".";
      else if (index % 7 === 6) word += ",";
    }

    output[index] = word;
  }

  return output.join(" ");
}

function splitCustom(text, delimiter) {
  return delimiter === "pipe"
    ? text
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean)
    : text.trim().split(/\s+/).filter(Boolean);
}

function shuffle(items) {
  const output = [...items];

  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }

  return output;
}

function buildCustomText(source, config) {
  const cleanSource = source.trim() || DEFAULT_CUSTOM;
  const parts = splitCustom(cleanSource, config.delimiter);
  let generated = parts;

  if (config.mode === "shuffle") generated = shuffle(parts);

  if (config.mode === "random") {
    const targetLength =
      config.limitType === "words"
        ? config.limitValue
        : Math.max(parts.length * 6, 120);

    generated = Array.from(
      { length: targetLength },
      () =>
        parts[Math.floor(Math.random() * Math.max(parts.length, 1))] || "type",
    );
  }

  if (config.mode === "repeat" || config.limitType === "time") {
    const repeats = config.limitType === "time" ? 50 : 6;
    generated = Array.from({ length: repeats }, () => generated).flat();
  }

  if (config.limitType === "words") {
    generated = generated.slice(0, Math.max(1, config.limitValue));
  }

  return generated.join(" ");
}

function calculateConsistency(samples) {
  if (samples.length < 2) return 100;

  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  if (!mean) return 100;

  const variance =
    samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    samples.length;

  return Math.max(0, Math.round(100 - (Math.sqrt(variance) / mean) * 100));
}

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const DOM_WINDOW_SIZE = 560;
const DOM_SHIFT_THRESHOLD = 300;

class KeyflowApp {
  constructor() {
    this.elements = {
      home: $("#home-button"),
      theme: $("#theme-toggle"),
      punctuation: $("#punctuation-toggle"),
      numbers: $("#numbers-toggle"),
      modeButtons: $$("[data-mode]"),
      subOptions: $("#sub-options"),
      testView: $("#test-view"),
      resultView: $("#result-view"),
      primaryStat: $("#primary-stat"),
      liveWpm: $("#live-wpm"),
      liveAccuracy: $("#live-accuracy"),
      stage: $("#typing-stage"),
      stream: $("#text-stream"),
      input: $("#typing-input"),
      focusPrompt: $("#focus-prompt"),
      progress: $("#progress-bar"),
      restart: $("#restart-button"),
      repeat: $("#repeat-button"),
      next: $("#next-button"),
      resultWpm: $("#result-wpm"),
      resultAccuracy: $("#result-accuracy"),
      resultRaw: $("#result-raw"),
      resultCharacters: $("#result-characters"),
      resultConsistency: $("#result-consistency"),
      resultTime: $("#result-time"),
      overlay: $("#custom-overlay"),
      dialogClose: $("#dialog-close"),
      customText: $("#custom-text"),
      customCount: $("#custom-count"),
      fileInput: $("#file-input"),
      limitValue: $("#limit-value"),
      applyCustom: $("#apply-custom"),
      resetCustom: $("#reset-custom"),
      cleanZero: $("#clean-zero"),
      cleanTypography: $("#clean-typography"),
      cleanControl: $("#clean-control"),
      cleanLines: $("#clean-lines"),
      customGroups: $$("[data-custom-group]"),
    };

    this.state = {
      mode: "time",
      timeLimit: 30,
      wordLimit: 25,
      quoteIndex: 1,
      punctuation: false,
      numbers: false,
      target: "",
      typed: "",
      correctChars: 0,
      startedAt: null,
      finishedAt: null,
      samples: [],
      visibleStart: 0,
      visibleEnd: 0,
      customText: DEFAULT_CUSTOM,
      customConfig: {
        mode: "simple",
        limitType: "none",
        limitValue: 50,
        delimiter: "space",
      },
    };

    this.charNodes = new Map();
    this.animationFrame = 0;
    this.lastUiUpdate = 0;
    this.lastSampleAt = 0;
    this.tabArmed = false;
  }

  init() {
    this.restorePreferences();
    this.bindEvents();
    this.syncCustomControls();
    this.activateMode("time", false);
  }

  restorePreferences() {
    const savedText = localStorage.getItem("keyflow-custom-text");
    const savedTheme = localStorage.getItem("keyflow-theme");
    const savedConfig = localStorage.getItem("keyflow-custom-config");

    if (savedText) this.state.customText = savedText;

    if (savedTheme === "light") {
      document.documentElement.dataset.theme = "light";
      this.elements.theme.textContent = "☾";
      this.elements.theme.setAttribute("aria-label", "Use dark theme");
    }

    if (savedConfig) {
      try {
        this.state.customConfig = {
          ...this.state.customConfig,
          ...JSON.parse(savedConfig),
        };
      } catch {
        localStorage.removeItem("keyflow-custom-config");
      }
    }
  }

  bindEvents() {
    this.elements.home.addEventListener("click", () =>
      this.activateMode("time"),
    );
    this.elements.theme.addEventListener("click", () => this.toggleTheme());
    this.elements.punctuation.addEventListener("click", () =>
      this.toggleWordModifier("punctuation"),
    );
    this.elements.numbers.addEventListener("click", () =>
      this.toggleWordModifier("numbers"),
    );

    for (const button of this.elements.modeButtons) {
      button.addEventListener("click", () =>
        this.activateMode(button.dataset.mode),
      );
    }

    this.elements.subOptions.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      this.handleSubOption(button);
    });

    this.elements.stage.addEventListener("click", () =>
      this.elements.input.focus(),
    );
    this.elements.input.addEventListener("focus", () =>
      this.setFocusState(true),
    );
    this.elements.input.addEventListener("blur", () =>
      this.setFocusState(false),
    );
    this.elements.input.addEventListener("input", (event) =>
      this.handleInput(event),
    );
    this.elements.input.addEventListener("keydown", (event) =>
      this.handleTypingKeydown(event),
    );

    this.elements.restart.addEventListener("click", () =>
      this.resetTest(this.state.target),
    );
    this.elements.repeat.addEventListener("click", () =>
      this.resetTest(this.state.target),
    );
    this.elements.next.addEventListener("click", () =>
      this.resetTest(this.createTarget()),
    );

    this.elements.dialogClose.addEventListener("click", () =>
      this.closeCustomDialog(),
    );
    this.elements.overlay.addEventListener("mousedown", (event) => {
      if (event.target === this.elements.overlay) this.closeCustomDialog();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !this.elements.overlay.hidden) {
        this.closeCustomDialog();
      }
    });

    this.elements.customText.addEventListener("input", () =>
      this.updateCustomCount(),
    );
    this.elements.fileInput.addEventListener("change", (event) =>
      this.importTextFile(event),
    );
    this.elements.limitValue.addEventListener("change", () => {
      this.state.customConfig.limitValue = Math.max(
        1,
        Number(this.elements.limitValue.value) || 1,
      );
      this.elements.limitValue.value = String(
        this.state.customConfig.limitValue,
      );
    });

    for (const group of this.elements.customGroups) {
      group.addEventListener("click", (event) =>
        this.handleCustomGroup(event, group),
      );
    }

    this.elements.applyCustom.addEventListener("click", () =>
      this.applyCustomText(),
    );
    this.elements.resetCustom.addEventListener("click", () => {
      this.elements.customText.value = DEFAULT_CUSTOM;
      this.updateCustomCount();
    });
    this.elements.cleanZero.addEventListener("click", () =>
      this.cleanCustomText("zero"),
    );
    this.elements.cleanTypography.addEventListener("click", () =>
      this.cleanCustomText("typography"),
    );
    this.elements.cleanControl.addEventListener("click", () =>
      this.cleanCustomText("control"),
    );
    this.elements.cleanLines.addEventListener("click", () =>
      this.cleanCustomText("lines"),
    );
  }

  activateMode(mode, focus = true) {
    this.state.mode = mode;

    for (const button of this.elements.modeButtons) {
      const active = button.dataset.mode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }

    const modifiersEnabled =
      mode === "time" || mode === "words" || mode === "zen";
    this.elements.punctuation.disabled = !modifiersEnabled;
    this.elements.numbers.disabled = !modifiersEnabled;

    this.renderSubOptions();
    this.resetTest(this.createTarget(), focus);
  }

  createTarget() {
    const {
      mode,
      wordLimit,
      punctuation,
      numbers,
      quoteIndex,
      customText,
      customConfig,
    } = this.state;

    if (mode === "quote") return QUOTES[quoteIndex];
    if (mode === "custom") return buildCustomText(customText, customConfig);
    if (mode === "words") return makeWords(wordLimit, punctuation, numbers);
    return makeWords(600, punctuation, numbers);
  }

  renderSubOptions() {
    const { mode, timeLimit, wordLimit, quoteIndex } = this.state;
    let markup = "";

    if (mode === "time") {
      markup = [15, 30, 60, 120]
        .map(
          (value) =>
            `<button type="button" data-option="time" data-value="${value}" class="${timeLimit === value ? "active" : ""}">${value}</button>`,
        )
        .join("");
    } else if (mode === "words") {
      markup = [10, 25, 50, 100]
        .map(
          (value) =>
            `<button type="button" data-option="words" data-value="${value}" class="${wordLimit === value ? "active" : ""}">${value}</button>`,
        )
        .join("");
    } else if (mode === "quote") {
      markup = ["short", "medium", "long"]
        .map(
          (label, index) =>
            `<button type="button" data-option="quote" data-value="${index}" class="${quoteIndex === index ? "active" : ""}">${label}</button>`,
        )
        .join("");
    } else if (mode === "custom") {
      markup =
        '<button type="button" data-option="custom" class="change-button">✎ change</button>';
    } else {
      markup = '<span class="zen-label">no timer · just type</span>';
    }

    this.elements.subOptions.innerHTML = markup;
  }

  handleSubOption(button) {
    const type = button.dataset.option;
    const value = Number(button.dataset.value);

    if (type === "time") this.state.timeLimit = value;
    if (type === "words") this.state.wordLimit = value;
    if (type === "quote") this.state.quoteIndex = value;

    if (type === "custom") {
      this.openCustomDialog();
      return;
    }

    this.renderSubOptions();
    this.resetTest(this.createTarget());
  }

  toggleWordModifier(key) {
    if (this.elements[key].disabled) return;

    this.state[key] = !this.state[key];
    const element = this.elements[key];
    element.classList.toggle("active", this.state[key]);
    element.setAttribute("aria-pressed", String(this.state[key]));
    this.resetTest(this.createTarget());
  }

  resetTest(target, focus = true) {
    cancelAnimationFrame(this.animationFrame);

    this.state.target = target;
    this.state.typed = "";
    this.state.correctChars = 0;
    this.state.startedAt = null;
    this.state.finishedAt = null;
    this.state.samples = [];
    this.state.visibleStart = 0;
    this.lastUiUpdate = 0;
    this.lastSampleAt = 0;
    this.tabArmed = false;

    this.elements.input.value = "";
    this.elements.testView.hidden = false;
    this.elements.resultView.hidden = true;
    this.elements.liveWpm.hidden = true;
    this.elements.liveAccuracy.hidden = true;
    this.elements.progress.style.width = "0%";

    this.renderTextWindow(0);
    this.updateLiveStats(performance.now());

    if (focus) requestAnimationFrame(() => this.elements.input.focus());
  }

  handleInput(event) {
    if (this.state.finishedAt !== null) return;

    const oldValue = this.state.typed;
    const newValue = event.target.value
      .replace(/\n/g, " ")
      .slice(0, this.state.target.length);

    if (newValue !== event.target.value) event.target.value = newValue;

    if (this.state.startedAt === null && newValue.length > 0) {
      const now = performance.now();
      this.state.startedAt = now;
      this.lastSampleAt = now;
      this.animationFrame = requestAnimationFrame((time) => this.frame(time));
      this.elements.liveWpm.hidden = false;
      this.elements.liveAccuracy.hidden = false;
    }

    this.updateCorrectCount(oldValue, newValue);
    this.state.typed = newValue;

    if (!this.ensureVisibleWindow(newValue.length)) {
      this.updateChangedCharacters(oldValue, newValue);
    }

    this.elements.progress.style.width = `${Math.min(100, (newValue.length / Math.max(1, this.state.target.length)) * 100)}%`;
    this.updateLiveStats(performance.now());

    const timedCustom =
      this.state.mode === "custom" &&
      this.state.customConfig.limitType === "time";
    if (
      newValue.length >= this.state.target.length &&
      this.state.mode !== "time" &&
      !timedCustom
    ) {
      this.finishTest(performance.now());
    }

    const current = document.querySelectorAll(".current")?.[0];

    current?.scrollIntoView({ behavior: "smooth" });
  }

  updateCorrectCount(oldValue, newValue) {
    const target = this.state.target;

    if (newValue.startsWith(oldValue)) {
      for (let index = oldValue.length; index < newValue.length; index += 1) {
        if (newValue[index] === target[index]) this.state.correctChars += 1;
      }
      return;
    }

    if (oldValue.startsWith(newValue)) {
      for (let index = newValue.length; index < oldValue.length; index += 1) {
        if (oldValue[index] === target[index]) this.state.correctChars -= 1;
      }
      return;
    }

    let correct = 0;
    for (let index = 0; index < newValue.length; index += 1) {
      if (newValue[index] === target[index]) correct += 1;
    }
    this.state.correctChars = correct;
  }

  handleTypingKeydown(event) {
    if (event.key === "Tab") {
      event.preventDefault();
      this.tabArmed = true;
      return;
    }

    if (event.key === "Enter" && this.tabArmed) {
      event.preventDefault();
      this.tabArmed = false;
      this.resetTest(this.state.target);
      return;
    }

    this.tabArmed = false;
  }

  frame(now) {
    if (this.state.startedAt === null || this.state.finishedAt !== null) return;

    if (now - this.lastUiUpdate >= 100) {
      this.updateLiveStats(now);
      this.lastUiUpdate = now;
    }

    if (now - this.lastSampleAt >= 1000) {
      this.state.samples.push(this.getMetrics(now).rawWpm);
      if (this.state.samples.length > 30) this.state.samples.shift();
      this.lastSampleAt = now;
    }

    const timeLimit = this.getActiveTimeLimit();
    if (
      timeLimit !== null &&
      this.getMetrics(now).elapsedSeconds >= timeLimit
    ) {
      this.finishTest(now);
      return;
    }

    this.animationFrame = requestAnimationFrame((time) => this.frame(time));
  }

  getActiveTimeLimit() {
    if (this.state.mode === "time") return this.state.timeLimit;
    if (
      this.state.mode === "custom" &&
      this.state.customConfig.limitType === "time"
    ) {
      return this.state.customConfig.limitValue;
    }
    return null;
  }

  getMetrics(now = performance.now()) {
    const end = this.state.finishedAt ?? now;
    const elapsedSeconds =
      this.state.startedAt === null
        ? 0
        : Math.max(0, (end - this.state.startedAt) / 1000);
    const minutes = Math.max(elapsedSeconds / 60, 1 / 60);
    const typedLength = this.state.typed.length;

    return {
      elapsedSeconds,
      wpm: Math.round(this.state.correctChars / 5 / minutes),
      rawWpm: Math.round(typedLength / 5 / minutes),
      accuracy: typedLength
        ? Math.round((this.state.correctChars / typedLength) * 100)
        : 100,
      incorrectChars: Math.max(0, typedLength - this.state.correctChars),
      missedChars: Math.max(0, this.state.target.length - typedLength),
      consistency: calculateConsistency(this.state.samples),
    };
  }

  updateLiveStats(now) {
    const metrics = this.getMetrics(now);
    const timeLimit = this.getActiveTimeLimit();

    this.elements.primaryStat.textContent =
      timeLimit === null
        ? String(this.state.typed.length)
        : String(Math.max(0, Math.ceil(timeLimit - metrics.elapsedSeconds)));
    this.elements.liveWpm.textContent = `${metrics.wpm} wpm`;
    this.elements.liveAccuracy.textContent = `${metrics.accuracy}% acc`;
  }

  finishTest(now) {
    if (this.state.finishedAt !== null) return;

    this.state.finishedAt = now;
    cancelAnimationFrame(this.animationFrame);
    this.elements.input.blur();

    const metrics = this.getMetrics(now);
    this.elements.resultWpm.textContent = String(metrics.wpm);
    this.elements.resultAccuracy.textContent = `${metrics.accuracy}%`;
    this.elements.resultRaw.textContent = String(metrics.rawWpm);
    this.elements.resultCharacters.textContent = `${this.state.correctChars}/${metrics.incorrectChars}/${metrics.missedChars}`;
    this.elements.resultConsistency.textContent = `${metrics.consistency}%`;
    this.elements.resultTime.textContent = `${metrics.elapsedSeconds.toFixed(1)}s`;

    this.elements.testView.hidden = true;
    this.elements.resultView.hidden = false;
  }

  getCharacterClass(index) {
    if (index < this.state.typed.length) {
      return this.state.typed[index] === this.state.target[index]
        ? "char correct"
        : "char incorrect";
    }

    return index === this.state.typed.length ? "char current" : "char pending";
  }

  computeWindowStart(position) {
    if (position <= 120) return 0;

    const approximateStart = Math.max(0, position - 90);
    const wordBoundary = this.state.target.lastIndexOf(" ", approximateStart);
    return wordBoundary < 0 ? approximateStart : wordBoundary + 1;
  }

  renderTextWindow(start) {
    const fragment = document.createDocumentFragment();
    const end = Math.min(this.state.target.length, start + DOM_WINDOW_SIZE);
    this.charNodes.clear();

    for (let index = start; index < end; index += 1) {
      const span = document.createElement("span");
      span.className = this.getCharacterClass(index);
      span.textContent = this.state.target[index];
      fragment.append(span);
      this.charNodes.set(index, span);
    }

    this.elements.stream.replaceChildren(fragment);
    this.state.visibleStart = 0;
    this.state.visibleEnd = end;
  }

  ensureVisibleWindow(position) {
    const outsideWindow = false;
    // position < this.state.visibleStart ||
    // position >= this.state.visibleStart + DOM_SHIFT_THRESHOLD ||
    // position >= this.state.visibleEnd;

    if (!outsideWindow) return false;
    this.renderTextWindow(this.computeWindowStart(position));
    return true;
  }

  updateChangedCharacters(oldValue, newValue) {
    const sharedLength = Math.min(oldValue.length, newValue.length);
    let firstChanged = 0;

    while (
      firstChanged < sharedLength &&
      oldValue[firstChanged] === newValue[firstChanged]
    ) {
      firstChanged += 1;
    }

    const from = Math.max(this.state.visibleStart, firstChanged);
    const to = Math.min(
      this.state.visibleEnd,
      Math.max(oldValue.length, newValue.length) + 1,
    );

    for (let index = from; index < to; index += 1) {
      const node = this.charNodes.get(index);
      if (node) node.className = this.getCharacterClass(index);
    }
  }

  setFocusState(focused) {
    this.elements.stage.classList.toggle("focused", focused);
    this.elements.focusPrompt.hidden = focused || this.state.typed.length > 0;
  }

  toggleTheme() {
    const nextTheme =
      document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("keyflow-theme", nextTheme);
    this.elements.theme.textContent = nextTheme === "dark" ? "☀" : "☾";
    this.elements.theme.setAttribute(
      "aria-label",
      nextTheme === "dark" ? "Use light theme" : "Use dark theme",
    );
  }

  openCustomDialog() {
    this.elements.customText.value = this.state.customText;
    this.updateCustomCount();
    this.syncCustomControls();
    this.elements.overlay.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => this.elements.customText.focus());
  }

  closeCustomDialog() {
    this.elements.overlay.hidden = true;
    document.body.classList.remove("modal-open");
  }

  updateCustomCount() {
    const text = this.elements.customText.value;
    const words = splitCustom(text, this.state.customConfig.delimiter).length;
    this.elements.customCount.textContent = `${text.length.toLocaleString()} characters · ${words.toLocaleString()} words`;
  }

  handleCustomGroup(event, group) {
    const button = event.target.closest("button[data-value]");
    if (!button) return;

    const key = group.dataset.customGroup;
    this.state.customConfig[key] = button.dataset.value;

    for (const item of group.querySelectorAll("button")) {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    }

    if (key === "limitType") {
      this.elements.limitValue.disabled = button.dataset.value === "none";
    }

    if (key === "delimiter") this.updateCustomCount();
  }

  syncCustomControls() {
    for (const group of this.elements.customGroups) {
      const key = group.dataset.customGroup;

      for (const button of group.querySelectorAll("button")) {
        const active = button.dataset.value === this.state.customConfig[key];
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      }
    }

    this.elements.limitValue.value = String(this.state.customConfig.limitValue);
    this.elements.limitValue.disabled =
      this.state.customConfig.limitType === "none";
  }

  importTextFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      this.elements.customText.value = String(reader.result || "");
      this.updateCustomCount();
    });
    reader.readAsText(file);
    event.target.value = "";
  }

  cleanCustomText(type) {
    let value = this.elements.customText.value;

    if (type === "zero") value = value.replace(/[\u200B-\u200D\uFEFF]/g, "");
    if (type === "typography")
      value = value
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/—/g, "-");
    if (type === "control")
      value = value.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
    if (type === "lines") value = value.replace(/\s*\n+\s*/g, " ");

    this.elements.customText.value = value;
    this.updateCustomCount();
  }

  applyCustomText() {
    this.state.customText =
      this.elements.customText.value.trim() || DEFAULT_CUSTOM;
    this.state.customConfig.limitValue = Math.max(
      1,
      Number(this.elements.limitValue.value) || 1,
    );

    localStorage.setItem("keyflow-custom-text", this.state.customText);
    localStorage.setItem(
      "keyflow-custom-config",
      JSON.stringify(this.state.customConfig),
    );

    this.closeCustomDialog();
    this.activateMode("custom");
  }
}

const app = new KeyflowApp();
app.init();
