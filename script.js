// ======= VARIÁVEIS GLOBAIS E ELEMENTOS =======
let lastScreen = "menu";

const settingsPopup = document.getElementById("settings-popup");
const bgMusic = document.getElementById("bg-music");
const musicButton = document.getElementById("toggle-music");
const volumeRange = document.getElementById("volume");
const nomeInput = document.getElementById("nome");

const playBtn = document.getElementById("play-btn");
const controlsBtn = document.getElementById("controls-btn");
const controlsBtn2 = document.getElementById("controls-btn-2");
const settingsBtn = document.getElementById("settings-btn");
const settingsBtn2 = document.getElementById("settings-btn-2");
const settingsClose = document.getElementById("settings-close");
const exitBtn = document.getElementById("exit-btn");
const rankingBtn = document.getElementById("ranking-btn");
const rankingBack = document.getElementById("ranking-back");
const controlsBack = document.getElementById("controls-back");

const canvas = document.getElementById("game");
const ctx = canvas ? canvas.getContext("2d") : null;
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas ? nextCanvas.getContext("2d") : null;

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const timeEl = document.getElementById("time");
const gameOverScreen = document.getElementById("game-over");

const COLS = 10;
const ROWS = 20;
const BLOCK = 30; // tamanho em pixels de um bloco no canvas principal

// ====== TETROMINOS & CORES ======
const tetrominos = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]],
};

const colors = {
  I: "cyan",
  O: "yellow",
  T: "purple",
  S: "green",
  Z: "red",
  J: "blue",
  L: "orange"
};

// ====== ESTADO DO JOGO ======
let board = Array.from({length: ROWS}, () => Array(COLS).fill("black"));
let piece = null;
let nextPiece = null;
let score = 0, lines = 0, level = 0;
let startTime = Date.now();
let gameOver = false;
let paused = false;
let dropCounter = 0;
let dropInterval = 1000;

// ====== MÚSICA ======
let musicOn = false; // estado lógico
// Carregar preferência anterior (opcional)
try {
  const savedMusicOn = localStorage.getItem("trontrisMusicOn");
  if (savedMusicOn !== null) musicOn = savedMusicOn === "true";
} catch(e){}

function updateMusicButtonLabel(){
  if (!musicButton) return;
  musicButton.textContent = musicOn ? "🔇 Desligar" : "🔊 Ligar";
}

async function tryPlayMusic(){
  if (!bgMusic) return;
  try {
    // garante que o volume esteja aplicado antes de tocar
    if (volumeRange) bgMusic.volume = parseFloat(volumeRange.value || 0.5);
    await bgMusic.play();
    musicOn = true;
    updateMusicButtonLabel();
    localStorage.setItem("trontrisMusicOn", "true");
  } catch (err) {
    // Se o navegador bloqueou, informar no console e sugerir ação ao usuário
    console.warn("bgMusic.play() foi bloqueado pelo navegador:", err);
    updateMusicButtonLabel();
    // Não usar alert intrusivo sempre; apenas quando for toggle direto
    // mas fornecemos uma dica visual via console e label
  }
}

function stopMusic(){
  if (!bgMusic) return;
  try {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  } catch (err) {
    console.warn("Erro ao pausar música:", err);
  }
  musicOn = false;
  updateMusicButtonLabel();
  localStorage.setItem("trontrisMusicOn", "false");
}

// configurar listener do botão (se existir)
if (musicButton && bgMusic) {
  musicButton.addEventListener("click", async (e) => {
    // tentar tocar (isso conta como interação do usuário)
    if (!musicOn) {
      try {
        await tryPlayMusic();
      } catch (err) {
        console.warn(err);
      }
      // Se não conseguiu, avise o usuário (apenas se continuar pausado)
      if (bgMusic.paused) {
        // instrução amigável no console e pelo texto do botão
        console.info("Recomendação: clique em algum lugar da página para permitir reprodução de áudio se o navegador bloquear.");
        // opcional: foco no botão instruindo usuário
      }
    } else {
      stopMusic();
    }
  });
}

