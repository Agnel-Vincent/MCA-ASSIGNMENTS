/**
 * SDG Round Robin CPU Scheduling Simulator
 * Beginner-readable implementation for student explanation & live demonstration.
 * Zero external libraries or frameworks. Pure scheduling engine.
 */

// =============================================================================
// 1. SCHEDULING ENGINE (Pure function, no DOM manipulation, under 70 lines)
// =============================================================================

/**
 * Simulates Round Robin scheduling for a given workload.
 * @param {number[]} arrivals - Array of arrival times
 * @param {number[]} bursts - Array of burst times
 * @param {number} quantum - Time quantum (integer >= 1)
 * @param {number} overhead - Context switch overhead in ms (integer >= 0)
 * @returns {object} Object containing timeline, jobs array, and summary statistics
 */
function roundRobin(arrivals, bursts, quantum, overhead) {
  const n = arrivals.length;
  const procs = [];
  for (let i = 0; i < n; i++) {
    procs.push({ name: 'P' + (i + 1), arrival: arrivals[i], burst: bursts[i], index: i });
  }

  // Sort a copy by arrival ascending; preserve input order on ties
  const sorted = procs.slice().sort((a, b) => a.arrival - b.arrival || a.index - b.index);

  let time = 0;
  let next = 0;
  const queue = [];
  const remaining = {};
  const firstStart = {};
  const completion = {};
  let totalBurst = 0;

  for (let i = 0; i < n; i++) {
    remaining[procs[i].name] = procs[i].burst;
    totalBurst += procs[i].burst;
  }

  const timeline = [];
  let lastRun = null;
  let contextSwitches = 0;
  let finished = 0;

  while (finished < n) {
    // Add all processes that have arrived by current time
    while (next < n && sorted[next].arrival <= time) {
      queue.push(sorted[next]);
      next++;
    }

    // CPU is idle if no process is ready
    if (queue.length === 0) {
      const jumpTo = sorted[next].arrival;
      timeline.push({ type: 'idle', name: 'Idle', start: time, end: jumpTo });
      time = jumpTo;
      lastRun = null; // No context switch counted or charged after an idle gap
      continue;
    }

    const p = queue.shift();

    // Check for context switch when moving to a different process
    if (lastRun !== null && lastRun !== p.name) {
      contextSwitches += 1;
      if (overhead > 0) {
        timeline.push({ type: 'cs', name: 'CS', start: time, end: time + overhead });
        time += overhead;
        // Check for processes arriving during the context switch
        while (next < n && sorted[next].arrival <= time) {
          queue.push(sorted[next]);
          next++;
        }
      }
    }

    // Record response time on first CPU allocation
    if (firstStart[p.name] === undefined) {
      firstStart[p.name] = time;
    }

    const run = Math.min(quantum, remaining[p.name]);
    timeline.push({ type: 'process', name: p.name, start: time, end: time + run });
    time += run;
    remaining[p.name] -= run;

    // Add processes that arrived during this execution slice before re-queueing
    while (next < n && sorted[next].arrival <= time) {
      queue.push(sorted[next]);
      next++;
    }

    if (remaining[p.name] > 0) {
      queue.push(p);
    } else {
      completion[p.name] = time;
      finished += 1;
    }

    lastRun = p.name;
  }

  // Calculate per-process metrics
  const jobs = procs.map(p => {
    const comp = completion[p.name];
    const tat = comp - p.arrival;
    const wt = tat - p.burst;
    const rt = firstStart[p.name] - p.arrival;
    return { name: p.name, arrival: p.arrival, burst: p.burst, completion: comp, turnaround: tat, waiting: wt, response: rt };
  });

  // Calculate summary metrics
  const avgTat = jobs.reduce((s, j) => s + j.turnaround, 0) / n;
  const avgWt = jobs.reduce((s, j) => s + j.waiting, 0) / n;
  const avgRt = jobs.reduce((s, j) => s + j.response, 0) / n;
  const totalOverhead = contextSwitches * overhead;
  const totalTime = timeline.length > 0 ? timeline[timeline.length - 1].end : 0;
  const cpuEfficiency = totalTime > 0 ? (totalBurst / totalTime) * 100 : 0;

  return {
    timeline,
    jobs,
    summary: {
      avgTurnaround: avgTat,
      avgWaiting: avgWt,
      avgResponse: avgRt,
      contextSwitches,
      totalOverhead,
      totalTime,
      cpuEfficiency
    }
  };
}

