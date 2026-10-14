// 設定 Google 試算表發布後的 CSV 網址。
// 請將這裡替換成你自己的 Google 試算表 CSV 網址。
const GOOGLE_SHEET_CSV_URL ="https://docs.google.com/spreadsheets/d/e/2PACX-1vRaTley7HOElj3CtXRqefvCAQZIJ3yBtIrwbZJ3IEIgv-4uSr2FdQ4YdF3f9q54fh0tb_C8VUanZfy5/pub?gid=357084574&single=true&output=csv";

// 設定題庫重新讀取的時間間隔，單位為毫秒。
// 這裡設定為每五分鐘檢查一次更新。
const QUESTION_REFRESH_INTERVAL = 5 * 60 * 1000;

// 儲存從 Google 試算表讀取的完整題庫。
let questionBank = [];

// 儲存本次測驗隨機抽出的五題。
let quizQuestions = [];

// 記錄題庫是否已成功載入。
let questionsLoaded = false;

// 記錄題庫是否載入失敗。
let questionsLoadError = false;

// 儲存題庫載入錯誤訊息。
let questionsLoadErrorMessage = "";

// 儲存目前題目索引值。
let currentQuestion = 0;

// 儲存答對題數。
let correctCount = 0;

// 記錄目前題目是否已作答。
let answered = false;

// 儲存使用者選擇的選項索引值。
let selectedOption = -1;

// 儲存選項的實際繪製位置。
let optionRects = [];

// 儲存下一題按鈕位置。
let nextButton = {
  x: 0,
  y: 0,
  w: 0,
  h: 0
};

// 儲存重新測驗按鈕位置。
let restartButton = {
  x: 0,
  y: 0,
  w: 0,
  h: 0
};

// 儲存目前響應式版面。
let currentLayout = null;

// 儲存煙火粒子。
let fireworks = [];

// 儲存最近一次建立煙火的時間。
let lastFireworkTime = 0;

// 儲存低分時的鼓勵特效。
let encouragementItems = [];

// 儲存下一次自動更新題庫的時間。
let nextRefreshTime = 0;

// 儲存中文字型名稱。
const chineseFont = "Kaisei HarunoUmi";

// 儲存英文字型名稱。
const englishFont = "Shantell Sans";

// 設定畫布背景顏色。
const backgroundColor = "#f8edeb";

// 設定答對選項背景顏色。
const correctColor = "#d8e2dc";

// 設定答錯選項背景顏色。
const wrongColor = "#fec5bb";

// 設定題目方框背景顏色。
const questionBoxColor = "#ffe6a7";

// 設定主要文字顏色。
const textColor = "#3d405b";

// 設定一般選項背景顏色。
const normalOptionColor = "#ffffff";

// 等待 Google Fonts 載入完成。
function preload() {
  // 等待網頁字型準備完成。
  document.fonts.ready.then(() => {
    // 字型準備完成後，使用英文字型作為預設字型。
    textFont(englishFont);
  });
}

// p5.js 初始化函式。
function setup() {
  // 建立符合瀏覽器視窗大小的畫布。
  createCanvas(windowWidth, windowHeight);

  // 讓畫布以區塊元素顯示。
  canvas.style.display = "block";

  // 移除網頁預設外距。
  document.body.style.margin = "0";

  // 隱藏網頁捲軸。
  document.body.style.overflow = "hidden";

  // 設定文字預設置中。
  textAlign(CENTER, CENTER);

  // 設定預設英文字型。
  textFont(englishFont);

  // 重設結果特效。
  resetResultEffects();

  // 立即從 Google 試算表讀取題庫。
  loadQuestionsFromGoogleSheet();

  // 設定下一次自動更新時間。
  nextRefreshTime =
    millis() + QUESTION_REFRESH_INTERVAL;
}

// p5.js 每一幀執行的繪圖函式。
function draw() {
  // 填滿畫布背景色。
  background(backgroundColor);

  // 更新畫布尺寸。
  updateCanvasSize();

  // 判斷是否需要自動更新題庫。
  if (
    millis() >= nextRefreshTime &&
    !questionsLoadError
  ) {
    // 重新讀取 Google 試算表題庫。
    loadQuestionsFromGoogleSheet();

    // 設定下一次更新時間。
    nextRefreshTime =
      millis() + QUESTION_REFRESH_INTERVAL;
  }

  // 如果題庫載入失敗，顯示錯誤畫面。
  if (questionsLoadError) {
    // 繪製錯誤畫面。
    drawQuestionsLoadError();

    // 結束本次繪圖。
    return;
  }

  // 如果題庫尚未載入完成，顯示載入畫面。
  if (!questionsLoaded) {
    // 繪製載入畫面。
    drawLoadingScreen();

    // 結束本次繪圖。
    return;
  }

  // 判斷是否已完成所有題目。
  if (currentQuestion >= quizQuestions.length) {
    // 繪製結果畫面。
    drawResultScreen();
  } else {
    // 繪製測驗作答畫面。
    drawQuizScreen();
  }
}