// desbloquear áudio na primeira interação do usuário (pointerdown é abrangente)
function unlockAudioOnFirstGesture(){
  // se a música estiver marcada para ligar e o áudio estiver pausado, tente tocar ao primeiro gesto
  const onFirst = async () => {
    if (musicOn && bgMusic && bgMusic.paused) {
      try {
        await bgMusic.play();
        updateMusicButtonLabel();
      } catch (err) {
        console.warn("Tentativa de desbloquear áudio falhou:", err);
      }
    }
    // remover o listener após primeira interação
    document.removeEventListener("pointerdown", onFirst);
  };
  document.addEventListener("pointerdown", onFirst, { once: true });
}

// volume slider
if (volumeRange && bgMusic) {
  volumeRange.addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    bgMusic.volume = v;
    try { localStorage.setItem("trontrisMusicVolume", String(v)); } catch(e){}
  });
  // carregar volume salvo
  try {
    const sv = localStorage.getItem("trontrisMusicVolume");
    if (sv !== null && volumeRange) {
      volumeRange.value = sv;
      if (bgMusic) bgMusic.volume = parseFloat(sv);
    } else if (bgMusic && volumeRange) {
      bgMusic.volume = parseFloat(volumeRange.value || 0.5);
    }
  } catch(e){ }
}

// ====== FUNÇÕES DE UTILIDADE ======
function randomPiece(){
  const keys = Object.keys(tetrominos);
  const randKey = keys[Math.floor(Math.random()*keys.length)];
  // clonar shape para não modificar original
  const shape = tetrominos[randKey].map(r => r.slice());
  return { shape, color: colors[randKey], x: 3, y: 0 };
}

function showScreen(screen) {
  const current = document.querySelector(".screen.active")?.id?.replace("-screen", "") || "menu";

  // Guardar tela anterior (para voltar)
  lastScreen = current;

  // Pausar se abrindo configurações ou controles a partir do jogo
  if ((screen === "controls" || screen === "settings" || screen === "ranking") && current === "game") {
    paused = true;
  }

  // Mostrar a tela
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(screen + "-screen");
  if (target) target.classList.add("active");

  // Se for ranking, atualizar lista
  if (screen === "ranking") renderRanking();
}

function returnFromControls() {
  // Voltar para a tela anterior corretamente
  if (lastScreen === "game") paused = false;
  showScreen(lastScreen);
}

function openSettings() {
  if (!settingsPopup) return;
  settingsPopup.classList.add("active");
  settingsPopup.setAttribute("aria-hidden", "false");

  // Pausa se o jogo estiver ativo
  if (document.getElementById("game-screen").classList.contains("active")) {
    paused = true;
  }
}

function closeSettings() {
  if (!settingsPopup) return;
  settingsPopup.classList.remove("active");
  settingsPopup.setAttribute("aria-hidden", "true");

  // Só despausar se estivermos no jogo
  if (document.getElementById("game-screen").classList.contains("active")) {
    paused = false;
  }
}

// ====== DESENHO ======
function drawBlock(ctxRef, x, y, size, color) {
  ctxRef.fillStyle = color;
  ctxRef.fillRect(x * size, y * size, size, size);
  ctxRef.strokeStyle = "#000000";
  ctxRef.strokeRect(x * size, y * size, size, size);
}

function drawBoard() {
  if (!ctx) return;
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      drawBlock(ctx, c, r, BLOCK, board[r][c]);
    }
  }
}

function drawPiece(p) {
  if (!p || !ctx) return;
  p.shape.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val) drawBlock(ctx, p.x + c, p.y + r, BLOCK, p.color);
    });
  });
}

function drawNext(){
  if (!nextCtx || !nextPiece) return;
  // desenhar o próximo em um grid adaptado ao canvas "next"
  nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);

  // tamanho dinâmico do bloco para o canvas "next"
  const maxCells = 4; // tetrominos cabem em 4x4
  const size = Math.floor(Math.min(nextCanvas.width, nextCanvas.height) / maxCells);

  const shapeW = nextPiece.shape[0].length;
  const shapeH = nextPiece.shape.length;

  const offX = Math.floor((maxCells - shapeW) / 2);
  const offY = Math.floor((maxCells - shapeH) / 2);

  // limpar fundo
  nextCtx.fillStyle = "#000";
  nextCtx.fillRect(0,0,nextCanvas.width,nextCanvas.height);

  nextPiece.shape.forEach((row, r) => {
    row.forEach((val, c) => {
      if(val){
        const drawX = (c + offX) * size;
        const drawY = (r + offY) * size;
        nextCtx.fillStyle = nextPiece.color;
        nextCtx.fillRect(drawX, drawY, size, size);
        nextCtx.strokeStyle = "black";
        nextCtx.strokeRect(drawX, drawY, size, size);
      }
    });
  });
}