// =============================================================================
// 2. SELF-TEST RUNNER (Silently verifies 4 required test cases on startup)
// =============================================================================

/**
 * Runs 4 verified test cases silently on page load.
 * Updates footer text and logs test result to console.
 */
function runSelfTest() {
  const testCases = [
    {
      name: 'Activity 1, quantum 2, overhead 0',
      arrivals: [0, 1, 2, 3],
      bursts: [5, 3, 4, 2],
      q: 2,
      cs: 0,
      expectedJobs: [
        { name: 'P1', completion: 14, turnaround: 14, waiting: 9, response: 0 },
        { name: 'P2', completion: 11, turnaround: 10, waiting: 7, response: 1 },
        { name: 'P3', completion: 13, turnaround: 11, waiting: 7, response: 2 },
        { name: 'P4', completion: 10, turnaround: 7, waiting: 5, response: 5 }
      ],
      expectedSummary: {
        avgTurnaround: 10.5,
        avgWaiting: 7,
        avgResponse: 2,
        contextSwitches: 7,
        totalOverhead: 0,
        totalTime: 14,
        cpuEfficiency: 100
      }
    },
    {
      name: 'Activity 1, quantum 3, overhead 0',
      arrivals: [0, 1, 2, 3],
      bursts: [5, 3, 4, 2],
      q: 3,
      cs: 0,
      expectedJobs: [
        { name: 'P1', completion: 13, turnaround: 13, waiting: 8, response: 0 },
        { name: 'P2', completion: 6, turnaround: 5, waiting: 2, response: 2 },
        { name: 'P3', completion: 14, turnaround: 12, waiting: 8, response: 4 },
        { name: 'P4', completion: 11, turnaround: 8, waiting: 6, response: 6 }
      ],
      expectedSummary: {
        avgTurnaround: 9.5,
        avgWaiting: 6,
        avgResponse: 3,
        contextSwitches: 5,
        totalOverhead: 0,
        totalTime: 14,
        cpuEfficiency: 100
      }
    },
    {
      name: 'Activity 2, quantum 2, overhead 1',
      arrivals: [0, 1, 2, 3],
      bursts: [5, 4, 3, 2],
      q: 2,
      cs: 1,
      expectedJobs: [
        { name: 'P1', completion: 21, turnaround: 21, waiting: 16, response: 0 },
        { name: 'P2', completion: 17, turnaround: 16, waiting: 12, response: 2 },
        { name: 'P3', completion: 19, turnaround: 17, waiting: 14, response: 4 },
        { name: 'P4', completion: 14, turnaround: 11, waiting: 9, response: 9 }
      ],
      expectedSummary: {
        avgTurnaround: 16.25,
        avgWaiting: 12.75,
        avgResponse: 3.75,
        contextSwitches: 7,
        totalOverhead: 7,
        totalTime: 21,
        cpuEfficiency: 66.67
      }
    },
    {
      name: 'Activity 2, quantum 4, overhead 1',
      arrivals: [0, 1, 2, 3],
      bursts: [5, 4, 3, 2],
      q: 4,
      cs: 1,
      expectedJobs: [
        { name: 'P1', completion: 18, turnaround: 18, waiting: 13, response: 0 },
        { name: 'P2', completion: 9, turnaround: 8, waiting: 4, response: 4 },
        { name: 'P3', completion: 13, turnaround: 11, waiting: 8, response: 8 },
        { name: 'P4', completion: 16, turnaround: 13, waiting: 11, response: 11 }
      ],
      expectedSummary: {
        avgTurnaround: 12.5,
        avgWaiting: 9,
        avgResponse: 5.75,
        contextSwitches: 4,
        totalOverhead: 4,
        totalTime: 18,
        cpuEfficiency: 77.78
      }
    }
  ];

  function approxEqual(a, b) {
    return Math.abs(a - b) <= 0.005;
  }

  let passed = 0;
  for (const tc of testCases) {
    const res = roundRobin(tc.arrivals, tc.bursts, tc.q, tc.cs);
    let match = true;

    for (let i = 0; i < tc.expectedJobs.length; i++) {
      const exp = tc.expectedJobs[i];
      const act = res.jobs[i];
      if (act.completion !== exp.completion || act.turnaround !== exp.turnaround ||
          act.waiting !== exp.waiting || act.response !== exp.response) {
        match = false;
        break;
      }
    }

    const s = res.summary;
    const es = tc.expectedSummary;
    if (!approxEqual(s.avgTurnaround, es.avgTurnaround) ||
        !approxEqual(s.avgWaiting, es.avgWaiting) ||
        !approxEqual(s.avgResponse, es.avgResponse) ||
        s.contextSwitches !== es.contextSwitches ||
        s.totalOverhead !== es.totalOverhead ||
        s.totalTime !== es.totalTime ||
        !approxEqual(s.cpuEfficiency, es.cpuEfficiency)) {
      match = false;
    }

    if (match) {
      passed++;
    } else {
      const failMsg = `Self-test: FAILED: ${tc.name}`;
      console.error(failMsg);
      const footerEl = document.getElementById('self-test-line');
      if (footerEl) {
        footerEl.textContent = failMsg;
        footerEl.className = 'self-test-text self-test-failed';
      }
      return;
    }
  }

  const passMsg = `Self-test: ${passed}/${testCases.length} passed`;
  console.log(passMsg);
  const footerEl = document.getElementById('self-test-line');
  if (footerEl) {
    footerEl.textContent = passMsg;
    footerEl.className = 'self-test-text';
  }
}