// 從 Google 試算表讀取題庫。
function loadQuestionsFromGoogleSheet() {
  // 檢查使用者是否已填入 Google 試算表網址。
  if (
    GOOGLE_SHEET_CSV_URL.includes("請貼上") ||
    GOOGLE_SHEET_CSV_URL.trim() === ""
  ) {
    // 設定錯誤狀態。
    questionsLoadError = true;

    // 設定錯誤訊息。
    questionsLoadErrorMessage =
      "請先在 sketch.js 中填入 Google 試算表 CSV 網址。";

    // 結束讀取。
    return;
  }

  // 顯示載入狀態。
  questionsLoaded = false;

  // 暫時清除錯誤狀態。
  questionsLoadError = false;

  // 使用 fetch 取得 Google 試算表 CSV。
  fetch(GOOGLE_SHEET_CSV_URL)
    .then((response) => {
      // 判斷伺服器是否成功回應。
      if (!response.ok) {
        // 建立讀取失敗錯誤。
        throw new Error(
          `Google 試算表回應錯誤：${response.status}`
        );
      }

      // 將回應內容轉換成文字。
      return response.text();
    })
    .then((csvText) => {
      // 將 CSV 文字轉換成題庫資料。
      const parsedQuestions =
        parseCSVQuestionBank(csvText);

      // 檢查題庫是否至少有五題。
      if (parsedQuestions.length < 5) {
        // 建立題數不足錯誤。
        throw new Error(
          "Google 試算表至少需要五筆有效題目。"
        );
      }

      // 判斷是否為第一次成功載入題庫。
      const isFirstLoad = !questionsLoaded;

      // 將新題庫存入記憶體。
      questionBank = parsedQuestions;

      // 設定題庫已成功載入。
      questionsLoaded = true;

      // 清除錯誤狀態。
      questionsLoadError = false;

      // 如果是第一次載入，開始測驗。
      if (isFirstLoad) {
        // 開始第一輪測驗。
        startQuiz();
      }
    })
    .catch((error) => {
      // 將錯誤訊息輸出至主控台。
      console.error(error);

      // 如果原本已有可用題庫，保留目前測驗。
      if (questionsLoaded && questionBank.length >= 5) {
        // 不清除現有題庫。
        questionsLoadError = false;

        // 結束錯誤處理。
        return;
      }

      // 設定題庫載入失敗。
      questionsLoadError = true;

      // 設定錯誤訊息。
      questionsLoadErrorMessage =
        "無法讀取 Google 試算表，請確認試算表已公開，且 CSV 網址正確。";
    });
}

// 解析 Google 試算表 CSV。
function parseCSVQuestionBank(csvText) {
  // 移除 UTF-8 BOM 標記。
  const cleanCsvText = csvText.replace(/^\uFEFF/, "");

  // 將 CSV 文字切割成資料列。
  const rows = parseCSVRows(cleanCsvText);

  // 如果沒有任何資料，回傳空陣列。
  if (rows.length === 0) {
    // 回傳空題庫。
    return [];
  }

  // 讀取第一列欄位名稱。
  const headers = rows[0].map((header) => {
    // 移除前後空白並轉為小寫。
    return header.trim().toLowerCase();
  });

  // 找出各欄位的索引值。
  const questionIndex = headers.indexOf("question");
  const optionAIndex = headers.indexOf("optiona");
  const optionBIndex = headers.indexOf("optionb");
  const optionCIndex = headers.indexOf("optionc");
  const optionDIndex = headers.indexOf("optiond");
  const answerIndex = headers.indexOf("answer");

  // 檢查必要欄位是否存在。
  const headersAreValid =
    questionIndex >= 0 &&
    optionAIndex >= 0 &&
    optionBIndex >= 0 &&
    optionCIndex >= 0 &&
    optionDIndex >= 0 &&
    answerIndex >= 0;

  // 如果欄位不完整，回傳空陣列。
  if (!headersAreValid) {
    // 回傳空題庫。
    return [];
  }

  // 儲存解析後的題目。
  const parsedQuestions = [];

  // 從第二列開始處理題目資料。
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    // 取得目前列。
    const row = rows[rowIndex];

    // 讀取題目文字。
    const question =
      String(row[questionIndex] || "").trim();

    // 讀取第一個選項。
    const optionA =
      String(row[optionAIndex] || "").trim();

    // 讀取第二個選項。
    const optionB =
      String(row[optionBIndex] || "").trim();

    // 讀取第三個選項。
    const optionC =
      String(row[optionCIndex] || "").trim();

    // 讀取第四個選項。
    const optionD =
      String(row[optionDIndex] || "").trim();

    // 讀取正確答案。
    const answerText =
      String(row[answerIndex] || "")
        .trim()
        .toUpperCase();

    // 將 A、B、C、D 轉成索引值。
    const answer = answerTextToIndex(answerText);

    // 檢查這一列資料是否完整。
    const rowIsValid =
      question.length > 0 &&
      optionA.length > 0 &&
      optionB.length > 0 &&
      optionC.length > 0 &&
      optionD.length > 0 &&
      answer >= 0 &&
      answer <= 3;

    // 只加入有效題目。
    if (rowIsValid) {
      // 將題目加入題庫。
      parsedQuestions.push({
        question: question,
        options: [
          optionA,
          optionB,
          optionC,
          optionD
        ],
        answer: answer
      });
    }
  }

  // 回傳解析完成的題庫。
  return parsedQuestions;
}

