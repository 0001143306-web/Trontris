// ======= VARIÁVEIS GLOBAIS E ELEMENTOS =======
let lastScreen = "menu";

const settingsPopup = document.getElementById("settings-popup");
const bgMusic = document.getElementById("bg-music");
const musicButton = document.getElementById("toggle-music");
const volumeRange = document.getElementById("volume");
const nomeInput = document.getElementById("nome");

const playBtn = document.getElementById("play-btn");
if (playBtn) playBtn.setAttribute("type", "button"); // ← Correção importante

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

if (canvas && !canvas.hasAttribute("tabindex")) canvas.setAttribute("tabindex", "0"); // ← Permite focar para evitar reset ao apertar Space

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const timeEl = document.getElementById("time");
const gameOverScreen = document.getElementById("game-over");

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

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
let musicOn = false;
try { const savedMusicOn = localStorage.getItem("trontrisMusicOn"); if (savedMusicOn !== null) musicOn = savedMusicOn === "true"; } catch(e){}

function updateMusicButtonLabel(){
  if (!musicButton) return;
  musicButton.textContent = musicOn ? "🔇 Desligar" : "🔊 Ligar";
}

async function tryPlayMusic(){
  if (!bgMusic) return;
  try {
    if (volumeRange) bgMusic.volume = parseFloat(volumeRange.value || 0.5);
    await bgMusic.play();
    musicOn = true;
  } catch (err) { musicOn = false; }
  updateMusicButtonLabel();
  try { localStorage.setItem("trontrisMusicOn", musicOn ? "true" : "false"); } catch(e){}
}

function stopMusic(){
  if (!bgMusic) return;
  bgMusic.pause();
  bgMusic.currentTime = 0;
  musicOn = false;
  updateMusicButtonLabel();
  try { localStorage.setItem("trontrisMusicOn", "false"); } catch(e){}
}

if (musicButton && bgMusic) {
  musicButton.addEventListener("click", async () => {
    if (!musicOn) await tryPlayMusic();
    else stopMusic();
  });
}

function unlockAudioOnFirstGesture(){
  const onFirst = async () => {
    if (musicOn && bgMusic && bgMusic.paused) {
      try { await bgMusic.play(); updateMusicButtonLabel(); } catch(err){}
    }
    document.removeEventListener("pointerdown", onFirst);
  };
  document.addEventListener("pointerdown", onFirst, { once: true });
}

if (volumeRange && bgMusic) {
  volumeRange.addEventListener("input", e => {
    const v = parseFloat(e.target.value);
    bgMusic.volume = v;
    try { localStorage.setItem("trontrisMusicVolume", String(v)); } catch(e){}
  });
}

// ====== FUNÇÕES ======
function randomPiece(){
  const keys = Object.keys(tetrominos);
  const randKey = keys[Math.floor(Math.random()*keys.length)];
  return { shape: tetrominos[randKey].map(r => r.slice()), color: colors[randKey], x: 3, y: 0 };
}

function showScreen(screen) {
  const current = document.querySelector(".screen.active")?.id?.replace("-screen","");
  lastScreen = current || "menu";
  if ((screen === "controls" || screen === "settings" || screen === "ranking") && lastScreen === "game") paused = true;
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(screen + "-screen")?.classList.add("active");
  if (screen === "ranking") renderRanking();
}

function returnFromControls() {
  if (lastScreen === "game") paused = false;
  showScreen(lastScreen);
}

// Adicionei openSettings e closeSettings (evitavam ReferenceError)
function openSettings() {
  if (!settingsPopup) return;
  settingsPopup.classList.add("active");
  settingsPopup.setAttribute("aria-hidden", "false");
  // se o jogo estiver ativo, pausar
  if (document.getElementById("game-screen")?.classList.contains("active")) paused = true;
}

function closeSettings() {
  if (!settingsPopup) return;
  settingsPopup.classList.remove("active");
  settingsPopup.setAttribute("aria-hidden", "true");
  // voltar à execução se estivermos no jogo
  if (document.getElementById("game-screen")?.classList.contains("active")) paused = false;
}