// =============================================================================
// 3. INPUT PARSING AND VALIDATION
// =============================================================================

/**
 * Parses space or comma separated numbers from a string.
 * @param {string} str - Raw input text
 * @returns {number[]|null} Array of integers, or null if invalid
 */
function parseInputList(str) {
  if (!str || typeof str !== 'string') return null;
  const tokens = str.trim().split(/[\s,]+/);
  if (tokens.length === 0 || tokens[0] === '') return null;

  const numbers = [];
  for (const token of tokens) {
    // Only allow whole integer digits (positive or zero)
    if (!/^-?\d+$/.test(token)) {
      return null;
    }
    const val = Number(token);
    if (!Number.isInteger(val)) {
      return null;
    }
    numbers.push(val);
  }
  return numbers;
}

/**
 * Validates all input fields according to assignment requirements.
 * Shows friendly red error message under buttons if invalid.
 * @returns {object|null} Sanitized inputs or null if validation fails
 */
function validateInputs() {
  const errorEl = document.getElementById('error-message');
  const outputEl = document.getElementById('output-content');

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    outputEl.innerHTML = ''; // Clear old results when invalid
    return null;
  }

  const arrivalText = document.getElementById('arrival-input').value;
  const burstText = document.getElementById('burst-input').value;
  const quantumText = document.getElementById('quantum-input').value;
  const overheadText = document.getElementById('overhead-input').value;
  const compareText = document.getElementById('compare-quantum-input').value.trim();

  // Validate Arrival Times
  const arrivals = parseInputList(arrivalText);
  if (!arrivals) {
    return showError('Arrival Times must be valid whole numbers separated by spaces or commas.');
  }
  for (const arr of arrivals) {
    if (arr < 0) {
      return showError('Arrival times must be integers greater than or equal to 0.');
    }
  }

  if (arrivals.length < 1 || arrivals.length > 10) {
    return showError('Please provide between 1 and 10 processes.');
  }

  // Validate Burst Times
  const bursts = parseInputList(burstText);
  if (!bursts) {
    return showError('Burst Times must be valid whole numbers separated by spaces or commas.');
  }
  for (const b of bursts) {
    if (b < 1) {
      return showError('Burst times must be positive integers (greater than or equal to 1).');
    }
  }

  if (arrivals.length !== bursts.length) {
    return showError(`Number of arrival times (${arrivals.length}) must equal number of burst times (${bursts.length}).`);
  }

  // Validate Time Quantum
  if (!/^\d+$/.test(quantumText.trim())) {
    return showError('Time Quantum must be a positive integer (greater than or equal to 1).');
  }
  const quantum = Number(quantumText);
  if (quantum < 1) {
    return showError('Time Quantum must be an integer greater than or equal to 1.');
  }

  // Validate Context Switch Overhead
  if (!/^\d+$/.test(overheadText.trim())) {
    return showError('Context Switch Overhead must be an integer greater than or equal to 0.');
  }
  const overhead = Number(overheadText);
  if (overhead < 0) {
    return showError('Context Switch Overhead must be greater than or equal to 0.');
  }

  // Validate Compare Quantum (Optional)
  let compareQuantum = null;
  if (compareText !== '') {
    if (!/^\d+$/.test(compareText)) {
      return showError('Compare Time Quantum must be a positive integer (greater than or equal to 1).');
    }
    compareQuantum = Number(compareText);
    if (compareQuantum < 1) {
      return showError('Compare Time Quantum must be greater than or equal to 1.');
    }
  }

  // All valid: clear error
  errorEl.style.display = 'none';
  errorEl.textContent = '';

  return { arrivals, bursts, quantum, overhead, compareQuantum };
}