// 將 CSV 文字解析成二維陣列。
function parseCSVRows(csvText) {
  // 儲存所有資料列。
  const rows = [];

  // 儲存目前資料列。
  let currentRow = [];

  // 儲存目前欄位文字。
  let currentField = "";

  // 記錄目前是否位於引號內。
  let insideQuotes = false;

  // 逐字元讀取 CSV。
  for (let i = 0; i < csvText.length; i++) {
    // 取得目前字元。
    const character = csvText[i];

    // 處理雙引號。
    if (character === '"') {
      // 如果引號內遇到兩個連續引號，表示一個引號字元。
      if (
        insideQuotes &&
        csvText[i + 1] === '"'
      ) {
        // 將引號加入欄位。
        currentField += '"';

        // 跳過下一個引號。
        i++;
      } else {
        // 切換引號狀態。
        insideQuotes = !insideQuotes;
      }

      // 繼續處理下一個字元。
      continue;
    }

    // 在非引號狀態遇到逗號，表示欄位結束。
    if (
      character === "," &&
      !insideQuotes
    ) {
      // 將欄位加入目前列。
      currentRow.push(currentField);

      // 清空目前欄位。
      currentField = "";

      // 繼續處理下一個字元。
      continue;
    }

    // 在非引號狀態遇到換行，表示資料列結束。
    if (
      (character === "\n" || character === "\r") &&
      !insideQuotes
    ) {
      // 處理 Windows 格式的換行。
      if (
        character === "\r" &&
        csvText[i + 1] === "\n"
      ) {
        // 跳過 \n。
        i++;
      }

      // 將最後一個欄位加入目前列。
      currentRow.push(currentField);

      // 只有非空列才加入資料。
      if (
        currentRow.some(
          (field) => field.trim() !== ""
        )
      ) {
        // 將目前列加入所有資料列。
        rows.push(currentRow);
      }

      // 建立新的資料列。
      currentRow = [];

      // 清空欄位。
      currentField = "";

      // 繼續處理下一個字元。
      continue;
    }

    // 將一般字元加入目前欄位。
    currentField += character;
  }

  // 如果最後仍有資料，補上最後一列。
  if (
    currentField.length > 0 ||
    currentRow.length > 0
  ) {
    // 將最後欄位加入目前列。
    currentRow.push(currentField);

    // 將最後一列加入資料。
    rows.push(currentRow);
  }

  // 回傳 CSV 二維陣列。
  return rows;
}

// 將答案字母轉為陣列索引。
function answerTextToIndex(answerText) {
  // 建立答案對照表。
  const answerMap = {
    A: 0,
    B: 1,
    C: 2,
    D: 3
  };

  // 回傳答案索引值。
  return Object.prototype.hasOwnProperty.call(
    answerMap,
    answerText
  )
    ? answerMap[answerText]
    : -1;
}

// 顯示題庫載入畫面。
function drawLoadingScreen() {
  // 設定載入文字。
  const loadingText = "正在載入題庫⋯⋯";

  // 套用中文字型。
  setFontForText(loadingText);

  // 設定文字大小。
  textSize(clampValue(width * 0.06, 22, 36));

  // 設定文字顏色。
  fill(textColor);

  // 顯示載入文字。
  text(
    loadingText,
    width / 2,
    height / 2
  );
}

// 顯示題庫錯誤畫面。
function drawQuestionsLoadError() {
  // 設定錯誤標題。
  const errorTitle = "題庫載入失敗";

  // 套用中文字型。
  setFontForText(errorTitle);

  // 設定標題大小。
  textSize(clampValue(width * 0.07, 24, 42));

  // 設定文字顏色。
  fill(textColor);

  // 顯示錯誤標題。
  text(
    errorTitle,
    width / 2,
    height * 0.35
  );

  // 套用說明文字字型。
  setFontForText(questionsLoadErrorMessage);

  // 設定說明文字大小。
  textSize(clampValue(width * 0.04, 16, 23));

  // 顯示錯誤說明。
  text(
    questionsLoadErrorMessage,
    width / 2,
    height * 0.55,
    width * 0.85,
    height * 0.25
  );
}

// 判斷文字是否包含中文。
function containsChinese(value) {
  // 使用正規表示式檢查中文。
  return /[\u3400-\u9FFF]/.test(value);
}

// 根據文字內容套用字型。
function setFontForText(value) {
  // 中文套用中文字型。
  if (containsChinese(value)) {
    // 使用 Kaisei HarunoUmi。
    textFont(chineseFont);
  } else {
    // 使用 Shantell Sans。
    textFont(englishFont);
  }
}

// 更新畫布尺寸。
function updateCanvasSize() {
  // 取得目前視窗寬度。
  const availableWidth = max(1, windowWidth);

  // 取得目前視窗高度。
  const availableHeight = max(1, windowHeight);

  // 判斷是否需要重新設定畫布。
  if (
    width !== availableWidth ||
    height !== availableHeight
  ) {
    // 調整畫布尺寸。
    resizeCanvas(availableWidth, availableHeight);

    // 清除舊版面。
    currentLayout = null;

    // 清除舊選項位置。
    optionRects = [];
  }
}

// 開始或重新開始測驗。
function startQuiz() {
  // 複製題庫。
  const shuffledQuestions = shuffle(questionBank.slice());

  // 隨機抽取五題。
  quizQuestions =
    shuffledQuestions.slice(0, 5);

  // 設定目前題目為第一題。
  currentQuestion = 0;

  // 將答對題數歸零。
  correctCount = 0;

  // 設定尚未作答。
  answered = false;

  // 清除選項選擇。
  selectedOption = -1;

  // 清除選項位置。
  optionRects = [];

  // 重設結果特效。
  resetResultEffects();
}

// 重設結果頁面特效。
function resetResultEffects() {
  // 清除煙火粒子。
  fireworks = [];

  // 重設煙火計時。
  lastFireworkTime = 0;

  // 清除加油特效。
  encouragementItems = [];

  // 建立加油特效物件。
  for (let i = 0; i < 18; i++) {
    // 新增漂浮物件。
    encouragementItems.push({
      // 設定水平位置。
      x: random(24, max(25, width - 24)),

      // 設定垂直位置。
      y: random(35, max(36, height - 35)),

      // 設定動畫相位。
      phase: random(TWO_PI),

      // 設定動畫速度。
      speed: random(0.018, 0.04),

      // 設定大小。
      size: random(18, 34),

      // 設定符號。
      symbol: random(["★", "♥", "✦", "✧"]),

      // 設定顏色。
      color: random([
        "#ff8fa3",
        "#ffb4a2",
        "#f9c74f",
        "#90dbf4",
        "#a8dadc"
      ])
    });
  }
}

