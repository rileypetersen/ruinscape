const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use((req, res, next) => { console.log(`Request: ${req.method} ${req.url}`); next(); });
app.use(express.static(path.join(__dirname, 'public')));

// Import simulation function from monteCarloSimulation.js
const { monteCarloStrategySimulations, monteCarloStrategySimulationsDetailed } = require('./monteCarloSimulation');

app.post('/simulate', (req, res) => {
  console.log('Received simulation request:', req.body);
  try {
    const { serverSeed, clientSeed, nonce, cursor, B, p_win, IOL, RPR, iterations } = req.body;

    const _B = parseFloat(B) || 100;
    const _p_win = parseFloat(p_win) || 49.5;
    const _IOL = parseFloat(IOL) || 100;
    const _RPR = parseFloat(RPR) || 0.01;
    const _cursor = parseInt(cursor) || 0;
    const _iterations = iterations ? parseInt(iterations, 10) : 5;

    // Compute additional parameters
    const r_game = 99 / _p_win;
    const r_opt = 1 + _IOL / 100;
    const S_min = 0.01; // Using 0.01 as default minimum bet, can be adjusted.
    const L = Math.floor(Math.log(_B / S_min + 1) / Math.log(r_opt)) || 1;
    const p_loss = 1 - _p_win / 100;
    const N = Math.max(0, Math.ceil(Math.log(_RPR) / Math.log(p_loss)) - L);
    const S = _B / (Math.pow(r_opt, L) - 1);

    const simulationParams = {
      serverSeed: serverSeed || 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      clientSeed: clientSeed || 'clientseed12345',
      nonce: nonce || 'nonce1',
      cursor: _cursor,
      B: _B,
      p_win: _p_win,
      r_game: r_game,
      IOL: _IOL,
      r_opt: r_opt,
      L: L,
      N: N,
      S: S
    };

    const avgRounds = monteCarloStrategySimulations(simulationParams, _iterations);
    console.log('Simulation complete, avgRounds:', avgRounds);
    const logData = '[' + new Date().toISOString() + '] Simulation request: ' + JSON.stringify(req.body) + ' - Result: ' + avgRounds.toFixed(0) + '\n';
    fs.appendFile('simulation_logs.txt', logData, (err) => { if (err) console.error('Failed to write simulation log:', err); });
    res.json({ avgRounds: avgRounds.toFixed(0), simulationParams });
  } catch (error) {
    console.error('Error during simulation:', error);
    res.status(500).json({ error: 'Simulation failed', details: error.toString() });
  }
});

app.post('/simulateDebug', (req, res) => {
  console.log('Received simulation debug request:', req.body);
  try {
    const { serverSeed, clientSeed, nonce, cursor, B, p_win, IOL, RPR, iterations } = req.body;

    const _B = parseFloat(B) || 100;
    // Handle p_win: if it's a string, parse it; if it's a number, use it.
    const _p_win = (typeof p_win === 'string') ? (p_win.trim() !== '' ? parseFloat(p_win) : 49.5) : (p_win || 49.5);
    const _IOL = (typeof IOL === 'string') ? (IOL.trim() !== '' ? parseFloat(IOL) : 100) : (IOL || 100);
    const _RPR = parseFloat(RPR) || 0.01;
    const _cursor = parseInt(cursor) || 0;
    
    // Compute additional parameters
    const r_game = 99 / _p_win;
    const r_opt = 1 + _IOL / 100;
    const S_min = 0.01; // Using 0.01 as default minimum bet
    const L = Math.floor(Math.log(_B / S_min + 1) / Math.log(r_opt)) || 1;
    const p_loss = 1 - _p_win / 100;
    const N = Math.max(0, Math.ceil(Math.log(_RPR) / Math.log(p_loss)) - L);
    const S = _B / (Math.pow(r_opt, L) - 1);
    
    const simulationParams = {
      serverSeed: serverSeed || 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      clientSeed: clientSeed || 'clientseed12345',
      nonce: nonce || 'nonce1',
      cursor: _cursor,
      B: _B,
      p_win: _p_win,
      r_game: r_game,
      IOL: _IOL,
      r_opt: r_opt,
      L: L,
      N: N,
      S: S,
      debug: true
    };
    
    // Run detailed simulation for a single iteration
    const results = monteCarloStrategySimulationsDetailed(simulationParams, 1);
    const result = results[0];
    console.log('Simulation complete, debug result returned.');
    res.json(result);
  } catch (error) {
    console.error('Error during debug simulation:', error);
    res.status(500).json({ error: 'Debug simulation failed', details: error.toString() });
  }
});

app.post('/simulateAllDebug', (req, res) => {
  console.log('Received simulation all debug request:', req.body);
  try {
    const { serverSeed, clientSeed, nonce, cursor, B, p_win, IOL, RPR, iterations } = req.body;

    const _B = parseFloat(B) || 100;
    const _p_win = parseFloat(p_win) || 49.5;
    const _IOL = parseFloat(IOL) || 100;
    const _RPR = parseFloat(RPR) || 0.01;
    const _cursor = parseInt(cursor) || 0;
    const _iterations = iterations ? parseInt(iterations, 10) : 5;

    // Compute additional parameters
    const r_game = 99 / _p_win;
    const r_opt = 1 + _IOL / 100;
    const S_min = 0.01;
    const L = Math.floor(Math.log(_B / S_min + 1) / Math.log(r_opt)) || 1;
    const p_loss = 1 - _p_win / 100;
    const N = Math.max(0, Math.ceil(Math.log(_RPR) / Math.log(p_loss)) - L);
    const S = _B / (Math.pow(r_opt, L) - 1);

    const simulationParams = {
      serverSeed: serverSeed || 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      clientSeed: clientSeed || 'clientseed12345',
      nonce: nonce || 'nonce1',
      cursor: _cursor,
      B: _B,
      p_win: _p_win,
      r_game: r_game,
      IOL: _IOL,
      r_opt: r_opt,
      L: L,
      N: N,
      S: S
    };

    const results = monteCarloStrategySimulationsDetailed(simulationParams, _iterations);
    res.json(results);
  } catch (error) {
    console.error('Error during simulation all debug:', error);
    res.status(500).json({ error: 'Simulation failed', details: error.toString() });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Simulation API server running on port ${PORT}`);
}); 