/**
 * Formats a number with at most 2 decimal places and strips unnecessary trailing zeros.
 * @param {number} num - Value to format
 * @returns {string} Formatted string
 */
function formatNumber(num) {
  if (Number.isInteger(num)) {
    return num.toString();
  }
  return Number(num.toFixed(2)).toString();
}

// =============================================================================
// 4. RENDERING FUNCTIONS (Gantt, Tables, Summaries, Comparison)
// =============================================================================

/**
 * Creates the HTML container for a Gantt chart.
 * Proportional block width with minimum readable size.
 * Aligns time boundary markers under block boundaries.
 */
function renderGanttChart(timeline) {
  const container = document.createElement('div');
  container.className = 'gantt-section';

  const heading = document.createElement('h3');
  heading.className = 'gantt-heading';
  heading.textContent = 'Gantt Chart';
  container.appendChild(heading);

  const scrollWrapper = document.createElement('div');
  scrollWrapper.className = 'gantt-scroll-container';

  const track = document.createElement('div');
  track.className = 'gantt-track';

  for (let i = 0; i < timeline.length; i++) {
    const seg = timeline[i];
    const duration = seg.end - seg.start;
    const col = document.createElement('div');
    col.className = 'gantt-column';
    col.style.flex = `${duration} 0 auto`;
    col.style.minWidth = `${Math.max(duration * 28, 38)}px`;

    const block = document.createElement('div');
    block.className = `gantt-block gantt-block-${seg.type}`;
    block.textContent = seg.name;
    col.appendChild(block);

    // Start time marker at left boundary
    const startMarker = document.createElement('span');
    startMarker.className = 'gantt-time-marker gantt-time-start';
    startMarker.textContent = seg.start;
    col.appendChild(startMarker);

    // End time marker at right boundary (only for the last segment)
    if (i === timeline.length - 1) {
      const endMarker = document.createElement('span');
      endMarker.className = 'gantt-time-marker gantt-time-end';
      endMarker.textContent = seg.end;
      col.appendChild(endMarker);
    }

    track.appendChild(col);
  }

  scrollWrapper.appendChild(track);
  container.appendChild(scrollWrapper);
  return container;
}

/**
 * Creates the Results table with per-job metrics and average row.
 */
function renderResultsTable(jobs, summary) {
  const container = document.createElement('div');
  container.className = 'results-table-container';

  const table = document.createElement('table');
  table.className = 'results-table';

  // Table Header
  table.innerHTML = `
    <thead>
      <tr>
        <th>Job</th>
        <th>Arrival Time</th>
        <th>Burst Time</th>
        <th>Completion Time</th>
        <th>Turnaround Time</th>
        <th>Waiting Time</th>
        <th>Response Time</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  const n = jobs.length;
  let sumTat = 0;
  let sumWt = 0;
  let sumRt = 0;

  for (const job of jobs) {
    sumTat += job.turnaround;
    sumWt += job.waiting;
    sumRt += job.response;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${job.name}</strong></td>
      <td>${job.arrival}</td>
      <td>${job.burst}</td>
      <td>${job.completion}</td>
      <td>${job.turnaround}</td>
      <td>${job.waiting}</td>
      <td>${job.response}</td>
    `;
    tbody.appendChild(row);
  }

  // Average row with formula breakdown: sum / n = value
  const avgRow = document.createElement('tr');
  avgRow.className = 'row-average';
  avgRow.innerHTML = `
    <td>Average</td>
    <td>-</td>
    <td>-</td>
    <td>-</td>
    <td>${sumTat} / ${n} = ${formatNumber(summary.avgTurnaround)}</td>
    <td>${sumWt} / ${n} = ${formatNumber(summary.avgWaiting)}</td>
    <td>${sumRt} / ${n} = ${formatNumber(summary.avgResponse)}</td>
  `;
  tbody.appendChild(avgRow);

  container.appendChild(table);
  return container;
}