function drawBlock(ctxRef, x, y, size, color) {
  if (!ctxRef) return;
  ctxRef.fillStyle = color;
  ctxRef.fillRect(x * size, y * size, size, size);
  ctxRef.strokeStyle = "#000000";
  ctxRef.strokeRect(x * size, y * size, size, size);
}

function drawBoard() {
  if (!ctx) return;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, BLOCK, board[r][c]);
}

function drawPiece(p) {
  if (!p || !ctx) return;
  p.shape.forEach((row, r) => row.forEach((val, c) => val && drawBlock(ctx, p.x + c, p.y + r, BLOCK, p.color)));
}

function drawNext(){
  if (!nextCtx || !nextPiece) return;
  nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
  const maxCells = 4;
  const size = Math.floor(Math.min(nextCanvas.width, nextCanvas.height) / maxCells);
  const shapeW = nextPiece.shape[0].length, shapeH = nextPiece.shape.length;
  const offX = Math.floor((maxCells - shapeW) / 2), offY = Math.floor((maxCells - shapeH) / 2);
  nextCtx.fillStyle = "#000"; nextCtx.fillRect(0,0,nextCanvas.width,nextCanvas.height);
  nextPiece.shape.forEach((row, r) =>
    row.forEach((val, c) => {
      if(val){
        const x = (c+offX)*size, y=(r+offY)*size;
        nextCtx.fillStyle = nextPiece.color;
        nextCtx.fillRect(x,y,size,size);
        nextCtx.strokeStyle="black"; nextCtx.strokeRect(x,y,size,size);
      }
    })
  );
}

function collision(p = piece){
  if (!p) return false;
  for (let r=0;r<p.shape.length;r++)
    for (let c=0;c<p.shape[r].length;c++)
      if(p.shape[r][c]){
        let nx=p.x+c, ny=p.y+r;
        if(nx<0||nx>=COLS||ny>=ROWS) return true;
        if(ny>=0 && board[ny][nx] !== "black") return true;
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
    if(collision()){ gameOver=true; showGameOver(); }
  }
}

function move(dir){ if(!piece) return; piece.x+=dir; if(collision()) piece.x-=dir; }

function rotate(){
  if(!piece) return;
  const rotated = piece.shape[0].map((_,i)=>piece.shape.map(row=>row[i]).reverse());
  const test = {...piece,shape:rotated};
  if(!collision(test)) piece.shape=rotated;
}

function lockPiece(){
  if(!piece) return;
  piece.shape.forEach((row,r)=>
    row.forEach((val,c)=>{
      if(val){
        const y=piece.y+r, x=piece.x+c;
        if(y>=0&&y<ROWS&&x>=0&&x<COLS) board[y][x]=piece.color;
      }
    })
  );
  clearLines();
}

function clearLines(){
  let count=0;
  for(let r=ROWS-1;r>=0;r--){
    if(board[r].every(c=>c!=="black")){
      board.splice(r,1);
      board.unshift(Array(COLS).fill("black"));
      count++; r++;
    }
  }
  if(count){
    const pts=[0,40,100,300,1200]; score+=pts[count]*(level+1);
    lines+=count; level=Math.floor(lines/10); dropInterval=Math.max(100,1000-(level*50));
  }
}

function reset(){
  board = Array.from({length:ROWS},()=>Array(COLS).fill("black"));
  score=0; lines=0; level=0;
  piece=randomPiece();
  nextPiece=randomPiece();
  startTime=Date.now();
  gameOver=false; paused=false;
  dropCounter=0; dropInterval=1000;
  hideGameOver();
}

