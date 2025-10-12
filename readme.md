  Minesweeper: Responsive Web Game        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; } .demo-cell { transition: all 0.2s ease-in-out; aspect-ratio: 1 / 1; } .highlight-reveal { background-color: #e0e7ff !important; border-color: #a5b4fc !important; transform: scale(1.05); } .highlight-flag::after { content: '🚩'; font-size: 1.25em; line-height: 1; } .highlight-chord { background-color: #dbeafe !important; box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.5); }

💣 Minesweeper
==============

A modern, fully responsive implementation of the classic Minesweeper game, built with React and contained in a single HTML file for easy deployment.

[Play Now](http://mines.s3is.com)

How to Play: Interactive Demo
-----------------------------

This section provides an interactive guide to the game's core mechanics. Click on any feature button to see a visual demonstration on the grid below.

### Reveal Cell

Click a safe cell to clear it. The number indicates adjacent mines.

### Place Flag

Right-click or use Flag Mode to mark suspected mines.

### Chord Functionality

Double-click a revealed number to quickly clear its safe neighbors.

Difficulty Levels
-----------------

The game offers three standard modes to challenge players of all skill levels. The grid dynamically resizes to fit your screen in any mode.

### Beginner

9x9 Grid

10 Mines

### Intermediate

16x16 Grid

40 Mines

### Expert

30x16 Grid

99 Mines

Gameplay Screenshot
-------------------

Below is a stylized, static representation of the game's UI, created with HTML and CSS to demonstrate the clean and modern aesthetic.

1

2

1

3

1

2

1

2

🚩

1

💣

2

1

1

2

1

🚩

1

2

1

1

2

🚩

Technology Stack
----------------

This project leverages modern web technologies to create a fast, responsive, and easily deployable application—all from a single file.

### React 18

For component-based structure and efficient state management.

### Tailwind CSS

For utility-first, responsive styling and a clean aesthetic.

### Babel Standalone

For in-browser compilation of modern JavaScript and JSX.

### Vanilla JavaScript

For game logic, state handling, and interactive elements.

Setup and Development
---------------------

Since this is a single-file application, running it locally is as simple as opening the HTML file in your browser.

\# 1. Clone the repository

`git clone [YOUR_REPO_URL]`

\# 2. Open index.html in any modern web browser

document.addEventListener('DOMContentLoaded', () => { const demoGrid = document.getElementById('demo-grid'); const featureButtons = document.querySelectorAll('.feature-btn'); let animationTimeout; const gridState = \[ \['', '', '1', '', ''\], \['2', '1', '', '', ''\], \['3', '1', '', '2', '1'\], \['', '', '', '1', 'F'\], \['1', '2', '1', '', 'C'\], \]; const cellElements = \[\]; for (let r = 0; r < 5; r++) { for (let c = 0; c < 5; c++) { const cell = document.createElement('div'); cell.classList.add('demo-cell', 'bg-slate-300', 'rounded', 'flex', 'items-center', 'justify-center', 'font-bold'); cell.dataset.row = r; cell.dataset.col = c; const val = gridState\[r\]\[c\]; if (val && !isNaN(val)) { cell.textContent = val; cell.classList.add(\`text-transparent\`); } demoGrid.appendChild(cell); cellElements.push(cell); } } const resetHighlights = () => { clearTimeout(animationTimeout); cellElements.forEach(cell => { cell.classList.remove('highlight-reveal', 'highlight-flag', 'highlight-chord'); cell.style.backgroundColor = ''; cell.style.borderColor = ''; }); }; const animateFeature = (feature) => { resetHighlights(); if (feature === 'reveal') { const cellToReveal = cellElements.find(c => c.dataset.row === '0' && c.dataset.col === '2'); cellToReveal.classList.add('highlight-reveal'); cellToReveal.style.backgroundColor = '#f1f5f9'; } else if (feature === 'flag') { const cellToFlag = cellElements.find(c => c.dataset.row === '3' && c.dataset.col === '4'); cellToFlag.classList.add('highlight-flag'); } else if (feature === 'chord') { const chordCenter = cellElements.find(c => c.dataset.row === '2' && c.dataset.col === '3'); chordCenter.classList.add('highlight-chord'); const neighbors = \[ \[1, 3\], \[1, 4\], \[2, 4\], \[3, 4\], \[3, 3\] \]; neighbors.forEach((\[r, c\]) => { const neighborCell = cellElements.find(cell => cell.dataset.row == r && cell.dataset.col == c); if (neighborCell) { neighborCell.classList.add('highlight-chord'); } }); } animationTimeout = setTimeout(resetHighlights, 2500); }; featureButtons.forEach(button => { button.addEventListener('click', () => { const feature = button.dataset.feature; animateFeature(feature); }); }); });