/**
 * Creates the summary cards under the table.
 * Shows Overhead and CPU Efficiency only when overhead > 0.
 */
function renderSummaryLine(summary, overhead) {
  const container = document.createElement('div');
  container.className = 'summary-row';

  // Context Switches
  const csCard = document.createElement('div');
  csCard.className = 'summary-pill';
  csCard.innerHTML = `
    <div class="summary-pill-label">Context Switches</div>
    <div class="summary-pill-value">${summary.contextSwitches}</div>
  `;
  container.appendChild(csCard);

  // Total Time
  const timeCard = document.createElement('div');
  timeCard.className = 'summary-pill';
  timeCard.innerHTML = `
    <div class="summary-pill-label">Total Time</div>
    <div class="summary-pill-value">${summary.totalTime} ms</div>
  `;
  container.appendChild(timeCard);

  // When overhead > 0, also show Total Overhead and CPU Efficiency
  if (overhead > 0) {
    const ovCard = document.createElement('div');
    ovCard.className = 'summary-pill';
    ovCard.innerHTML = `
      <div class="summary-pill-label">Total Overhead</div>
      <div class="summary-pill-value">${summary.totalOverhead} ms</div>
    `;
    container.appendChild(ovCard);

    const effCard = document.createElement('div');
    effCard.className = 'summary-pill';
    effCard.innerHTML = `
      <div class="summary-pill-label">CPU Efficiency</div>
      <div class="summary-pill-value">${formatNumber(summary.cpuEfficiency)}%</div>
    `;
    container.appendChild(effCard);
  }

  return container;
}

/**
 * Builds the complete output block for one simulation run.
 */
function buildSimulationBlock(result, quantum, overhead, headingText) {
  const block = document.createElement('div');
  block.className = 'simulation-block';

  if (headingText) {
    const heading = document.createElement('h3');
    heading.className = 'section-quantum-heading';
    heading.textContent = headingText;
    block.appendChild(heading);
  }

  // Gantt Chart
  block.appendChild(renderGanttChart(result.timeline));

  // Results Table
  block.appendChild(renderResultsTable(result.jobs, result.summary));

  // Summary Line
  block.appendChild(renderSummaryLine(result.summary, overhead));

  return block;
}

/**
 * Creates the comparison table between two time quanta.
 */