function updateTime(){
  if(gameOver) return;
  if (!timeEl) return;
  const t=Math.floor((Date.now()-startTime)/1000);
  timeEl.textContent=`${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;
}

function draw(){
  if (!ctx) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawBoard(); drawPiece(piece); drawNext();
  if(paused){ ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#2778af"; ctx.font="700 32px Orbitron, sans-serif"; ctx.textAlign="center"; ctx.fillText("PAUSED",canvas.width/2,canvas.height/2);
  }
  if (scoreEl) scoreEl.textContent=score.toString().padStart(6,"0");
  if (linesEl) linesEl.textContent=lines;
  if (levelEl) levelEl.textContent=level;
}

function showGameOver(){ if(gameOverScreen) gameOverScreen.style.display="flex"; saveScoreToRanking(score); }
function hideGameOver(){ if(gameOverScreen) gameOverScreen.style.display="none"; }

document.addEventListener("keydown", e => {

  // Bloqueia espaço clicando botões (previne ativação por teclado)
  try {
    const activeTag = document.activeElement?.tagName;
    if(e.code==="Space" && (activeTag === "BUTTON" || activeTag === "INPUT" || activeTag === "A")) e.preventDefault();
  } catch(e){}

  if (gameOver && e.key.toLowerCase()==="r") { reset(); return; }
  if (e.key.toLowerCase()==="p") { paused = !paused; return; }
  if (paused||gameOver) return;

  if (e.key==="ArrowLeft") move(-1);
  if (e.key==="ArrowRight") move(1);
  if (e.key==="ArrowDown") moveDown();
  if (e.code==="KeyZ") rotate();
});

function saveScoreToRanking(finalScore){
  let name=(nomeInput && nomeInput.value && nomeInput.value.trim()) || prompt("Digite seu nome:") || "Jogador";
  let ranking=JSON.parse(localStorage.getItem("trontrisRanking"))||[];
  ranking.push({name,score:finalScore});
  ranking.sort((a,b)=>b.score-a.score);
  ranking=ranking.slice(0,10);
  try { localStorage.setItem("trontrisRanking",JSON.stringify(ranking)); } catch(e){}
}

function renderRanking(){
  const list=document.getElementById("ranking-list");
  if(!list) return;
  list.innerHTML="";
  (JSON.parse(localStorage.getItem("trontrisRanking"))||[]).forEach((p,i)=>{
    const li=document.createElement("li"); li.textContent=`${i+1}. ${p.name} — ${p.score}`; list.appendChild(li);
  });
}

let lastTime=0;
function update(time=0){
  const delta=time-lastTime; lastTime=time;
  if(!paused&&!gameOver){
    dropCounter+=delta;
    if(dropCounter>dropInterval){ moveDown(); dropCounter=0; }
    updateTime();
  }
  draw();
  requestAnimationFrame(update);
}

// ====== EVENTOS ======
if(playBtn){
  playBtn.addEventListener("click", async ()=>{
    const nome=(nomeInput&&nomeInput.value&&nomeInput.value.trim());
    if(!nome){ alert("⚠️ Insira seu nome antes de jogar!"); if(nomeInput) nomeInput.focus(); return; }
    try { localStorage.setItem("trontrisPlayerName",nome); } catch(e){}
    reset(); showScreen("game");
    if(musicOn) tryPlayMusic();
    try { playBtn.blur(); if (canvas) canvas.focus(); } catch(e){}
  });
}

if(controlsBtn) controlsBtn.addEventListener("click",()=>showScreen("controls"));
if(controlsBtn2) controlsBtn2.addEventListener("click",()=>showScreen("controls"));
if(controlsBack) controlsBack.addEventListener("click",()=>returnFromControls());

if(settingsBtn) settingsBtn.addEventListener("click",openSettings);
if(settingsBtn2) settingsBtn2.addEventListener("click",openSettings);
if(settingsClose) settingsClose.addEventListener("click",closeSettings);

if(exitBtn){
  exitBtn.addEventListener("click",()=>{
    try { document.activeElement?.blur(); } catch(e){}
    paused=true;
    showScreen("menu");
  });
}

if(rankingBtn) rankingBtn.addEventListener("click",()=>showScreen("ranking"));
if(rankingBack) rankingBack.addEventListener("click",()=>showScreen("menu"));

if(settingsPopup){
  settingsPopup.addEventListener("click",e=>{ if(e.target===settingsPopup) closeSettings(); });
}

// iniciar
(function init(){
  try { const savedName=localStorage.getItem("trontrisPlayerName"); if(savedName && nomeInput) nomeInput.value=savedName; } catch(e){}
  piece=randomPiece(); nextPiece=randomPiece();
  updateMusicButtonLabel(); unlockAudioOnFirstGesture(); renderRanking();
  requestAnimationFrame(update);

})();
