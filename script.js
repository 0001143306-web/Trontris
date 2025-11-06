// ===== TROCA DE TELAS =====
function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screen + "-screen").classList.add('active');
}

// ===== POPUP CONFIGURAÇÕES =====
const settingsPopup = document.getElementById("settings-popup");
function openSettings() { settingsPopup.classList.add("active"); }
function closeSettings() { settingsPopup.classList.remove("active"); }

// ===== MÚSICA =====
const bgMusic = document.getElementById("bg-music");
const musicButton = document.getElementById("toggle-music");
let musicOn = false;

function toggleMusic(){
  musicOn = !musicOn;
  if(musicOn){
    bgMusic.play();
    musicButton.textContent = "🔊 Desligar";
  } else {
    bgMusic.pause();
    musicButton.textContent = "🔇 Ligar";
  }
}

function adjustVolume(v){ bgMusic.volume = v; }


// ==========================
// CANVAS & ELEMENTOS
// ==========================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const timeEl = document.getElementById("time");
const gameOverScreen = document.getElementById("game-over");

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

let board = Array.from({length: ROWS}, () => Array(COLS).fill("black"));

const tetrominos = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]],
};

const colors = ["cyan","yellow","purple","green","red","blue","orange"];

function randomPiece(){
  const keys = Object.keys(tetrominos);
  const rand = keys[Math.floor(Math.random()*keys.length)];
  return { shape: tetrominos[rand].map(r=>[...r]), color: colors[keys.indexOf(rand)], x:3, y:0 };
}

let piece = randomPiece();
let nextPiece = randomPiece();

let score = 0, lines = 0, level = 0;
let startTime = Date.now();
let gameOver = false;
let paused = false;
let dropCounter = 0;
let dropInterval = 1000;

// ==========================
// DESENHO
// ==========================
function drawBlock(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = "black";
  ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
}

function drawBoard() {
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      drawBlock(c, r, board[r][c]);
    }
  }
}

function drawPiece(p) {
  p.shape.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val) drawBlock(p.x + c, p.y + r, p.color);
    });
  });
}

function drawNext(){
  nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);

  const shapeW = nextPiece.shape[0].length;
  const shapeH = nextPiece.shape.length;

  const offX = Math.floor((nextCanvas.width/BLOCK - shapeW)/2);
  const offY = Math.floor((nextCanvas.height/BLOCK - shapeH)/2);

  nextPiece.shape.forEach((row, r) => {
    row.forEach((val, c) => {
      if(val){
        nextCtx.fillStyle = nextPiece.color;
        nextCtx.fillRect((c+offX)*BLOCK,(r+offY)*BLOCK,BLOCK,BLOCK);
        nextCtx.strokeStyle="black";
        nextCtx.strokeRect((c+offX)*BLOCK,(r+offY)*BLOCK,BLOCK,BLOCK);
      }
    });
  });
}

// ==========================
// MOVIMENTO & JOGO
// ==========================
function collision(){
  for (let r=0;r<piece.shape.length;r++){
    for (let c=0;c<piece.shape[r].length;c++){
      if(piece.shape[r][c]){
        let nx = piece.x+c, ny = piece.y+r;
        if(nx<0||nx>=COLS||ny>=ROWS||board[ny][nx]!=="black") return true;
      }
    }
  }
  return false;
}

function moveDown(){
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
  piece.x+=dir;
  if(collision()) piece.x-=dir;
}

function rotate(){
  const clone = piece.shape.map(r=>[...r]);
  const rotated = clone[0].map((_,i)=>clone.map(row=>row[i]).reverse());
  piece.shape = rotated;
  if(collision()) piece.shape = clone;
}

function lockPiece(){
  piece.shape.forEach((row,r)=>{
    row.forEach((val,c)=>{
      if(val) board[piece.y+r][piece.x+c] = piece.color;
    });
  });
  clearLines();
}

function clearLines(){
  let linesCleared=0;
  for(let r=ROWS-1;r>=0;r--){
    if(board[r].every(c=>c!=="black")){
      board.splice(r,1);
      board.unshift(Array(COLS).fill("black"));
      linesCleared++;
      r++;
    }
  }
  if(linesCleared>0){
    const pts=[0,40,100,300,1200];
    score+=pts[linesCleared]*(level+1);
    lines+=linesCleared;
    level=Math.floor(lines/10);
    dropInterval=Math.max(100,1000-(level*50));
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

// ==========================
// TEMPO + DESENHO GERAL
// ==========================
function updateTime(){
  if(gameOver||paused) return;
  const t=Math.floor((Date.now()-startTime)/1000);
  timeEl.textContent = `${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawBoard();
  drawPiece(piece);
  drawNext();

  if(paused){
    ctx.fillStyle="rgba(0,0,0,0.6)";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#2778af";
    ctx.font="700 32px Orbitron";
    ctx.textAlign="center";
    ctx.fillText("PAUSED",canvas.width/2,canvas.height/2);
  }

  scoreEl.textContent = score.toString().padStart(6,"0");
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function showGameOver(){ gameOverScreen.style.display="flex"; }
function hideGameOver(){ gameOverScreen.style.display="none"; }

// ==========================
// CONTROLES
// ==========================
document.addEventListener("keydown",e=>{
  if(gameOver && e.key.toLowerCase()==="r"){ reset(); return; }
  if(e.key.toLowerCase()==="p"){ paused=!paused; return; }
  if(paused||gameOver) return;
  if(e.key==="ArrowLeft") move(-1);
  if(e.key==="ArrowRight") move(1);
  if(e.key==="ArrowDown") moveDown();
  if(e.code==="Space"||e.code==="KeyZ") rotate();
}
);

// ==========================
// LOOP
// ==========================
let lastTime=0;
function update(time=0){
  const delta=time-lastTime;
  lastTime=time;
  if(!paused&&!gameOver){
    dropCounter+=delta;
    if(dropCounter>dropInterval){ moveDown(); dropCounter=0; }
    updateTime();
  }
  draw();
  requestAnimationFrame(update);
}
update();
// ===== DESBLOQUEIO DE ÁUDIO =====
document.addEventListener("click", () => {
  if (bgMusic.paused && musicOn) {
    bgMusic.play().catch(()=>{});
  }
}, { once: true });
