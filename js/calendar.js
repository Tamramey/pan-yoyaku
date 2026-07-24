/* ============================================
   ★★★ 第3版 ★★★(この行が見えれば新しいJSです)
   --------------------------------------------
   パン教室 予約カレンダー
   役割:レッスンデータをもとに月間カレンダーを描画し、
        残席のあるレッスンをクリックできるようにする
   ============================================ */

/* --------------------------------------------
   ① レッスンデータ(ステップ3から:サーバー取得方式)
   本番では api/lessons.php から最新の残席を取得します。
   ローカル(file://)で開いている時はサーバーがないので、
   下のFALLBACK(予備データ)で表示だけ動くようにしています。
   -------------------------------------------- */
let LESSONS = {};   /* ここにサーバーからのデータが入る */

const LESSONS_FALLBACK = {
  "2026-07-25": { menu: "クロワッサン",   seats: 2 },
  "2026-07-26": { menu: "食パン",         seats: 0 },
  "2026-07-28": { menu: "ベーグル",       seats: 3 },
  "2026-07-30": { menu: "メロンパン",     seats: 1 },
  "2026-08-02": { menu: "バゲット",       seats: 4 },
  "2026-08-05": { menu: "シナモンロール", seats: 2 },
  "2026-08-08": { menu: "食パン",         seats: 3 },
  "2026-08-11": { menu: "クロワッサン",   seats: 0 },
  "2026-08-19": { menu: "カンパーニュ",   seats: 5 },
  "2026-08-23": { menu: "あんパン",       seats: 1 }
};

function loadLessons(){
  fetch("api/lessons.php")
    .then(r => { if(!r.ok) throw new Error(); return r.json(); })
    .then(data => { LESSONS = data; renderCalendar(); })
    .catch(() => {
      /* サーバーが無い環境(ローカル確認)では予備データで描画 */
      LESSONS = LESSONS_FALLBACK;
      renderCalendar();
    });
}

/* 定員に対して「残りわずか」と表示する境目(1席以下) */
const FEW_LIMIT = 1;

/* --------------------------------------------
   ② 表示中の年月を覚えておく変数
   -------------------------------------------- */
const today = new Date();
let viewYear  = today.getFullYear();
let viewMonth = today.getMonth();   /* 0始まり(0=1月) */

/* --------------------------------------------
   ③ カレンダーの描画
   -------------------------------------------- */
function renderCalendar(){
  const cal = document.getElementById("calendar");
  cal.innerHTML = "";

  /* タイトル(例:2026年7月) */
  document.getElementById("calTitle").textContent =
    viewYear + "年" + (viewMonth + 1) + "月";

  /* 曜日の行 */
  const dowRow = document.createElement("div");
  dowRow.className = "cal-row";
  ["日","月","火","水","木","金","土"].forEach((d, i) => {
    const el = document.createElement("div");
    el.className = "dow" + (i === 0 ? " sun" : i === 6 ? " sat" : "");
    el.textContent = d;
    dowRow.appendChild(el);
  });
  cal.appendChild(dowRow);

  /* この月の1日の曜日と、月の日数を調べる */
  const firstDow  = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMon = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevDays  = new Date(viewYear, viewMonth, 0).getDate();

  /* 42マス(6週分)を順番に作る */
  let dayRow = document.createElement("div");
  dayRow.className = "cal-row";

  for(let i = 0; i < 42; i++){
    const cell = document.createElement("div");
    cell.className = "cell";

    let y = viewYear, m = viewMonth, d;

    if(i < firstDow){
      /* 前の月のマス */
      d = prevDays - firstDow + 1 + i;
      m = viewMonth - 1;
      cell.classList.add("out");
    }else if(i >= firstDow + daysInMon){
      /* 次の月のマス */
      d = i - (firstDow + daysInMon) + 1;
      m = viewMonth + 1;
      cell.classList.add("out");
    }else{
      /* 今月のマス */
      d = i - firstDow + 1;
    }

    /* 月をまたいだ場合の年の補正 */
    const dt = new Date(y, m, d);
    y = dt.getFullYear(); m = dt.getMonth(); d = dt.getDate();

    /* 曜日の色分けクラス */
    if(dt.getDay() === 0) cell.classList.add("sun");
    if(dt.getDay() === 6) cell.classList.add("sat");

    /* 今日の印 */
    if(y === today.getFullYear() && m === today.getMonth() && d === today.getDate()){
      cell.classList.add("today");
    }

    /* 日付の数字 */
    const dn = document.createElement("span");
    dn.className = "d";
    dn.textContent = d;
    cell.appendChild(dn);

    /* この日にレッスンがあれば「札」を貼る */
    const key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    if(LESSONS[key]){
      cell.appendChild(makeLessonTag(key, LESSONS[key], m + 1, d));
    }

    dayRow.appendChild(cell);

    /* 7マスごとに行を確定して次の行へ */
    if((i + 1) % 7 === 0){
      cal.appendChild(dayRow);
      dayRow = document.createElement("div");
      dayRow.className = "cal-row";
    }
  }
}

/* --------------------------------------------
   ④ レッスン札を作る(残席数で見た目と動きが変わる)
   -------------------------------------------- */
function makeLessonTag(key, lesson, month, day){
  const tag = document.createElement("div");

  if(lesson.seats <= 0){
    /* 満席:グレーで押せない */
    tag.className = "lesson full";
    tag.innerHTML = '<span class="menu">' + lesson.menu + '</span><span class="seats">満席</span>';
  }else{
    /* 残席あり:残りわずかなら橙、余裕があれば緑 */
    tag.className = "lesson " + (lesson.seats <= FEW_LIMIT ? "few" : "open");
    tag.innerHTML =
      '<span class="menu">' + lesson.menu + '</span>' +
      '<span class="seats">残' + lesson.seats + '席</span>';

    /* クリックで選択(ステップ2:予約フォームを開く。処理はform.js側) */
    tag.addEventListener("click", function(){
      selectLesson(key, lesson, tag);
    });
  }
  return tag;
}

/* --------------------------------------------
   ⑤ 月の切り替えボタン
   -------------------------------------------- */
document.getElementById("prevBtn").addEventListener("click", function(){
  viewMonth--;
  if(viewMonth < 0){ viewMonth = 11; viewYear--; }
  renderCalendar();
});
document.getElementById("nextBtn").addEventListener("click", function(){
  viewMonth++;
  if(viewMonth > 11){ viewMonth = 0; viewYear++; }
  renderCalendar();
});

/* 最初の描画:サーバーからレッスンデータを取ってから描く */
loadLessons();