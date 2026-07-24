/* ============================================
   ★★★ 第3版 ★★★(この行が見えれば新しいJSです)
   --------------------------------------------
   パン教室 予約フォーム
   役割:カレンダーで選んだレッスンを受け取り、
        入力チェック → 確認画面 → 予約確定(サーバー送信)まで進める
   ============================================ */

/* いま選択中のレッスン情報を覚えておく箱 */
let selected = null;        /* { key, menu, seats, dateText } */
let selectedTag = null;     /* 選択中のレッスン札(見た目の強調用) */

/* --------------------------------------------
   ① カレンダーから呼ばれる:レッスン選択
   -------------------------------------------- */
function selectLesson(key, lesson, tagEl){
  /* "2026-07-25" を分解して日付の文言を作る */
  const [y, m, d] = key.split("-").map(Number);
  const w = ["日","月","火","水","木","金","土"][new Date(y, m-1, d).getDay()];
  const dateText = y + "年" + m + "月" + d + "日(" + w + ")";

  selected = { key, menu: lesson.menu, seats: lesson.seats, dateText };

  /* 選択中の札に枠を付ける(前の選択は外す) */
  if(selectedTag) selectedTag.classList.remove("selected");
  selectedTag = tagEl;
  selectedTag.classList.add("selected");

  /* フォームに選択内容を表示 */
  document.getElementById("selSummary").innerHTML =
    "📅 " + dateText + "<br>🥖 「" + lesson.menu + "」レッスン(残" + lesson.seats + "席)";

  /* 参加人数の選択肢を残席数に合わせて作る(上限4名まで) */
  const numSel = document.getElementById("fNum");
  numSel.innerHTML = "";
  const max = Math.min(lesson.seats, 4);
  for(let i = 1; i <= max; i++){
    const op = document.createElement("option");
    op.value = i;
    op.textContent = i + "名";
    numSel.appendChild(op);
  }

  /* 確認・完了画面が出ていたら隠し、フォームを表示 */
  document.getElementById("confirm").classList.add("hide");
  document.getElementById("done").classList.add("hide");
  const booking = document.getElementById("booking");
  booking.classList.remove("hide");

  /* フォームの位置までするっとスクロール */
  booking.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* --------------------------------------------
   ② 入力チェック(バリデーション)
   -------------------------------------------- */
function validate(){
  let ok = true;

  const name = document.getElementById("fName");
  const mail = document.getElementById("fMail");
  const tel  = document.getElementById("fTel");

  /* 前回のエラー表示をリセット */
  [["eName", name], ["eMail", mail], ["eTel", tel]].forEach(([eid, el]) => {
    document.getElementById(eid).textContent = "";
    el.classList.remove("ng");
  });

  /* お名前:空でないこと */
  if(name.value.trim() === ""){
    document.getElementById("eName").textContent = "お名前を入力してください。";
    name.classList.add("ng"); ok = false;
  }

  /* メール:形式チェック(@と.を含む簡易判定) */
  const mailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!mailRe.test(mail.value.trim())){
    document.getElementById("eMail").textContent = "メールアドレスの形式が正しくないようです。";
    mail.classList.add("ng"); ok = false;
  }

  /* 電話:数字を取り出して10〜11桁ならOK */
  const digits = tel.value.replace(/[^0-9]/g, "");
  if(digits.length < 10 || digits.length > 11){
    document.getElementById("eTel").textContent = "お電話番号は数字10〜11桁で入力してください。";
    tel.classList.add("ng"); ok = false;
  }

  return ok;
}

/* --------------------------------------------
   ③ フォーム送信 → 確認画面へ
   -------------------------------------------- */
document.getElementById("bookForm").addEventListener("submit", function(e){
  e.preventDefault();               /* ページの再読み込みを止める */
  if(!validate()) return;           /* エラーがあればここで終了 */

  const rows = [
    ["レッスン",   selected.dateText + "<br>「" + selected.menu + "」"],
    ["お名前",     esc(document.getElementById("fName").value)],
    ["メール",     esc(document.getElementById("fMail").value)],
    ["お電話番号", esc(document.getElementById("fTel").value)],
    ["参加人数",   document.getElementById("fNum").value + "名"],
    ["ご要望",     esc(document.getElementById("fMemo").value) || "(なし)"]
  ];
  document.getElementById("confTable").innerHTML =
    rows.map(r => "<tr><th>" + r[0] + "</th><td>" + r[1] + "</td></tr>").join("");

  document.getElementById("booking").classList.add("hide");
  const conf = document.getElementById("confirm");
  conf.classList.remove("hide");
  conf.scrollIntoView({ behavior: "smooth", block: "start" });
});

/* 入力値を安全に表示するための変換(セキュリティの基本) */
function esc(s){
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

/* --------------------------------------------
   ④ 確認画面のボタン
   -------------------------------------------- */
function backToForm(){
  document.getElementById("confirm").classList.add("hide");
  document.getElementById("booking").classList.remove("hide");
}

function finalizeBooking(){
  /* ステップ3:予約データをサーバー(PHP)へ送信する */
  const payload = {
    key : selected.key,
    name: document.getElementById("fName").value.trim(),
    mail: document.getElementById("fMail").value.trim(),
    tel : document.getElementById("fTel").value.trim(),
    num : parseInt(document.getElementById("fNum").value),
    memo: document.getElementById("fMemo").value.trim()
  };

  fetch("api/reserve.php", {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify(payload)
  })
  .then(r => r.json())
  .then(res => {
    if(!res.ok){
      /* 満席・入力不備など、サーバーが断った場合 */
      alert("ご予約を確定できませんでした:\n" + res.error);
      backToForm();
      return;
    }

    /* 成功:画面側の残席も更新してカレンダーを描き直す */
    if(LESSONS[selected.key]) LESSONS[selected.key].seats = res.seatsLeft;
    renderCalendar();

    /* 予約番号を完了画面に表示 */
    document.getElementById("resId").textContent = res.id;

    document.getElementById("confirm").classList.add("hide");
    const done = document.getElementById("done");
    done.classList.remove("hide");
    done.scrollIntoView({ behavior: "smooth", block: "start" });
  })
  .catch(() => {
    alert(
      "サーバーに接続できませんでした。\n\n" +
      "この送信機能はPHPが動くサーバー上でのみ動作します。\n" +
      "(パソコンでファイルを直接開いている間は、ステップ2までの動きになります)"
    );
  });
}

/* --------------------------------------------
   ⑤ キャンセル・最初に戻る
   -------------------------------------------- */
function cancelBooking(){
  document.getElementById("booking").classList.add("hide");
  if(selectedTag) selectedTag.classList.remove("selected");
  selected = null; selectedTag = null;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetAll(){
  document.getElementById("done").classList.add("hide");
  document.getElementById("bookForm").reset();
  if(selectedTag) selectedTag.classList.remove("selected");
  selected = null; selectedTag = null;
  window.scrollTo({ top: 0, behavior: "smooth" });
}