// 取得已完成題目數。
function getCompletedCount() {
  // 如果全部完成，回傳總題數。
  if (currentQuestion >= quizQuestions.length) {
    // 回傳總題數。
    return quizQuestions.length;
  }

  // 如果目前題目已作答，包含目前題目。
  if (answered) {
    // 回傳完成題數。
    return currentQuestion + 1;
  }

  // 尚未作答時，回傳前面完成題數。
  return currentQuestion;
}

// 限制數值範圍。
function clampValue(value, minValue, maxValue) {
  // 回傳限制後的數值。
  return max(minValue, min(maxValue, value));
}

// 計算響應式版面。
function calculateQuizLayout() {
  // 取得畫布寬度。
  const canvasWidth = max(1, width);

  // 取得畫布高度。
  const canvasHeight = max(1, height);

  // 設定左右安全邊界。
  const horizontalPadding = clampValue(
    canvasWidth * 0.05,
    16,
    72
  );

  // 設定內容最大寬度。
  const maxContentWidth = 760;

  // 計算實際內容寬度。
  const contentWidth = min(
    maxContentWidth,
    canvasWidth - horizontalPadding * 2
  );

  // 計算內容左側位置。
  const contentX =
    (canvasWidth - contentWidth) / 2;

  // 判斷是否為窄螢幕。
  const isNarrowScreen = canvasWidth < 480;

  // 判斷是否為橫向畫面。
  const isLandscape = canvasWidth > canvasHeight;

  // 設定題數文字大小。
  const questionNumberSize = clampValue(
    canvasWidth * 0.042,
    16,
    23
  );

  // 設定進度條寬度。
  const progressWidth = min(contentWidth, 560);

  // 設定進度條高度。
  const progressHeight = clampValue(
    canvasWidth * 0.018,
    10,
    16
  );

  // 設定進度文字大小。
  const progressTextSize = clampValue(
    canvasWidth * 0.034,
    14,
    19
  );

  // 設定題目文字大小。
  const questionFontSize = clampValue(
    canvasWidth * (isNarrowScreen ? 0.06 : 0.055),
    21,
    36
  );

  // 設定題目方框高度。
  const questionHeight = clampValue(
    canvasHeight * (isLandscape ? 0.16 : 0.13),
    70,
    120
  );

  // 設定選項間距。
  const optionGap = clampValue(
    canvasHeight * 0.016,
    8,
    18
  );

  // 設定選項可用高度。
  const desiredOptionAreaHeight = isLandscape
    ? canvasHeight * 0.43
    : canvasHeight * 0.40;

  // 計算選項高度。
  let optionHeight =
    (desiredOptionAreaHeight - optionGap * 3) / 4;

  // 限制選項高度。
  optionHeight = clampValue(optionHeight, 48, 78);

  // 設定選項文字大小。
  let optionFontSize = clampValue(
    canvasWidth * (isNarrowScreen ? 0.038 : 0.034),
    16,
    24
  );

  // 設定按鈕高度。
  const buttonHeight = clampValue(
    canvasHeight * 0.075,
    50,
    62
  );

  // 設定按鈕文字大小。
  const buttonFontSize = clampValue(
    canvasWidth * 0.038,
    17,
    23
  );

  // 設定題目與選項間距。
  const questionToOptionsGap = isLandscape
    ? 12
    : 18;

  // 計算頁首高度。
  const headerHeight =
    questionNumberSize +
    progressHeight +
    progressTextSize +
    30;

  // 計算按鈕區域高度。
  const answerButtonArea = answered
    ? buttonHeight + 18
    : 0;

  // 計算內容總高度。
  let totalContentHeight =
    headerHeight +
    questionHeight +
    questionToOptionsGap +
    optionHeight * 4 +
    optionGap * 3 +
    answerButtonArea;

  // 設定上下安全邊界。
  const verticalPadding = isLandscape ? 12 : 18;

  // 計算可用高度。
  const usableHeight =
    canvasHeight - verticalPadding * 2;

  // 如果內容太高，進行縮小。
  if (totalContentHeight > usableHeight) {
    // 計算縮小比例。
    const scaleRatio =
      usableHeight / totalContentHeight;

    // 縮小選項字體。
    optionFontSize *= scaleRatio;

    // 縮小選項高度。
    optionHeight *= scaleRatio;

    // 縮小選項間距。
    const scaledOptionGap =
      optionGap * scaleRatio;

    // 重新計算總高度。
    totalContentHeight =
      headerHeight +
      questionHeight +
      questionToOptionsGap +
      optionHeight * 4 +
      scaledOptionGap * 3 +
      answerButtonArea;

    // 回傳縮小後版面。
    return createLayoutObject(
      contentX,
      contentWidth,
      progressWidth,
      progressHeight,
      progressTextSize,
      questionNumberSize,
      questionFontSize,
      questionHeight,
      scaledOptionGap,
      optionHeight,
      optionFontSize,
      buttonHeight,
      buttonFontSize,
      totalContentHeight,
      canvasHeight,
      verticalPadding,
      questionToOptionsGap,
      headerHeight
    );
  }

  // 回傳一般版面。
  return createLayoutObject(
    contentX,
    contentWidth,
    progressWidth,
    progressHeight,
    progressTextSize,
    questionNumberSize,
    questionFontSize,
    questionHeight,
    optionGap,
    optionHeight,
    optionFontSize,
    buttonHeight,
    buttonFontSize,
    totalContentHeight,
    canvasHeight,
    verticalPadding,
    questionToOptionsGap,
    headerHeight
  );
}

