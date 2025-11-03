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
  const keys = Object.keys(tetrominos); // Obter todas as chaves (tipos de peças)
  const rand = keys[Math.floor(Math.random()*keys.length)]; // Selecionar uma chave aleatória
  return { shape: tetrominos[rand], color: colors[keys.indexOf(rand)], x:3, y:0 };
}

let piece = randomPiece(); // A primeira peça aleatória
let nextPiece = randomPiece(); // A próxima peça aleatória

let score = 0; // Pontuação inicial
let lines = 0; // Linhas removidas inicialmente
let level = 0; // Nível do jogo
let startTime = Date.now(); // Hora de início do jogo
let gameOver = false; // Flag de game over
let paused = false; // Flag de pausa
let dropCounter = 0; // Contador para controle de queda de peça
let dropInterval = 1000; // Intervalo de tempo para a queda da peça (inicialmente 1 segundo)

// --- Funções de desenho ---
function drawBlock(x, y, color) {
  ctx.fillStyle = color; // Define a cor do bloco
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK); // Desenha o bloco no canvas
  ctx.strokeStyle = "black"; // Define a cor da borda
  ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK); // Desenha a borda do bloco
}

function drawBoard() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      drawBlock(c, r, board[r][c]); // Desenha cada bloco no tabuleiro
    }
  }
}

function drawPiece(p) {
  for (let r = 0; r < p.shape.length; r++) { // Itera sobre as linhas da peça
    for (let c = 0; c < p.shape[r].length; c++) { // Itera sobre as colunas da peça
      if (p.shape[r][c]) { // Se a célula da peça for preenchida
        drawBlock(p.x + c, p.y + r, p.color); // Desenha o bloco da peça
      }
    }
  }
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height); // Limpa o painel de próxima peça
  const offsetX = Math.floor((nextCanvas.width / BLOCK - nextPiece.shape[0].length) / 2); // Centraliza a peça no eixo X
  const offsetY = Math.floor((nextCanvas.height / BLOCK - nextPiece.shape.length) / 2); // Centraliza a peça no eixo Y

  for (let r = 0; r < nextPiece.shape.length; r++) {
    for (let c = 0; c < nextPiece.shape[r].length; c++) {
      if (nextPiece.shape[r][c]) { // Se a célula da próxima peça for preenchida
        nextCtx.fillStyle = nextPiece.color; // Define a cor da próxima peça
        nextCtx.fillRect((c + offsetX) * BLOCK, (r + offsetY) * BLOCK, BLOCK, BLOCK); // Desenha o bloco da próxima peça
        nextCtx.strokeStyle = "black"; // Define a borda da peça
        nextCtx.strokeRect((c + offsetX) * BLOCK, (r + offsetY) * BLOCK, BLOCK, BLOCK); // Desenha a borda do bloco
      }
    }
  }
}

// --- Movimento ---
function moveDown() {
  if (gameOver || paused) return; // Não move se o jogo estiver pausado ou terminado

  piece.y++; // Move a peça para baixo
  if (collision()) { // Verifica se ocorreu uma colisão
    piece.y--; // Se houver colisão, reverte o movimento
    lockPiece(); // "Trava" a peça no tabuleiro
    piece = nextPiece; // A peça atual se torna a próxima peça
    nextPiece = randomPiece(); // Gera uma nova próxima peça
    if (collision()) { // Se a nova peça colidir com o tabuleiro
      gameOver = true; // Fim de jogo
      showGameOver(); // Exibe a tela de Game Over
    }
  }
}

function move(dir) {
  if (gameOver || paused) return; // Não move se o jogo estiver pausado ou terminado

  piece.x += dir; // Move a peça na direção especificada
  if (collision()) piece.x -= dir; // Reverte o movimento se houver colisão
}

function rotate() {
  if (gameOver || paused) return; // Não rotaciona se o jogo estiver pausado ou terminado
  const N = piece.shape.length; // Número de linhas da peça
  const M = piece.shape[0].length; // Número de colunas da peça
  let rotated = []; // Nova matriz para a peça rotacionada
  for (let c = 0; c < M; c++) {
    rotated[c] = [];
    for (let r = N - 1; r >= 0; r--) {
      rotated[c][N - 1 - r] = piece.shape[r][c]; // Rotaciona a matriz 90 graus
    }
  }
  let backup = piece.shape; // Faz backup da forma original da peça
  piece.shape = rotated; // Atualiza a forma da peça com a versão rotacionada
  if (collision()) piece.shape = backup; // Se houver colisão, restaura a peça original
}

// --- Colisão e fixação ---
function collision() {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        let nx = piece.x + c; // Nova posição X
        let ny = piece.y + r; // Nova posição Y
        if (nx < 0 || nx >= COLS || ny >= ROWS || board[ny][nx] !== "black") return true; // Verifica limites e colisão com peças existentes
      }
    }
  }
  return false;
}

