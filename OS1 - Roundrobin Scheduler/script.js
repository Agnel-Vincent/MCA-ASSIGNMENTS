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
function roundRobin(arrivals, bursts, quantum, overhead, names, tasks) {
  const n = arrivals.length;
  const procs = [];
  for (let i = 0; i < n; i++) {
    const pName = (names && names[i]) ? names[i] : 'P' + (i + 1);
    const pTask = (tasks && tasks[i]) ? tasks[i] : '';
    procs.push({ name: pName, task: pTask, arrival: arrivals[i], burst: bursts[i], index: i });
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
    return { name: p.name, task: p.task, arrival: p.arrival, burst: p.burst, completion: comp, turnaround: tat, waiting: wt, response: rt };
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
// 3. PROCESS TABLE & INPUT VALIDATION
// =============================================================================

/**
 * Escapes unsafe characters for safe DOM string insertion.
 * @param {string} str - String to escape
 * @returns {string} Sanitized string
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Application state holding the list of processes for row-wise entry.
 */
let currentProcesses = [
  { id: 'P1', task: 'Water-quality monitoring', arrival: 0, burst: 5 },
  { id: 'P2', task: 'Waste-collection scheduling', arrival: 1, burst: 3 },
  { id: 'P3', task: 'Traffic-pollution analysis', arrival: 2, burst: 4 },
  { id: 'P4', task: 'Public energy-use monitoring', arrival: 3, burst: 2 }
];

/**
 * Synchronizes the currentProcesses array from the active input elements in the DOM.
 */
function syncCurrentProcessesFromDOM() {
  const tbody = document.getElementById('process-table-body');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');

  const updated = [];
  rows.forEach((row, idx) => {
    const idInput = row.querySelector('.cell-input-id');
    const taskInput = row.querySelector('.cell-input-task');
    const arrInput = row.querySelector('.cell-input-arr');
    const burstInput = row.querySelector('.cell-input-burst');

    const id = idInput ? idInput.value.trim() : `P${idx + 1}`;
    const task = taskInput ? taskInput.value.trim() : '';
    const arrival = arrInput && arrInput.value !== '' ? Number(arrInput.value) : 0;
    const burst = burstInput && burstInput.value !== '' ? Number(burstInput.value) : 1;

    updated.push({
      id: id || `P${idx + 1}`,
      task,
      arrival: Number.isInteger(arrival) && arrival >= 0 ? arrival : 0,
      burst: Number.isInteger(burst) && burst >= 1 ? burst : 1
    });
  });

  if (updated.length > 0) {
    currentProcesses = updated;
  }
}

/**
 * Renders the process configuration table rows with editable inputs.
 */
function renderProcessTable() {
  const tbody = document.getElementById('process-table-body');
  const counter = document.getElementById('process-counter');
  const addBtn = document.getElementById('add-process-btn');

  if (!tbody) return;
  tbody.innerHTML = '';

  currentProcesses.forEach((proc, index) => {
    const tr = document.createElement('tr');
    tr.dataset.index = index;

    // Process ID (PID)
    const tdId = document.createElement('td');
    const inputId = document.createElement('input');
    inputId.type = 'text';
    inputId.className = 'cell-input cell-input-id';
    inputId.value = proc.id;
    inputId.dataset.field = 'id';
    inputId.dataset.index = index;
    inputId.setAttribute('aria-label', `Process ID for row ${index + 1}`);
    tdId.appendChild(inputId);

    // Task Description
    const tdTask = document.createElement('td');
    const inputTask = document.createElement('input');
    inputTask.type = 'text';
    inputTask.className = 'cell-input cell-input-task';
    inputTask.value = proc.task || '';
    inputTask.placeholder = 'e.g. Task name';
    inputTask.dataset.field = 'task';
    inputTask.dataset.index = index;
    inputTask.setAttribute('aria-label', `Task Description for row ${index + 1}`);
    tdTask.appendChild(inputTask);

    // Arrival Time (AT)
    const tdArr = document.createElement('td');
    const inputArr = document.createElement('input');
    inputArr.type = 'number';
    inputArr.className = 'cell-input cell-input-num cell-input-arr';
    inputArr.min = '0';
    inputArr.step = '1';
    inputArr.value = proc.arrival;
    inputArr.dataset.field = 'arrival';
    inputArr.dataset.index = index;
    inputArr.setAttribute('aria-label', `Arrival time for process ${proc.id}`);
    tdArr.appendChild(inputArr);

    // Burst Time (BT)
    const tdBurst = document.createElement('td');
    const inputBurst = document.createElement('input');
    inputBurst.type = 'number';
    inputBurst.className = 'cell-input cell-input-num cell-input-burst';
    inputBurst.min = '1';
    inputBurst.step = '1';
    inputBurst.value = proc.burst;
    inputBurst.dataset.field = 'burst';
    inputBurst.dataset.index = index;
    inputBurst.setAttribute('aria-label', `Burst time for process ${proc.id}`);
    tdBurst.appendChild(inputBurst);

    // Action (Delete Row)
    const tdAction = document.createElement('td');
    tdAction.className = 'text-center';
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-delete-row';
    delBtn.dataset.index = index;
    delBtn.title = currentProcesses.length <= 1 ? 'At least one process is required' : 'Delete this process';
    delBtn.disabled = currentProcesses.length <= 1;
    delBtn.setAttribute('aria-label', `Delete process ${proc.id}`);
    delBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    tdAction.appendChild(delBtn);

    tr.appendChild(tdId);
    tr.appendChild(tdTask);
    tr.appendChild(tdArr);
    tr.appendChild(tdBurst);
    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  });

  if (counter) {
    counter.textContent = `${currentProcesses.length} / 10 processes`;
  }

  if (addBtn) {
    addBtn.disabled = currentProcesses.length >= 10;
  }
}

/**
 * Validates all input fields from the process table and parameter form.
 * Shows friendly red error message under buttons if invalid.
 * @returns {object|null} Sanitized inputs or null if validation fails
 */
function validateInputs() {
  const errorEl = document.getElementById('error-message');
  const outputEl = document.getElementById('output-content');

  // Clear previous error highlighting
  document.querySelectorAll('.cell-input.input-error, #scheduler-form input.input-error').forEach(el => {
    el.classList.remove('input-error');
  });

  function showError(msg, focusEl) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    outputEl.innerHTML = '';
    if (focusEl) {
      focusEl.classList.add('input-error');
      if (typeof focusEl.focus === 'function') {
        focusEl.focus();
      }
    }
    return null;
  }

  const tbody = document.getElementById('process-table-body');
  if (!tbody) return null;
  const rows = tbody.querySelectorAll('tr');

  if (rows.length === 0) {
    return showError('Please add at least one process.');
  }

  if (rows.length > 10) {
    return showError('Please provide between 1 and 10 processes.');
  }

  const arrivals = [];
  const bursts = [];
  const names = [];
  const tasks = [];
  const seenIds = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const idInput = row.querySelector('.cell-input-id');
    const taskInput = row.querySelector('.cell-input-task');
    const arrInput = row.querySelector('.cell-input-arr');
    const burstInput = row.querySelector('.cell-input-burst');

    let pid = idInput ? idInput.value.trim() : '';
    if (!pid) {
      pid = 'P' + (i + 1);
      if (idInput) idInput.value = pid;
    }

    if (seenIds.has(pid)) {
      return showError(`Duplicate Process ID "${pid}". Each process must have a unique identifier.`, idInput);
    }
    seenIds.add(pid);

    const task = taskInput ? taskInput.value.trim() : '';

    const arrVal = arrInput ? arrInput.value.trim() : '';
    if (!/^\d+$/.test(arrVal)) {
      return showError(`Arrival time for process ${pid} must be an integer greater than or equal to 0.`, arrInput);
    }
    const arrNum = Number(arrVal);
    if (arrNum < 0) {
      return showError(`Arrival time for process ${pid} must be greater than or equal to 0.`, arrInput);
    }

    const burstVal = burstInput ? burstInput.value.trim() : '';
    if (!/^\d+$/.test(burstVal)) {
      return showError(`Burst time for process ${pid} must be a positive integer (greater than or equal to 1).`, burstInput);
    }
    const burstNum = Number(burstVal);
    if (burstNum < 1) {
      return showError(`Burst time for process ${pid} must be an integer greater than or equal to 1.`, burstInput);
    }

    names.push(pid);
    tasks.push(task);
    arrivals.push(arrNum);
    bursts.push(burstNum);
  }

  // Validate Time Quantum
  const quantumInput = document.getElementById('quantum-input');
  const quantumText = quantumInput.value.trim();
  if (!/^\d+$/.test(quantumText)) {
    return showError('Time Quantum must be a positive integer (greater than or equal to 1).', quantumInput);
  }
  const quantum = Number(quantumText);
  if (quantum < 1) {
    return showError('Time Quantum must be an integer greater than or equal to 1.', quantumInput);
  }

  // Validate Context Switch Overhead
  const overheadInput = document.getElementById('overhead-input');
  const overheadText = overheadInput.value.trim();
  if (!/^\d+$/.test(overheadText)) {
    return showError('Context Switch Overhead must be an integer greater than or equal to 0.', overheadInput);
  }
  const overhead = Number(overheadText);
  if (overhead < 0) {
    return showError('Context Switch Overhead must be greater than or equal to 0.', overheadInput);
  }

  // Validate Compare Quantum (Optional)
  const compareInput = document.getElementById('compare-quantum-input');
  const compareText = compareInput.value.trim();
  let compareQuantum = null;
  if (compareText !== '') {
    if (!/^\d+$/.test(compareText)) {
      return showError('Compare Time Quantum must be a positive integer (greater than or equal to 1).', compareInput);
    }
    compareQuantum = Number(compareText);
    if (compareQuantum < 1) {
      return showError('Compare Time Quantum must be greater than or equal to 1.', compareInput);
    }
  }

  // All valid: clear error alert
  errorEl.style.display = 'none';
  errorEl.textContent = '';

  return { arrivals, bursts, names, tasks, quantum, overhead, compareQuantum };
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
    const taskSub = job.task ? `<div class="job-task-desc">${escapeHtml(job.task)}</div>` : '';
    row.innerHTML = `
      <td><strong>${escapeHtml(job.name)}</strong>${taskSub}</td>
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

  const resMain = roundRobin(inputs.arrivals, inputs.bursts, inputs.quantum, inputs.overhead, inputs.names, inputs.tasks);

  // If comparison quantum is specified, render both blocks with explicit headings
  if (inputs.compareQuantum !== null) {
    const resCompare = roundRobin(inputs.arrivals, inputs.bursts, inputs.compareQuantum, inputs.overhead, inputs.names, inputs.tasks);

    outputEl.appendChild(buildSimulationBlock(resMain, inputs.quantum, inputs.overhead, `Time Quantum = ${inputs.quantum}`));
    outputEl.appendChild(buildSimulationBlock(resCompare, inputs.compareQuantum, inputs.overhead, `Time Quantum = ${inputs.compareQuantum}`));
    outputEl.appendChild(renderComparisonTable(resMain.summary, resCompare.summary, inputs.quantum, inputs.compareQuantum, inputs.overhead));
  } else {
    // Single quantum view without redundant dual headings
    outputEl.appendChild(buildSimulationBlock(resMain, inputs.quantum, inputs.overhead, null));
  }
}

/**
 * Appends a new process row to the input table and updates calculations.
 */
function handleAddProcess() {
  if (currentProcesses.length >= 10) return;

  syncCurrentProcessesFromDOM();

  const nextIndex = currentProcesses.length + 1;
  const lastProc = currentProcesses[currentProcesses.length - 1];
  const nextArrival = lastProc ? lastProc.arrival + 1 : 0;

  currentProcesses.push({
    id: `P${nextIndex}`,
    task: '',
    arrival: nextArrival,
    burst: 2
  });

  hideScenarioNote();
  renderProcessTable();
  handleSolve();

  // Focus burst time of the newly created row
  const rows = document.querySelectorAll('#process-table-body tr');
  if (rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    const burstInput = lastRow.querySelector('.cell-input-burst');
    if (burstInput) burstInput.focus();
  }
}

/**
 * Deletes a process row from the input table and re-solves.
 * @param {number} index - Index of process to delete
 */
function handleDeleteProcess(index) {
  if (currentProcesses.length <= 1) return;

  syncCurrentProcessesFromDOM();
  currentProcesses.splice(index, 1);
  hideScenarioNote();
  renderProcessTable();
  handleSolve();
}

/**
 * Hides the scenario preset note when user modifies workloads.
 */
function hideScenarioNote() {
  const scenarioNote = document.getElementById('scenario-note');
  if (scenarioNote) {
    scenarioNote.style.display = 'none';
  }
}

/**
 * Loads one of the preset university assignment scenarios and runs Solve.
 * Shows scenario note inside input card.
 * @param {number} actNum - Activity number (1 or 2)
 */
function loadPreset(actNum) {
  const quantumInput = document.getElementById('quantum-input');
  const overheadInput = document.getElementById('overhead-input');
  const compareInput = document.getElementById('compare-quantum-input');
  const scenarioNote = document.getElementById('scenario-note');

  if (actNum === 1) {
    currentProcesses = [
      { id: 'P1', task: 'Water-quality monitoring', arrival: 0, burst: 5 },
      { id: 'P2', task: 'Waste-collection scheduling', arrival: 1, burst: 3 },
      { id: 'P3', task: 'Traffic-pollution analysis', arrival: 2, burst: 4 },
      { id: 'P4', task: 'Public energy-use monitoring', arrival: 3, burst: 2 }
    ];
    quantumInput.value = '2';
    overheadInput.value = '0';
    compareInput.value = '3';

    scenarioNote.innerHTML = `
      <strong>Activity 1 (Smart Municipal Control Centre):</strong>
      <p style="margin-top: 4px; font-size: 0.8rem; color: #4b5563;">
        SDG 6 Clean Water, SDG 11 Sustainable Cities, SDG 12 Responsible Consumption.<br>
        Zero context-switch overhead (CS = 0 ms). Evaluates time quantum q = 2 vs q = 3.
      </p>
    `;
    scenarioNote.style.display = 'block';
  } else if (actNum === 2) {
    currentProcesses = [
      { id: 'P1', task: 'Flood-warning analysis', arrival: 0, burst: 5 },
      { id: 'P2', task: 'Air-quality alert generation', arrival: 1, burst: 4 },
      { id: 'P3', task: 'Emergency evacuation route update', arrival: 2, burst: 3 },
      { id: 'P4', task: 'Renewable-grid status monitoring', arrival: 3, burst: 2 }
    ];
    quantumInput.value = '2';
    overheadInput.value = '1';
    compareInput.value = '4';

    scenarioNote.innerHTML = `
      <strong>Activity 2 (Climate Emergency Response Centre):</strong>
      <p style="margin-top: 4px; font-size: 0.8rem; color: #4b5563;">
        SDG 11 Sustainable Cities, SDG 13 Climate Action.<br>
        Context-switch overhead active (CS = 1 ms). Evaluates time quantum q = 2 vs q = 4.
      </p>
    `;
    scenarioNote.style.display = 'block';
  }

  renderProcessTable();
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
  document.getElementById('add-process-btn').addEventListener('click', handleAddProcess);
  document.getElementById('btn-activity-1').addEventListener('click', () => loadPreset(1));
  document.getElementById('btn-activity-2').addEventListener('click', () => loadPreset(2));

  // 3. Process table event delegation (delete button clicks and cell input changes)
  const tableBody = document.getElementById('process-table-body');
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.btn-delete-row');
      if (delBtn && !delBtn.disabled) {
        const idx = Number(delBtn.dataset.index);
        handleDeleteProcess(idx);
      }
    });

    tableBody.addEventListener('input', (e) => {
      const target = e.target;
      if (target && target.classList.contains('cell-input')) {
        target.classList.remove('input-error');
        hideScenarioNote();
        syncCurrentProcessesFromDOM();
      }
    });
  }

  // 4. Hide scenario note when quantum or overhead inputs change
  document.getElementById('quantum-input').addEventListener('input', hideScenarioNote);
  document.getElementById('overhead-input').addEventListener('input', hideScenarioNote);
  document.getElementById('compare-quantum-input').addEventListener('input', hideScenarioNote);

  // 5. Trigger Solve on Enter key in any input field
  const schedulerForm = document.getElementById('scheduler-form');
  if (schedulerForm) {
    schedulerForm.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        e.preventDefault();
        handleSolve();
      }
    });
  }

  // 6. Load Activity 1 on startup to show a live working simulation
  loadPreset(1);
});