// 建立版面資料物件。
function createLayoutObject(
  contentX,
  contentWidth,
  progressWidth,
  progressHeight,
  progressTextSize,
  questionNumberSize,
  questionFontSize,
  questionHeight,
  optionGap,
  optionHeight,
  optionFontSize,
  buttonHeight,
  buttonFontSize,
  totalContentHeight,
  canvasHeight,
  verticalPadding,
  questionToOptionsGap,
  headerHeight
) {
  // 將內容垂直置中。
  const startY = max(
    verticalPadding,
    (canvasHeight - totalContentHeight) / 2
  );

  // 回傳版面資料。
  return {
    contentX,
    contentWidth,
    progressWidth,
    progressHeight,
    progressTextSize,
    questionNumberSize,
    questionFontSize,
    questionHeight,
    optionGap,
    optionHeight,
    optionFontSize,
    buttonHeight,
    buttonFontSize,
    totalContentHeight,
    startY,
    questionToOptionsGap,
    headerHeight
  };
}

// 將文字切割成指定寬度內的多行。
function wrapTextLines(value, maxWidth, fontSize) {
  // 根據文字內容套用字型。
  setFontForText(value);

  // 設定文字大小。
  textSize(fontSize);

  // 依照空白切割文字。
  const words = value.split(" ");

  // 儲存多行文字。
  const lines = [];

  // 儲存目前文字行。
  let currentLine = "";

  // 逐一處理每個單字。
  for (let i = 0; i < words.length; i++) {
    // 取得目前單字。
    const word = words[i];

    // 嘗試將單字加入目前文字行。
    const testLine =
      currentLine.length > 0
        ? `${currentLine} ${word}`
        : word;

    // 判斷是否超過寬度。
    if (textWidth(testLine) <= maxWidth) {
      // 留在同一行。
      currentLine = testLine;
    } else {
      // 儲存目前文字行。
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }

      // 開始新的一行。
      currentLine = word;
    }
  }

  // 儲存最後一行。
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // 確保至少有一行。
  if (lines.length === 0) {
    lines.push("");
  }

  // 回傳多行文字。
  return lines;
}

// 在指定區域內置中繪製多行文字。
function drawCenteredLines(
  lines,
  x,
  y,
  w,
  h,
  fontSize,
  lineHeight
) {
  // 設定文字大小。
  textSize(fontSize);

  // 設定文字置中。
  textAlign(CENTER, CENTER);

  // 計算文字總高度。
  const totalTextHeight =
    lines.length * lineHeight;

  // 計算第一行文字位置。
  const firstLineY =
    y +
    (h - totalTextHeight) / 2 +
    lineHeight / 2;

  // 逐行繪製文字。
  for (let i = 0; i < lines.length; i++) {
    // 根據文字內容設定字型。
    setFontForText(lines[i]);

    // 繪製文字。
    text(
      lines[i],
      x + w / 2,
      firstLineY + i * lineHeight
    );
  }
}

// 繪製作答進度條。
function drawProgressBar(layout) {
  // 取得已完成題數。
  const completedCount = getCompletedCount();

  // 取得總題數。
  const totalQuestions = quizQuestions.length;

  // 計算完成比例。
  const progressRatio =
    totalQuestions > 0
      ? completedCount / totalQuestions
      : 0;

  // 計算進度條左側位置。
  const progressX =
    (width - layout.progressWidth) / 2;

  // 計算進度條垂直位置。
  const progressY =
    layout.startY +
    layout.questionNumberSize +
    10;

  // 關閉外框。
  noStroke();

  // 設定進度條背景。
  fill(255, 255, 255, 190);

  // 繪製進度條背景。
  rect(
    progressX,
    progressY,
    layout.progressWidth,
    layout.progressHeight,
    layout.progressHeight / 2
  );

  // 設定進度條填色。
  fill(textColor);

  // 計算已完成寬度。
  const completedWidth =
    layout.progressWidth * progressRatio;

  // 繪製完成部分。
  if (completedWidth > 0) {
    // 繪製進度填色。
    rect(
      progressX,
      progressY,
      completedWidth,
      layout.progressHeight,
      layout.progressHeight / 2
    );
  }

  // 設定進度文字。
  const progressText =
    `作答進度：${completedCount}／${totalQuestions}`;

  // 套用中文字型。
  setFontForText(progressText);

  // 設定文字顏色。
  fill(textColor);

  // 設定文字大小。
  textSize(layout.progressTextSize);

  // 顯示作答進度。
  text(
    progressText,
    width / 2,
    progressY +
      layout.progressHeight +
      layout.progressTextSize
  );
}

