const crypto = require('crypto');

// Generator function: yields bytes using HMAC-SHA256 based on a serverSeed, clientSeed, nonce, and cursor.
function* byteGenerator(serverSeed, clientSeed, nonce, cursor) {
  let currentRound = Math.floor(cursor / 32);
  let currentRoundCursor = cursor % 32;
  while (true) {
    const hmac = crypto.createHmac('sha256', Buffer.from(serverSeed, 'hex'));
    hmac.update(`${clientSeed}:${nonce}:${currentRound}`);
    const buffer = hmac.digest();
    
    while (currentRoundCursor < 32) {
      yield buffer[currentRoundCursor];
      currentRoundCursor++;
    }
    currentRoundCursor = 0;
    currentRound++;
  }
}

// Generates 'count' floating point numbers (0-1) using the RNG.
function generateFloats(serverSeed, clientSeed, nonce, cursor, count) {
  const rng = byteGenerator(serverSeed, clientSeed, nonce, cursor);
  let bytes = [];
  for (let i = 0; i < count * 4; i++) {
    bytes.push(rng.next().value);
  }
  
  const floats = [];
  for (let i = 0; i < count; i++) {
    let floatVal = 0;
    for (let j = 0; j < 4; j++) {
      floatVal += bytes[i * 4 + j] / Math.pow(256, j + 1);
    }
    floats.push(floatVal);
  }
  return floats;
}

// Converts a float (0-1) into a dice roll value as per the documentation.
function rollFromFloat(float) {
  return (float * 10001) / 100;
}

// Simulates the full betting strategy until ruin.
// The strategy uses a waiting phase and then a betting series once consecutive losses reach N.
function simulateFullStrategy(params) {
  const MAX_ROUNDS = 1e7;
  let debugLog = [];
  if (params.debug) {
    debugLog.push(`Starting simulation with Bankroll: ${params.B}, Bet: ${params.S}, N: ${params.N}, L: ${params.L}`);
  }
  let bankroll = params.B;
  let rounds = 0;
  let consecutiveLosses = 0;
  let cursor = params.cursor;
  
  while (bankroll >= params.S && rounds < MAX_ROUNDS) {
    if (consecutiveLosses < params.N) {
      const [randFloat] = generateFloats(params.serverSeed, params.clientSeed, params.nonce, cursor, 1);
      cursor += 4;
      const roll = rollFromFloat(randFloat);
      rounds++;
      if (params.debug) {
        debugLog.push(`Round ${rounds} (Waiting): roll = ${roll.toFixed(2)}, Bankroll = ${bankroll.toFixed(2)}, consecutiveLosses = ${consecutiveLosses}`);
      }
      if (roll < params.p_win) {
        if (params.debug) debugLog.push(`Round ${rounds}: WIN in waiting phase. Reset consecutiveLosses.`);
        consecutiveLosses = 0;
      } else {
        consecutiveLosses++;
        if (params.debug) debugLog.push(`Round ${rounds}: LOSS in waiting phase. Increment consecutiveLosses to ${consecutiveLosses}.`);
      }
    } else {
      if (params.debug) debugLog.push(`Entering Betting Series at Round ${rounds + 1} with Bankroll: ${bankroll.toFixed(2)}`);
      let bet = params.S;
      let seriesWon = false;
      for (let i = 0; i < params.L; i++) {
        if (bankroll < bet) {
          if (params.debug) debugLog.push(`Cannot afford bet of ${bet.toFixed(2)} at Betting round ${i + 1}. Bankroll: ${bankroll.toFixed(2)}. Breaking series.`);
          break;
        }
        const [randFloat] = generateFloats(params.serverSeed, params.clientSeed, params.nonce, cursor, 1);
        cursor += 4;
        const roll = rollFromFloat(randFloat);
        rounds++;
        if (params.debug) debugLog.push(`Round ${rounds} (Betting ${i + 1}): bet = ${bet.toFixed(2)}, roll = ${roll.toFixed(2)}, Bankroll before bet = ${bankroll.toFixed(2)}`);
        if (roll < params.p_win) {
          if (params.debug) debugLog.push(`Round ${rounds}: WIN in betting round. Bankroll increases by ${(bet * (params.r_game - 1)).toFixed(2)}.`);
          bankroll += bet * (params.r_game - 1);
          seriesWon = true;
          break;
        } else {
          bankroll -= bet;
          if (params.debug) debugLog.push(`Round ${rounds}: LOSS in betting round. Deducted bet of ${bet.toFixed(2)}. New Bankroll: ${bankroll.toFixed(2)}.`);
          bet *= params.r_opt;
          if (params.debug) debugLog.push(`Bet escalated to ${bet.toFixed(2)} for next betting round.`);
        }
      }
      consecutiveLosses = 0;
      if (params.debug) debugLog.push(`Exiting Betting Series. Bankroll now: ${bankroll.toFixed(2)}`);
    }
  }
  if (params.debug) {
    debugLog.push(`Simulation ended after ${rounds} rounds with final Bankroll: ${bankroll.toFixed(2)}`);
    return { rounds, debugLog };
  }
  return rounds;
}

// Add a helper function to generate a random seed
function generateRandomSeed() {
  return crypto.randomBytes(32).toString('hex');
}

// Runs multiple Monte Carlo simulations of the full strategy and returns the average rounds until ruin.
function monteCarloStrategySimulations(params, iterations) {
  let totalRounds = 0;
  for (let i = 0; i < iterations; i++) {
    // Create a new parameters object for this iteration with unique seeds
    let iterationParams = { ...params };
    iterationParams.serverSeed = generateRandomSeed();
    iterationParams.clientSeed = generateRandomSeed();
    totalRounds += simulateFullStrategy(iterationParams);
  }
  return totalRounds / iterations;
}

// Runs multiple Monte Carlo simulations of the full strategy in debug mode and returns detailed results for each iteration.
function monteCarloStrategySimulationsDetailed(params, iterations) {
  let simulationResults = [];
  for (let i = 0; i < iterations; i++) {
    // Create a new parameters object for this iteration with unique seeds and enable debug mode
    let iterationParams = { ...params };
    iterationParams.serverSeed = generateRandomSeed();
    iterationParams.clientSeed = generateRandomSeed();
    iterationParams.debug = true;
    let result = simulateFullStrategy(iterationParams);
    simulationResults.push(result);
  }
  return simulationResults;
}

if (require.main === module) {
  // Define default simulation parameters for standalone testing
  const simulationParams = {
    serverSeed: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    clientSeed: 'clientseed12345',
    nonce: 'nonce1',
    cursor: 0,
    B: 100,
    p_win: 49.5,
    r_game: 99 / 49.5,
    IOL: 100,
    r_opt: 2, // 1 + IOL/100
    L: 5,
    N: 1,
    S: 1
  };
  const iterations = 10000;
  const avgRounds = monteCarloStrategySimulations(simulationParams, iterations);
  console.log(`Average rounds until ruin (over ${iterations} simulations): ${avgRounds.toFixed(0)}`);
} else {
  module.exports = {
    simulateFullStrategy,
    monteCarloStrategySimulations,
    monteCarloStrategySimulationsDetailed
  };
} 