const startStopButton = document.getElementById('startStopButton');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resolution = 20;
const rows = canvas.height / resolution;
const cols = canvas.width / resolution;
let audioCtx = new (window.AudioContext || window.webkitAudioContext);
let osc;
let gainNode;
let isRunning = false;
let grid = createGrid();
const FPS = 10;
let colors = ["#E6E6FA", "#D8BFD8", "#DDA0DD", "#EE82EE", "#DA70D6", "#FF00FF", "#BA55D3", "#9932CC", "#800080", "#9370DB", "#8A2BE2", "#9400D3", "#8B008B", "#4B0082", "#6A5ACD"];
let liveCellRatio = 50;

// Function to get a random color from the colors array
function getRandomColor() {
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
}

// create a 2D array to represent the grid
function createGrid() {
  return new Array(cols).fill(null)
    .map(() => new Array(rows).fill(null)
      .map(() => Math.floor(Math.random() * 2)));
}

// draw current state of the grid
function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * resolution;
      const y = j * resolution;

      if (grid[i][j] === 1) {
        let color = getRandomColor();
        ctx.fillStyle = color;
        ctx.fillRect(x, y, resolution, resolution);
      }
    }
  }
}

// update grid based on Conway's Game of Life rules
function updateGrid() {
  const newGrid = grid.map(row => [...row]);

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const neighbors = countNeighbors(grid, i, j);
      const currentCell = grid[i][j];

      // Apply rules of the Game of Life
      if (currentCell === 1 && (neighbors < 2 || neighbors > 3)) {
        newGrid[i][j] = 0; // Cell dies
      } else if (currentCell === 0 && neighbors === 3) {
        newGrid[i][j] = 1; // Cell becomes alive
      }
    }
  }

  // return newGrid;
  grid = newGrid;
}

// count the number of live neighbors for a given cell
function countNeighbors(grid, x, y) {
  let sum = 0;

  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const col = (x + i + cols) % cols;
      const row = (y + j + rows) % rows;
      sum += grid[col][row];
    }
  }

  sum -= grid[x][y];
  return sum;
}

// count alive cells in entire grid
function countAliveCells(grid) {
  let sum = 0;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      sum += grid[i][j]
    }
  }

  return sum;
}

// play note based on number of alive cells
function playNote(sum) {
  // sum: number of alive cells in the grid

  if (sum != 0 ){
    osc = audioCtx.createOscillator();
    osc.frequency.setValueAtTime(200+sum, audioCtx.currentTime);
    osc.type = "sine";
    gainNode = audioCtx.createGain();
    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start();
    
    gainNode.gain.setTargetAtTime(
      0.5,
      audioCtx.currentTime + 0.1,
      0.01
    );
    
    gainNode.gain.setTargetAtTime(
      0,
      audioCtx.currentTime + 0.2,
      0.01
    );
  }
}


// play kick drum sound
function playKickDrum(time) {
  // replicates the loud, quick attack and quick release of kick drum 

  // create oscillators
  let osc = audioCtx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = 40;
  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(0.001, time + 0.5);
  osc.start(time);
  osc.stop(time + 0.5);

  let osc2 = audioCtx.createOscillator();
  osc2.type = "sine";
  osc.frequency.value = 80;
  osc2.frequency.setValueAtTime(50, time);
  osc2.frequency.exponentialRampToValueAtTime(0.001, time + 0.5);
  osc2.start(time);
  osc2.stop(time + 0.5);


  // create gain
  let gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(1, time);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

  let gainNode2 = audioCtx.createGain();
  gainNode2.gain.setValueAtTime(1, time);
  gainNode2.gain.exponentialRampToValueAtTime(0.001, time + 0.5);  


  // connections
  osc.connect(gainNode);
  osc2.connect(gainNode2);
  gainNode.connect(audioCtx.destination);
  gainNode2.connect(audioCtx.destination);
  
}


// play snare drum sound
function playSnare(time) {

  // remove low frequencies to mimic snare sound
  let hpFilter = audioCtx.createBiquadFilter();
  hpFilter.type = "highpass";

  hpFilter.frequency.setValueAtTime(100, time);
  hpFilter.frequency.linearRampToValueAtTime(1000, time + 0.2);


  // create noise to put through filter
  noise = createNoise();
  noise.start(time);
  noise.stop(time + 0.2);
  

  // add triangle wave to create sharp sound
  let osc = audioCtx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = 100;
  osc.start(time);
  osc.stop(time + 0.2);


  // create gain nodes
  let gainNodeOsc = audioCtx.createGain();
  gainNodeOsc.gain.setValueAtTime(0.7, time);
  gainNodeOsc.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

  let gainNodeHPF = audioCtx.createGain();
  gainNodeHPF.gain.setValueAtTime(1, time);
  gainNodeHPF.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  

  // connections
  noise.connect(hpFilter).connect(gainNodeHPF).connect(audioCtx.destination);
  osc.connect(gainNodeOsc).connect(audioCtx.destination);
}