// 繪製測驗作答畫面。
function drawQuizScreen() {
  // 取得目前題目。
  const questionData = quizQuestions[currentQuestion];

  // 重新計算響應式版面。
  currentLayout = calculateQuizLayout();

  // 清除舊選項位置。
  optionRects = [];

  // 取得目前版面。
  const layout = currentLayout;

  // 設定題數文字。
  const questionNumberText =
    `第 ${currentQuestion + 1} 題／共 ${quizQuestions.length} 題`;

  // 套用中文字型。
  setFontForText(questionNumberText);

  // 設定文字大小。
  textSize(layout.questionNumberSize);

  // 設定文字顏色。
  fill(textColor);

  // 設定文字粗細。
  textStyle(BOLD);

  // 顯示題數。
  text(
    questionNumberText,
    width / 2,
    layout.startY +
      layout.questionNumberSize / 2
  );

  // 繪製進度條。
  drawProgressBar(layout);

  // 計算題目方框垂直位置。
  const questionY =
    layout.startY +
    layout.headerHeight;

  // 設定題目方框背景色。
  fill(questionBoxColor);

  // 設定題目方框外框色。
  stroke(255, 255, 255, 220);

  // 設定方框外框粗細。
  strokeWeight(2);

  // 繪製題目方框。
  rect(
    layout.contentX,
    questionY,
    layout.contentWidth,
    layout.questionHeight,
    18
  );

  // 將題目切割成多行。
  const questionLines = wrapTextLines(
    questionData.question,
    layout.contentWidth - 28,
    layout.questionFontSize
  );

  // 設定題目行距。
  const questionLineHeight =
    layout.questionFontSize * 1.25;

  // 設定文字顏色。
  fill(textColor);

  // 在題目方框內置中繪製題目。
  drawCenteredLines(
    questionLines,
    layout.contentX + 14,
    questionY + 6,
    layout.contentWidth - 28,
    layout.questionHeight - 12,
    layout.questionFontSize,
    questionLineHeight
  );

  // 恢復一般文字粗細。
  textStyle(NORMAL);

  // 計算第一個選項位置。
  const firstOptionY =
    questionY +
    layout.questionHeight +
    layout.questionToOptionsGap;

  // 逐一繪製四個選項。
  for (let i = 0; i < questionData.options.length; i++) {
    // 計算選項原始垂直位置。
    const baseY =
      firstOptionY +
      i * (layout.optionHeight + layout.optionGap);

    // 設定水平動畫位移。
    let offsetX = 0;

    // 設定垂直動畫位移。
    let offsetY = 0;

    // 判斷是否為使用者選擇的選項。
    const isSelected = selectedOption === i;

    // 判斷是否為正確答案。
    const isCorrect =
      questionData.answer === i;

    // 答對時正確答案上下跳動。
    if (
      answered &&
      selectedOption === questionData.answer &&
      isCorrect
    ) {
      // 產生上下動畫。
      offsetY = sin(frameCount * 0.14) * 7;
    }

    // 答錯時錯誤選項左右移動。
    if (
      answered &&
      selectedOption !== questionData.answer &&
      isSelected
    ) {
      // 產生左右動畫。
      offsetX = sin(frameCount * 0.25) * 8;
    }

    // 答錯時正確答案上下跳動。
    if (
      answered &&
      selectedOption !== questionData.answer &&
      isCorrect
    ) {
      // 產生上下動畫。
      offsetY = sin(frameCount * 0.14) * 7;
    }

    // 建立選項實際位置。
    const optionRect = {
      x: layout.contentX + offsetX,
      y: baseY + offsetY,
      w: layout.contentWidth,
      h: layout.optionHeight
    };

    // 儲存選項位置。
    optionRects.push(optionRect);

    // 設定選項預設顏色。
    let currentColor = color(normalOptionColor);

    // 答對時設定正確顏色。
    if (
      answered &&
      selectedOption === questionData.answer &&
      isCorrect
    ) {
      // 套用答對背景色。
      currentColor = color(correctColor);
    }

    // 答錯時設定錯誤選項顏色。
    if (
      answered &&
      selectedOption !== questionData.answer &&
      isSelected
    ) {
      // 套用答錯背景色。
      currentColor = color(wrongColor);
    }

    // 答錯時設定正確答案顏色。
    if (
      answered &&
      selectedOption !== questionData.answer &&
      isCorrect
    ) {
      // 套用正確答案背景色。
      currentColor = color(correctColor);
    }

    // 設定選項背景色。
    fill(currentColor);

    // 設定選項外框色。
    stroke(255, 255, 255, 230);

    // 繪製選項框。
    rect(
      optionRect.x,
      optionRect.y,
      optionRect.w,
      optionRect.h,
      16
    );

    // 組合選項文字。
    const optionText =
      `${String.fromCharCode(65 + i)}. ${questionData.options[i]}`;

    // 將英文文字切割成多行。
    const optionLines = wrapTextLines(
      optionText,
      optionRect.w - 36,
      layout.optionFontSize
    );

    // 設定英文行距。
    const optionLineHeight =
      layout.optionFontSize * 1.2;

    // 設定文字顏色。
    fill(textColor);

    // 在選項框內置中繪製文字。
    drawCenteredLines(
      optionLines,
      optionRect.x + 18,
      optionRect.y + 4,
      optionRect.w - 36,
      optionRect.h - 8,
      layout.optionFontSize,
      optionLineHeight
    );
  }

  // 作答後顯示下一題按鈕。
  if (answered) {
    // 設定按鈕寬度。
    nextButton.w = min(layout.contentWidth, 340);

    // 設定按鈕高度。
    nextButton.h = layout.buttonHeight;

    // 將按鈕水平置中。
    nextButton.x =
      (width - nextButton.w) / 2;

    // 計算按鈕垂直位置。
    nextButton.y =
      firstOptionY +
      layout.optionHeight * 4 +
      layout.optionGap * 3 +
      18;

    // 如果按鈕超出畫布，固定到底部。
    if (
      nextButton.y + nextButton.h >
      height - 12
    ) {
      // 將按鈕移至安全位置。
      nextButton.y =
        height - nextButton.h - 12;
    }

    // 設定按鈕背景色。
    fill(textColor);

    // 設定按鈕外框色。
    stroke(textColor);

    // 繪製下一題按鈕。
    rect(
      nextButton.x,
      nextButton.y,
      nextButton.w,
      nextButton.h,
      16
    );

    // 設定按鈕文字。
    const nextButtonText =
      currentQuestion === quizQuestions.length - 1
        ? "查看成績"
        : "下一題";

    // 套用中文字型。
    setFontForText(nextButtonText);

    // 設定按鈕文字顏色。
    fill(255);

    // 設定按鈕文字大小。
    textSize(layout.buttonFontSize);

    // 顯示按鈕文字。
    text(
      nextButtonText,
      width / 2,
      nextButton.y + nextButton.h / 2
    );
  }
}