// ====== LÓGICA DO JOGO ======
function collision(tempPiece = piece){
  if (!tempPiece) return false;
  for (let r=0;r<tempPiece.shape.length;r++){
    for (let c=0;c<tempPiece.shape[r].length;c++){
      if(tempPiece.shape[r][c]){
        let nx = tempPiece.x + c, ny = tempPiece.y + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx] !== "black") return true;
      }
    }
  }
  return false;
}

function moveDown(){
  if (!piece) return;
  piece.y++;
  if(collision()){
    piece.y--;
    lockPiece();
    piece = nextPiece;
    nextPiece = randomPiece();
    if(collision()){
      gameOver = true;
      showGameOver();
    }
  }
}

function move(dir){
  if (!piece) return;
  piece.x += dir;
  if(collision()) piece.x -= dir;
}

function rotate(){
  if (!piece) return;
  const clone = piece.shape.map(r=>[...r]);
  const rotated = clone[0].map((_,i)=>clone.map(row=>row[i]).reverse());
  const temp = { ...piece, shape: rotated };
  if(!collision(temp)) piece.shape = rotated;
}

function lockPiece(){
  if (!piece) return;
  piece.shape.forEach((row,r)=> {
    row.forEach((val,c)=> {
      if(val){
        const y = piece.y + r;
        const x = piece.x + c;
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
          board[y][x] = piece.color;
        }
      }
    });
  });
  clearLines();
}

function clearLines(){
  let linesCleared = 0;
  for(let r = ROWS - 1; r >= 0; r--){
    if(board[r].every(c => c !== "black")){
      board.splice(r, 1);
      board.unshift(Array(COLS).fill("black"));
      linesCleared++;
      r++; // checar novamente mesma linha após shift
    }
  }
  if(linesCleared > 0){
    const pts = [0,40,100,300,1200];
    score += pts[linesCleared] * (level + 1);
    lines += linesCleared;
    level = Math.floor(lines / 10);
    dropInterval = Math.max(100, 1000 - (level * 50));
  }
}

function reset(){
  board = Array.from({length: ROWS}, () => Array(COLS).fill("black"));
  score = 0; lines = 0; level = 0;
  piece = randomPiece();
  nextPiece = randomPiece();
  startTime = Date.now();
  gameOver = false; paused = false;
  dropCounter = 0; dropInterval = 1000;
  hideGameOver();
}

// ====== TEMPO + DESENHO GERAL ======
function updateTime(){
  if(gameOver) return;
  const t = Math.floor((Date.now() - startTime) / 1000);
  timeEl.textContent = `${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;
}

function draw(){
  if (!ctx) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawBoard();
  drawPiece(piece);
  drawNext();

  if(paused){
    ctx.fillStyle="rgba(0,0,0,0.6)";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#2778af";
    ctx.font="700 32px Orbitron, sans-serif";
    ctx.textAlign="center";
    ctx.fillText("PAUSED",canvas.width/2,canvas.height/2);
  }

  if (scoreEl) scoreEl.textContent = score.toString().padStart(6,"0");
  if (linesEl) linesEl.textContent = lines;
  if (levelEl) levelEl.textContent = level;
}

// ====== GAME OVER UI ======
function showGameOver(){
  if (gameOverScreen) {
    gameOverScreen.style.display = "flex";
    gameOverScreen.setAttribute("aria-hidden", "false");
  }
  saveScoreToRanking(score);
}

function hideGameOver(){
  if (gameOverScreen) {
    gameOverScreen.style.display = "none";
    gameOverScreen.setAttribute("aria-hidden", "true");
  }
}

// ====== CONTROLES DO TECLADO ======
document.addEventListener("keydown", e => {
  // Quando game over, R reinicia
  if (gameOver && e.key.toLowerCase() === "r") { reset(); return; }
  // Toggle pause
  if (e.key.toLowerCase() === "p") { paused = !paused; return; }
  // Não processar controles se pausado ou game over
  if (paused || gameOver) return;

  if (e.key === "ArrowLeft") move(-1);
  if (e.key === "ArrowRight") move(1);
  if (e.key === "ArrowDown") moveDown();
  if (e.code === "Space" || e.code === "KeyZ") rotate();
});

// ====== RANKING ======
function saveScoreToRanking(finalScore) {
  // usar o nome do campo se preenchido, senão prompt
  let name = (nomeInput && nomeInput.value && nomeInput.value.trim()) ? nomeInput.value.trim() : null;
  if (!name) {
    name = prompt("Digite seu nome para o ranking:") || "Jogador";
  }

  let ranking = JSON.parse(localStorage.getItem("trontrisRanking")) || [];
  ranking.push({ name, score: finalScore });
  ranking.sort((a,b) => b.score - a.score);
  ranking = ranking.slice(0, 10);
  localStorage.setItem("trontrisRanking", JSON.stringify(ranking));
}

function renderRanking() {
  const list = document.getElementById("ranking-list");
  if (!list) return;
  list.innerHTML = "";

  let ranking = JSON.parse(localStorage.getItem("trontrisRanking")) || [];

  ranking.forEach((player, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${player.name} — ${player.score}`;
    list.appendChild(li);
  });
}