function renderComparisonTable(sumA, sumB, qA, qB, overhead) {
  const container = document.createElement('div');
  container.className = 'comparison-section';

  const heading = document.createElement('h3');
  heading.className = 'comparison-heading';
  heading.textContent = `Comparison: Quantum ${qA} vs Quantum ${qB}`;
  container.appendChild(heading);

  if (qA === qB) {
    const msg = document.createElement('div');
    msg.className = 'identical-quanta-msg';
    msg.textContent = `Both time quanta are identical (q = ${qA}). Enter a different compare quantum to see a comparative analysis.`;
    container.appendChild(msg);
    return container;
  }

  const tableContainer = document.createElement('div');
  tableContainer.className = 'results-table-container';

  const table = document.createElement('table');
  table.className = 'results-table';

  const labelA = `Quantum ${qA}`;
  const labelB = `Quantum ${qB}`;

  table.innerHTML = `
    <thead>
      <tr>
        <th>Metric</th>
        <th>${labelA}</th>
        <th>${labelB}</th>
        <th>Better</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');

  // Metrics list to compare
  const rows = [
    { label: 'Avg Turnaround Time', valA: sumA.avgTurnaround, valB: sumB.avgTurnaround, unit: ' ms', higherBetter: false },
    { label: 'Avg Waiting Time', valA: sumA.avgWaiting, valB: sumB.avgWaiting, unit: ' ms', higherBetter: false },
    { label: 'Avg Response Time', valA: sumA.avgResponse, valB: sumB.avgResponse, unit: ' ms', higherBetter: false },
    { label: 'Context Switches', valA: sumA.contextSwitches, valB: sumB.contextSwitches, unit: '', higherBetter: false },
    { label: 'Total Time', valA: sumA.totalTime, valB: sumB.totalTime, unit: ' ms', higherBetter: false }
  ];

  if (overhead > 0) {
    rows.push({ label: 'Total Overhead', valA: sumA.totalOverhead, valB: sumB.totalOverhead, unit: ' ms', higherBetter: false });
    rows.push({ label: 'CPU Efficiency', valA: sumA.cpuEfficiency, valB: sumB.cpuEfficiency, unit: '%', higherBetter: true });
  }

  for (const r of rows) {
    const tr = document.createElement('tr');
    let betterText = 'Tie';
    let winner = null;

    if (Math.abs(r.valA - r.valB) >= 0.0001) {
      if (r.higherBetter) {
        winner = r.valA > r.valB ? 'A' : 'B';
      } else {
        winner = r.valA < r.valB ? 'A' : 'B';
      }
      betterText = winner === 'A' ? labelA : labelB;
    }

    const dispA = formatNumber(r.valA) + r.unit;
    const dispB = formatNumber(r.valB) + r.unit;

    const cellA = winner === 'A' ? `<span class="winning-highlight">${dispA}</span>` : dispA;
    const cellB = winner === 'B' ? `<span class="winning-highlight">${dispB}</span>` : dispB;

    tr.innerHTML = `
      <td><strong>${r.label}</strong></td>
      <td>${cellA}</td>
      <td>${cellB}</td>
      <td><strong>${betterText}</strong></td>
    `;
    tbody.appendChild(tr);
  }

  tableContainer.appendChild(table);
  container.appendChild(tableContainer);

  // Recommendation Paragraph
  container.appendChild(renderRecommendation(sumA, sumB, qA, qB, overhead));

  return container;
}

/**
 * Builds the algorithmic recommendation paragraph based on computed values.
 */
function renderRecommendation(sumA, sumB, qA, qB, overhead) {
  const box = document.createElement('div');
  box.className = 'recommendation-box';

  // Rule:
  // 1. Lowest average waiting time
  // 2. If tied, fewer context switches
  // 3. If tied, lower average response time
  // 4. If still tied, smaller quantum
  let recommended = 'A';

  if (Math.abs(sumA.avgWaiting - sumB.avgWaiting) > 0.0001) {
    recommended = sumA.avgWaiting < sumB.avgWaiting ? 'A' : 'B';
  } else if (sumA.contextSwitches !== sumB.contextSwitches) {
    recommended = sumA.contextSwitches < sumB.contextSwitches ? 'A' : 'B';
  } else if (Math.abs(sumA.avgResponse - sumB.avgResponse) > 0.0001) {
    recommended = sumA.avgResponse < sumB.avgResponse ? 'A' : 'B';
  } else {
    recommended = qA <= qB ? 'A' : 'B';
  }

  const recQuantum = recommended === 'A' ? qA : qB;
  const otherQuantum = recommended === 'A' ? qB : qA;
  const recSum = recommended === 'A' ? sumA : sumB;
  const otherSum = recommended === 'A' ? sumB : sumA;

  let overheadText = '';
  if (overhead > 0) {
    overheadText = `, total context-switch overhead of ${recSum.totalOverhead} ms, and CPU efficiency of ${formatNumber(recSum.cpuEfficiency)}%`;
  }

  let text = `<strong>Recommendation:</strong> Time quantum q = ${recQuantum} is recommended as it achieves an average waiting time of ${formatNumber(recSum.avgWaiting)} ms, average turnaround time of ${formatNumber(recSum.avgTurnaround)} ms, and ${recSum.contextSwitches} context switches${overheadText}.`;

  // Trade-off sentence if the other quantum had a strictly better average response time
  if (otherSum.avgResponse < recSum.avgResponse - 0.0001) {
    text += ` However, time quantum q = ${otherQuantum} offers a better average response time (${formatNumber(otherSum.avgResponse)} ms vs ${formatNumber(recSum.avgResponse)} ms), which benefits interactive responsiveness.`;
  }

  box.innerHTML = text;
  return box;
}

// =============================================================================
// 5. USER INTERFACE CONTROLLER & PRESETS
// =============================================================================

/**
 * Reads inputs, runs the pure engine, and renders all components to screen.
 */
function handleSolve() {
  const inputs = validateInputs();
  if (!inputs) return;

  const outputEl = document.getElementById('output-content');
  outputEl.innerHTML = '';

  const resMain = roundRobin(inputs.arrivals, inputs.bursts, inputs.quantum, inputs.overhead);

  // If comparison quantum is specified, render both blocks with explicit headings
  if (inputs.compareQuantum !== null) {
    const resCompare = roundRobin(inputs.arrivals, inputs.bursts, inputs.compareQuantum, inputs.overhead);

    outputEl.appendChild(buildSimulationBlock(resMain, inputs.quantum, inputs.overhead, `Time Quantum = ${inputs.quantum}`));
    outputEl.appendChild(buildSimulationBlock(resCompare, inputs.compareQuantum, inputs.overhead, `Time Quantum = ${inputs.compareQuantum}`));
    outputEl.appendChild(renderComparisonTable(resMain.summary, resCompare.summary, inputs.quantum, inputs.compareQuantum, inputs.overhead));
  } else {
    // Single quantum view without redundant dual headings
    outputEl.appendChild(buildSimulationBlock(resMain, inputs.quantum, inputs.overhead, null));
  }
}

/**
 * Loads one of the preset university assignment scenarios and runs Solve.
 * Shows scenario note inside input card.
 * @param {number} actNum - Activity number (1 or 2)
 */
function loadPreset(actNum) {
  const arrivalInput = document.getElementById('arrival-input');
  const burstInput = document.getElementById('burst-input');
  const quantumInput = document.getElementById('quantum-input');
  const overheadInput = document.getElementById('overhead-input');
  const compareInput = document.getElementById('compare-quantum-input');
  const scenarioNote = document.getElementById('scenario-note');

  if (actNum === 1) {
    arrivalInput.value = '0 1 2 3';
    burstInput.value = '5 3 4 2';
    quantumInput.value = '2';
    overheadInput.value = '0';
    compareInput.value = '3';

    scenarioNote.innerHTML = `
      <strong>Activity 1 (SDG 6, 11, 12 - Municipal Services):</strong>
      <ul>
        <li><strong>P1:</strong> Water-quality monitoring</li>
        <li><strong>P2:</strong> Waste-collection scheduling</li>
        <li><strong>P3:</strong> Traffic-pollution analysis</li>
        <li><strong>P4:</strong> Public energy-use monitoring</li>
      </ul>
    `;
    scenarioNote.style.display = 'block';
  } else if (actNum === 2) {
    arrivalInput.value = '0 1 2 3';
    burstInput.value = '5 4 3 2';
    quantumInput.value = '2';
    overheadInput.value = '1';
    compareInput.value = '4';

    scenarioNote.innerHTML = `
      <strong>Activity 2 (SDG 11, 13 - Climate Emergency):</strong>
      <ul>
        <li><strong>P1:</strong> Flood-warning analysis</li>
        <li><strong>P2:</strong> Air-quality alert generation</li>
        <li><strong>P3:</strong> Emergency evacuation route update</li>
        <li><strong>P4:</strong> Renewable-grid status monitoring</li>
      </ul>
    `;
    scenarioNote.style.display = 'block';
  }

  handleSolve();
}

// =============================================================================
// 6. INITIALIZATION & EVENT LISTENERS
// =============================================================================

window.addEventListener('DOMContentLoaded', () => {
  // 1. Silently execute engine self-test against verified hand-calculated test cases
  runSelfTest();

  // 2. Attach button click handlers
  document.getElementById('solve-btn').addEventListener('click', handleSolve);
  document.getElementById('btn-activity-1').addEventListener('click', () => loadPreset(1));
  document.getElementById('btn-activity-2').addEventListener('click', () => loadPreset(2));

  // 3. Hide scenario note as soon as user edits arrival or burst inputs
  const scenarioNote = document.getElementById('scenario-note');
  function hideScenarioNote() {
    if (scenarioNote) {
      scenarioNote.style.display = 'none';
    }
  }
  document.getElementById('arrival-input').addEventListener('input', hideScenarioNote);
  document.getElementById('burst-input').addEventListener('input', hideScenarioNote);

  // 4. Trigger Solve on Enter key in any input field
  const allInputs = document.querySelectorAll('#scheduler-form input');
  allInputs.forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSolve();
      }
    });
  });

  // 5. Load Activity 1 on startup to show a live working simulation
  loadPreset(1);
});