// 繪製結果畫面。
function drawResultScreen() {
  // 清除選項位置。
  optionRects = [];

  // 計算總分，每題二十分。
  const score = correctCount * 20;

  // 判斷是否達到六十分。
  const passed = score >= 60;

  // 繪製對應特效。
  if (passed) {
    // 顯示煙火特效。
    drawFireworkEffect();
  } else {
    // 顯示加油特效。
    drawEncouragementEffect();
  }

  // 計算畫面中心。
  const centerX = width / 2;

  // 計算畫面垂直中心。
  const centerY = height / 2;

  // 設定標題大小。
  const titleSize = clampValue(
    width * 0.09,
    30,
    50
  );

  // 設定成績大小。
  const scoreSize = clampValue(
    width * 0.065,
    25,
    38
  );

  // 設定一般文字大小。
  const messageSize = clampValue(
    width * 0.042,
    17,
    25
  );

  // 設定標題文字。
  const titleText = "測驗完成！";

  // 套用中文字型。
  setFontForText(titleText);

  // 設定標題粗細。
  textStyle(BOLD);

  // 設定標題文字大小。
  textSize(titleSize);

  // 設定文字顏色。
  fill(textColor);

  // 顯示標題。
  text(
    titleText,
    centerX,
    centerY - 150
  );

  // 恢復一般文字粗細。
  textStyle(NORMAL);

  // 設定進度文字。
  const progressText =
    `作答進度：${quizQuestions.length}／${quizQuestions.length}`;

  // 套用中文字型。
  setFontForText(progressText);

  // 設定文字大小。
  textSize(messageSize);

  // 顯示進度文字。
  text(
    progressText,
    centerX,
    centerY - 88
  );

  // 設定答對題數文字。
  const correctText =
    `答對 ${correctCount}／${quizQuestions.length} 題`;

  // 套用中文字型。
  setFontForText(correctText);

  // 設定文字大小。
  textSize(scoreSize);

  // 顯示答對題數。
  text(
    correctText,
    centerX,
    centerY - 25
  );

  // 設定分數文字。
  const scoreText =
    `總成績：${score} 分`;

  // 套用中文字型。
  setFontForText(scoreText);

  // 顯示分數。
  text(
    scoreText,
    centerX,
    centerY + 34
  );

  // 設定結果說明。
  const resultMessage = passed
    ? "太棒了！你達到六十分以上！"
    : "別灰心，再加油練習一次！";

  // 套用中文字型。
  setFontForText(resultMessage);

  // 設定文字大小。
  textSize(messageSize);

  // 顯示結果說明。
  text(
    resultMessage,
    centerX,
    centerY + 88
  );

  // 設定重新測驗按鈕寬度。
  restartButton.w = min(
    width - 32,
    340
  );

  // 設定重新測驗按鈕高度。
  restartButton.h = clampValue(
    height * 0.075,
    50,
    62
  );

  // 將按鈕水平置中。
  restartButton.x =
    (width - restartButton.w) / 2;

  // 設定按鈕垂直位置。
  restartButton.y =
    min(
      height - restartButton.h - 14,
      centerY + 140
    );

  // 設定按鈕背景色。
  fill(textColor);

  // 設定按鈕外框色。
  stroke(textColor);

  // 繪製重新測驗按鈕。
  rect(
    restartButton.x,
    restartButton.y,
    restartButton.w,
    restartButton.h,
    16
  );

  // 設定按鈕文字。
  const restartText = "重新測驗";

  // 套用中文字型。
  setFontForText(restartText);

  // 設定按鈕文字顏色。
  fill(255);

  // 設定按鈕文字大小。
  textSize(messageSize);

  // 顯示按鈕文字。
  text(
    restartText,
    centerX,
    restartButton.y +
      restartButton.h / 2
  );
}

// 建立煙火。
function createFirework() {
  // 隨機決定煙火位於左側或右側。
  const leftSide = random() < 0.5;

  // 設定煙火水平位置。
  const fireworkX = leftSide
    ? random(width * 0.08, width * 0.28)
    : random(width * 0.72, width * 0.92);

  // 設定煙火垂直位置。
  const fireworkY = random(
    height * 0.16,
    height * 0.56
  );

  // 設定煙火顏色。
  const fireworkColor = random([
    "#ff595e",
    "#ffca3a",
    "#8ac926",
    "#1982c4",
    "#c77dff",
    "#ff9f1c"
  ]);

  // 建立煙火粒子。
  for (let i = 0; i < 38; i++) {
    // 計算粒子移動角度。
    const angle = random(TWO_PI);

    // 計算粒子速度。
    const speed = random(1.5, 4.6);

    // 將粒子加入煙火陣列。
    fireworks.push({
      // 設定粒子位置。
      x: fireworkX,
      y: fireworkY,

      // 設定粒子速度。
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,

      // 設定生命值。
      life: 255,

      // 設定衰減速度。
      decay: random(2.5, 5),

      // 設定粒子大小。
      size: random(3, 7),

      // 設定粒子顏色。
      color: fireworkColor
    });
  }
}