// ====== LOOP PRINCIPAL ======
let lastTime = 0;
function update(time = 0){
  const delta = time - lastTime;
  lastTime = time;
  if (!paused && !gameOver){
    dropCounter += delta;
    if (dropCounter > dropInterval){
      moveDown();
      dropCounter = 0;
    }
    updateTime();
  }
  draw();
  requestAnimationFrame(update);
}

// ====== EVENTOS DE BOTÕES ======
if (playBtn) {
  playBtn.addEventListener("click", async () => {
    const nome = (nomeInput && nomeInput.value) ? nomeInput.value.trim() : "";

    // SE O NOME ESTIVER VAZIO: NÃO JOGA
    if (nome === "") {
      alert("⚠️ Por favor, insira seu nome antes de jogar!");
      if (nomeInput) nomeInput.focus();
      return;
    }

    // Salva o nome para usar no ranking / exibição
    localStorage.setItem("trontrisPlayerName", nome);

    reset();
    showScreen("game");

    // Ao começar o jogo, se a preferência for ligar música, tente tocar
    if (musicOn) {
      try {
        await tryPlayMusic();
      } catch (err) {
        console.warn("Não foi possível iniciar música ao começar o jogo:", err);
      }
    }
  });
}

if (controlsBtn) controlsBtn.addEventListener("click", () => showScreen("controls"));
if (controlsBtn2) controlsBtn2.addEventListener("click", () => showScreen("controls"));
if (controlsBack) controlsBack.addEventListener("click", () => returnFromControls());

if (settingsBtn) settingsBtn.addEventListener("click", openSettings);
if (settingsBtn2) settingsBtn2.addEventListener("click", openSettings);
if (settingsClose) settingsClose.addEventListener("click", closeSettings);

if (exitBtn) exitBtn.addEventListener("click", () => showScreen("menu"));

if (rankingBtn) rankingBtn.addEventListener("click", () => showScreen("ranking"));
if (rankingBack) rankingBack.addEventListener("click", () => showScreen("menu"));

// fechar popup ao clicar fora da caixa
if (settingsPopup) {
  settingsPopup.addEventListener("click", (e) => {
    if (e.target === settingsPopup) closeSettings();
  });
}

// iniciar
(function init(){
  // carregar nome salvo (se houver)
  const savedName = localStorage.getItem("trontrisPlayerName");
  if(savedName && nomeInput) nomeInput.value = savedName;

  // inicial pieces
  piece = randomPiece();
  nextPiece = randomPiece();

  // garantir volume inicial
  try {
    const savedVol = localStorage.getItem("trontrisMusicVolume");
    if (savedVol !== null && bgMusic) bgMusic.volume = parseFloat(savedVol);
    else if (volumeRange && bgMusic) bgMusic.volume = parseFloat(volumeRange.value || 0.5);
  } catch(e){ if (volumeRange && bgMusic) bgMusic.volume = parseFloat(volumeRange.value || 0.5); }

  // atualizar label do botão de música conforme preferência
  updateMusicButtonLabel();

  // tentar desbloquear áudio na primeira interação (se o usuário tiver preferido música ligada)
  unlockAudioOnFirstGesture();

  // mostrar ranking carregado caso já exista
  renderRanking();

  // começar loop
  requestAnimationFrame(update);
})();