function lockPiece() {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        board[piece.y + r][piece.x + c] = piece.color; // Preenche a posição com a cor da peça
      }
    }
  }
  clearLines();
}

function clearLines() {
  let linesCleared = 0; // Contador de linhas removidas
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== "black")) { // Verifica se a linha está completa
      board.splice(r, 1); // Remove a linha
      board.unshift(Array(COLS).fill("black")); // Adiciona uma nova linha preta no topo
      linesCleared++; // Incrementa o contador de linhas removidas
      r++; // Ajusta o índice para verificar a linha nova
    }
  }
  if (linesCleared > 0) {
    const points = [0, 40, 100, 300, 1200]; // Pontuação por número de linhas removidas
    score += points[linesCleared] * (level + 1); // Atualiza a pontuação
    lines += linesCleared; // Atualiza o número de linhas removidas
    level = Math.floor(lines / 10); // Aumenta o nível após cada 10 linhas
    dropInterval = Math.max(100, 1000 - level * 50); // Acelera a queda das peças conforme o nível
  }
}

// --- Reset ---
// Reseta o estado do jogo para o início
function reset() {
  board = Array.from({length: ROWS}, () => Array(COLS).fill("black")); // Limpa o tabuleiro
  score = 0; lines = 0; level = 0; // Reseta os pontos, linhas e nível
  piece = randomPiece(); // Gera uma nova peça
  nextPiece = randomPiece(); // Gera a próxima peça
  startTime = Date.now(); // Reseta o tempo
  gameOver = false; // Desmarca o fim de jogo
  paused = false; // Desmarca a pausa
  dropCounter = 0; // Reseta o contador de queda
  dropInterval = 1000; // Reseta o intervalo de queda
  hideGameOver(); // Esconde a tela de game over
}

// --- Atualizar tempo ---
function updateTime(){
  if(gameOver || paused) return; // Não atualiza o tempo se o jogo estiver pausado ou terminado
  const elapsed = Math.floor((Date.now() - startTime)/1000); // Calcula o tempo passado em segundos
  const minutes = String(Math.floor(elapsed/60)).padStart(2,"0"); // Converte para minutos com 2 dígitos
  const seconds = String(elapsed%60).padStart(2,"0"); // Converte para segundos com 2 dígitos
  timeEl.textContent = `${minutes}:${seconds}`; // Exibe o tempo no painel
} 

// --- Desenhar ---
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height); // Limpa o canvas
  drawBoard(); // Desenha o tabuleiro
  drawPiece(piece);  // Desenha a peça atual
  drawNext(); // Desenha a próxima peça
  
  if(paused){
    ctx.save(); // Salva o estado atual do contexto 
    ctx.fillStyle = "rgba(0,0,0,0.5)"; // Define o fundo escuro semitransparente
    ctx.fillRect(0,0,canvas.width,canvas.height);  // Desenha o fundo escuro
    ctx.font = "700 32px Orbitron"; // Define a fonte para a mensagem de pausa
    ctx.fillStyle = "#2778af";// Define a cor da mensagem
    ctx.textAlign = "center"; // Alinha o texto no centro
    ctx.fillText("PAUSED", canvas.width/2, canvas.height/2); // Desenha o texto "PAUSED" no centro
    ctx.restore(); // Restaura o estado do contexto
  }
 // Atualiza os painéis de pontuação, linhas e nível
  scoreEl.textContent = score.toString().padStart(6,"0");
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

// --- Game Over ---
function showGameOver(){ gameOverScreen.style.display = "flex"; }
function hideGameOver(){ gameOverScreen.style.display = "none"; }

// --- Controles ---
document.addEventListener("keydown", e => {
  if(gameOver && e.key.toLowerCase() === "r"){ // Reinicia o jogo se pressionado 'r' após game over
    reset();
    return;
  }

  if(e.key.toLowerCase() === "p"){
    paused = !paused; // alterna pausa/despausa
  }

  if(paused || gameOver) return; // bloqueia controles
  
  if(e.key === "ArrowLeft") move(-1);  // Move a peça para a esquerda
  if(e.key === "ArrowRight") move(1); // Move a peça para a direita
  if(e.key === "ArrowDown") moveDown(); // Move a peça para baixo
  if(e.code === "KeyZ" || e.code === "Space") rotate(); // Rotaciona a peça 
});

// --- Loop principal ---
let lastTime = 0;
function update(time = 0){
  const deltaTime = time - lastTime;
  lastTime = time;

  if(!paused && !gameOver){
    dropCounter += deltaTime; // Aumenta o contador de queda de peça
    if(dropCounter > dropInterval){  // Se o intervalo de queda for atingido
      moveDown(); // Move a peça para baixo
      dropCounter = 0; // Reseta o contador
    }
    updateTime();  // Atualiza o tempo do jogo
  }

  draw();
  requestAnimationFrame(update); // Chama a próxima atualização do quadro
}

update();