// 繪製煙火特效。
function drawFireworkEffect() {
  // 定期建立新煙火。
  if (
    millis() - lastFireworkTime > 850 ||
    fireworks.length === 0
  ) {
    // 建立煙火。
    createFirework();

    // 更新煙火時間。
    lastFireworkTime = millis();
  }

  // 從後往前更新所有粒子。
  for (let i = fireworks.length - 1; i >= 0; i--) {
    // 取得目前粒子。
    const particle = fireworks[i];

    // 更新粒子位置。
    particle.x += particle.vx;
    particle.y += particle.vy;

    // 加入重力效果。
    particle.vy += 0.025;

    // 降低生命值。
    particle.life -= particle.decay;

    // 計算透明度。
    const alphaValue =
      clampValue(particle.life, 0, 255);

    // 建立粒子顏色。
    const particleColor = color(particle.color);

    // 設定粒子透明度。
    particleColor.setAlpha(alphaValue);

    // 設定粒子顏色。
    fill(particleColor);

    // 關閉外框。
    noStroke();

    // 繪製粒子。
    ellipse(
      particle.x,
      particle.y,
      particle.size,
      particle.size
    );

    // 粒子生命結束時移除。
    if (particle.life <= 0) {
      // 從陣列移除粒子。
      fireworks.splice(i, 1);
    }
  }

  // 計算星星閃爍透明度。
  const sparkleAlpha =
    150 + sin(frameCount * 0.16) * 90;

  // 設定星星顏色。
  fill(255, 202, 58, sparkleAlpha);

  // 套用英文字型。
  textFont(englishFont);

  // 設定星星文字大小。
  textSize(clampValue(width * 0.055, 20, 32));

  // 顯示左側星星。
  text("✦", width * 0.35, height * 0.22);

  // 顯示右側星星。
  text("✦", width * 0.65, height * 0.22);
}

// 繪製低分時的加油特效。
function drawEncouragementEffect() {
  // 逐一繪製漂浮裝飾物。
  for (let i = 0; i < encouragementItems.length; i++) {
    // 取得目前裝飾物。
    const item = encouragementItems[i];

    // 計算動畫時間。
    const animationTime =
      frameCount * item.speed + item.phase;

    // 計算垂直漂浮位置。
    const animatedY =
      item.y + sin(animationTime) * 14;

    // 計算水平漂浮位置。
    const animatedX =
      item.x + cos(animationTime * 0.8) * 8;

    // 計算透明度。
    const alphaValue =
      130 + sin(animationTime * 1.4) * 70;

    // 建立裝飾物顏色。
    const itemColor = color(item.color);

    // 設定透明度。
    itemColor.setAlpha(alphaValue);

    // 設定裝飾物顏色。
    fill(itemColor);

    // 關閉外框。
    noStroke();

    // 套用英文字型。
    textFont(englishFont);

    // 設定裝飾物大小。
    textSize(item.size);

    // 繪製裝飾物。
    text(
      item.symbol,
      animatedX,
      animatedY
    );
  }

  // 計算加油文字縮放效果。
  const cheerScale =
    1 + sin(frameCount * 0.1) * 0.08;

  // 儲存畫布狀態。
  push();

  // 將加油文字放在上方。
  translate(width / 2, height * 0.16);

  // 套用縮放效果。
  scale(cheerScale);

  // 設定加油文字。
  const cheerText = "加油！你可以的！";

  // 套用中文字型。
  setFontForText(cheerText);

  // 設定文字顏色。
  fill(255, 143, 163, 220);

  // 設定文字大小。
  textSize(clampValue(width * 0.06, 22, 36));

  // 顯示加油文字。
  text(cheerText, 0, 0);

  // 恢復畫布狀態。
  pop();
}

// 處理滑鼠點擊。
function mousePressed() {
  // 判斷是否在結果頁面。
  if (currentQuestion >= quizQuestions.length) {
    // 判斷是否點擊重新測驗。
    if (isInsideButton(restartButton)) {
      // 重新開始測驗。
      startQuiz();
    }

    // 結束滑鼠事件。
    return;
  }

  // 如果已經作答，檢查下一題按鈕。
  if (answered) {
    // 判斷是否點擊下一題。
    if (isInsideButton(nextButton)) {
      // 前往下一題。
      currentQuestion++;

      // 將新題目設為尚未作答。
      answered = false;

      // 清除選項選擇。
      selectedOption = -1;

      // 清除舊選項位置。
      optionRects = [];
    }

    // 作答後不可再次選擇選項。
    return;
  }

  // 逐一檢查所有選項。
  for (let i = 0; i < optionRects.length; i++) {
    // 取得目前選項位置。
    const optionRect = optionRects[i];

    // 判斷滑鼠是否位於選項範圍內。
    const clicked =
      mouseX >= optionRect.x &&
      mouseX <= optionRect.x + optionRect.w &&
      mouseY >= optionRect.y &&
      mouseY <= optionRect.y + optionRect.h;

    // 如果點擊選項。
    if (clicked) {
      // 記錄使用者選項。
      selectedOption = i;

      // 將題目設定為已作答。
      answered = true;

      // 判斷是否答對。
      if (
        selectedOption ===
        quizQuestions[currentQuestion].answer
      ) {
        // 答對題數加一。
        correctCount++;
      }

      // 結束選項判斷。
      break;
    }
  }
}

// 判斷滑鼠是否位於按鈕內。
function isInsideButton(button) {
  // 回傳滑鼠是否在按鈕範圍內。
  return (
    mouseX >= button.x &&
    mouseX <= button.x + button.w &&
    mouseY >= button.y &&
    mouseY <= button.y + button.h
  );
}

// 當瀏覽器視窗大小改變時執行。
function windowResized() {
  // 重新調整畫布大小。
  resizeCanvas(windowWidth, windowHeight);

  // 清除舊版面。
  currentLayout = null;

  // 清除舊選項位置。
  optionRects = [];

  // 重新建立特效位置。
  resetResultEffects();
}

// 讓觸控裝置也能使用點擊。
function touchStarted() {
  // 執行滑鼠點擊處理。
  mousePressed();

  // 阻止觸控裝置捲動頁面。
  return false;
}