// play hi-hat sound
function playHiHat(time) {
  // bandpass filter
  let bandpass = audioCtx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 10000;

  // highpass filter 
  let highpass = audioCtx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 7000;

  // create gain node
  let gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.00001, time);
  gainNode.gain.exponentialRampToValueAtTime(1, time + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.3, time + 0.03);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);

  // create oscillators
  let fundamental = 40;
  let ratios = [2, 3, 4.16, 5.43, 6.79, 8.21];

  ratios.forEach(function(ratio) {

    let osc = audioCtx.createOscillator();
    osc.type = "square";
    osc.frequency.value = fundamental * ratio;
    osc.connect(bandpass);

    osc.start(time);
    osc.stop(time + 0.5);
  });

  // connections 
  bandpass.connect(highpass);
  highpass.connect(gainNode);
  gainNode.connect(audioCtx.destination);
}

// generate random noise
function createNoise() {

  let node = audioCtx.createBufferSource();
  let buffer = audioCtx.createBuffer(1, 4096, audioCtx.sampleRate);
  let data = buffer.getChannelData(0);

  for (let i = 0; i < 4096; i++) {

      data[i] = Math.random();
  }

  node.buffer = buffer;
  node.loop = true;
  
  return node;
}


// choose drum sounds to overlay kick drum
function chooseRhythm(time) {

  // choose rhythm based on alive cells
  let alive = countAliveCells(grid);
  let totalCells = rows * cols;
  liveCellRatio = alive / totalCells;
  showLives.innerHTML = Math.round(liveCellRatio * 100);

  if (liveCellRatio == 0) {
    playKickDrum(time);
  }
  else if (liveCellRatio < 0.05) {
    playHiHat(time);
    playHiHat(time + 0.2);
  }
  else if (liveCellRatio < 0.1) {
    playHiHat(time + 0.2);
    playSnare(time + 0.4);
  }
  else if (liveCellRatio < 0.15) {
    playSnare(time);
    playHiHat(time + 0.2);
  }
  else if (liveCellRatio < 0.2) {
    playHiHat(time + 0.2);
  }
  else if (liveCellRatio < 0.25) {
    playSnare(time);
    playSnare(time + 0.2);
    playHiHat(time + 0.4);
  }
  else if (liveCellRatio < 0.3) {
    playHiHat(time + 0.2);
    playHiHat(time + 0.4);
  }
  else if (liveCellRatio < 0.35) {
    playSnare(time);
    playSnare(time + 0.4);
  }
  else if (liveCellRatio < 0.4) {
    playHiHat(time);
    playSnare(time + 0.2);
  }
  else if (liveCellRatio < 0.45) {
    playSnare(time + 0.2);
  }
  else if (liveCellRatio < 0.5) {
    playHiHat(time);
    playHiHat(time + 0.2);
  }
  else if (liveCellRatio < 0.55) {
    playHiHat(time + 0.2);
    playSnare(time + 0.4);
  }
  else if (liveCellRatio < 0.6) {
    playSnare(time);
    playHiHat(time + 0.1);
  }
  else if (liveCellRatio < 0.65) {
    playHiHat(time + 0.2);
  }
  else if (liveCellRatio < 0.7) {
    playSnare(time);
    playSnare(time + 0.2);
    playHiHat(time + 0.4);
  }
  else if (liveCellRatio < 0.75) {
    playHiHat(time + 0.2);
    playHiHat(time + 0.4);
  }
  else if (liveCellRatio < 0.8) {
    playSnare(time);
    playSnare(time + 0.1);
    playHiHat(time + 0.2);
    playSnare(time + 0.3);
  }
  else if (liveCellRatio < 0.85) {
    playHiHat(time);
    playSnare(time + 0.2);
  }
  else if (liveCellRatio < 0.9) {
    playSnare(time + 0.2);
  }
  else if (liveCellRatio < 0.95) {
    playHiHat(time);
    playHiHat(time + 0.1);
    playHiHat(time + 0.2);
  }
  else {
    playHiHat(time + 0.2);
  }

}


// start or stop the automaton
function toggleAutomaton() {
  isRunning = !isRunning;
  startStopButton.textContent = isRunning ? 'Stop' : 'Start';

  if (isRunning) {
      draw();
  }
}

// main loop
function draw() {
  if (!isRunning) {
      return;
  }

  updateGrid();
  drawGrid();

  playKickDrum(audioCtx.currentTime);
  chooseRhythm(audioCtx.currentTime);

  // speed of automaton updates
  let setSpeed = 11000 - updateSpeed.value
  setTimeout(draw, setSpeed / FPS); 
}

// button to trigger automaton
startStopButton.addEventListener('click', toggleAutomaton);


// grid speed updated by slider
let updateSpeed = document.getElementById("updateSpeed");
let showFPS = document.getElementById("showFPS");
showFPS.innerHTML = updateSpeed.value;

updateSpeed.oninput = function() {
  showFPS.innerHTML = this.value;
}


// show percentage of live cells
let showLives = document.getElementById("showLiveCells");
