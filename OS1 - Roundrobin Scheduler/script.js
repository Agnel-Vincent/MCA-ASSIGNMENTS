/**
 * SDG Round Robin CPU Scheduling Engine & Dashboard
 * Operating Systems - Assignment 1
 * Agnel T Vincent | MCA | Semester 1
 */

'use strict';

// ============================================================================
// 1. SCHEDULING ENGINE (Pure Function, Zero DOM Dependencies)
// ============================================================================

/**
 * Pure Round Robin CPU Scheduling Algorithm
 * 
 * @param {Array<{id: string, task: string, arrival: number, burst: number}>} processes
 * @param {number} quantum - Time slice (integer >= 1)
 * @param {number} overhead - Context switch overhead (integer >= 0)
 * @returns {{
 *   timeline: Array<{type: 'PROCESS'|'CONTEXT_SWITCH'|'IDLE', id: string, start: number, end: number, task?: string}>,
 *   results: Array<{id: string, task: string, arrival: number, burst: number, ct: number, tat: number, wt: number, rt: number}>,
 *   summary: {
 *     avgTat: number,
 *     avgWt: number,
 *     avgRt: number,
 *     contextSwitches: number,
 *     totalOverhead: number,
 *     totalTime: number,
 *     busyTime: number,
 *     cpuEfficiency: number
 *   }
 * }}
 */
function roundRobin(processes, quantum, overhead) {
  if (!Array.isArray(processes) || processes.length === 0) {
    throw new Error('Processes array must not be empty');
  }
  const q = Number(quantum);
  const oh = Number(overhead);
  if (!Number.isInteger(q) || q < 1) {
    throw new Error('Quantum must be an integer >= 1');
  }
  if (!Number.isInteger(oh) || oh < 0) {
    throw new Error('Overhead must be an integer >= 0');
  }

  // Work on a deep copy of processes, maintaining original input order for tie-breaking
  const procs = processes.map((p, idx) => ({
    id: String(p.id).trim(),
    task: String(p.task || '').trim(),
    arrival: Number(p.arrival),
    burst: Number(p.burst),
    _origIndex: idx,
    firstStart: null,
    completion: null
  }));

  // Sort by arrival ascending (ties: retain original input index)
  procs.sort((a, b) => a.arrival - b.arrival || a._origIndex - b._origIndex);

  const n = procs.length;
  let time = 0;
  let next = 0; // index of next process in procs waiting to arrive
  const queue = [];
  const remaining = {};
  procs.forEach(p => {
    remaining[p.id] = p.burst;
  });

  const timeline = [];
  let lastRun = null;
  let contextSwitches = 0;
  let done = 0;

  // Helper to enqueue processes that arrived at or before current time
  function enqueueArrivals() {
    while (next < n && procs[next].arrival <= time) {
      queue.push(procs[next]);
      next++;
    }
  }

  while (done < n) {
    enqueueArrivals();

    if (queue.length === 0) {
      // CPU is idle until next process arrives
      const jumpTo = procs[next].arrival;
      if (jumpTo > time) {
        timeline.push({ type: 'IDLE', id: 'Idle', start: time, end: jumpTo });
        time = jumpTo;
      }
      lastRun = null; // No switch is counted or charged after an idle gap
      continue;
    }

    const p = queue.shift();

    // Check for context switch
    if (lastRun !== null && lastRun !== p.id) {
      contextSwitches += 1; // ALWAYS count the switch, even if overhead is 0
      if (oh > 0) {
        timeline.push({ type: 'CONTEXT_SWITCH', id: 'CS', start: time, end: time + oh });
        time += oh;
        enqueueArrivals(); // Arrivals during context switch join queue
      }
    }

    if (p.firstStart === null) {
      p.firstStart = time;
    }

    const run = Math.min(q, remaining[p.id]);
    timeline.push({ type: 'PROCESS', id: p.id, task: p.task, start: time, end: time + run });
    time += run;
    remaining[p.id] -= run;

    // Critical: New arrivals join the queue BEFORE pre-empted process is re-added
    enqueueArrivals();

    if (remaining[p.id] > 0) {
      queue.push(p);
    } else {
      p.completion = time;
      done += 1;
    }

    lastRun = p.id;
  }

  // Restore original input ordering for results table
  const resultsMap = new Map();
  procs.forEach(p => {
    const ct = p.completion;
    const tat = ct - p.arrival;
    const wt = tat - p.burst;
    const rt = p.firstStart - p.arrival;
    resultsMap.set(p.id, {
      id: p.id,
      task: p.task,
      arrival: p.arrival,
      burst: p.burst,
      ct,
      tat,
      wt,
      rt
    });
  });

  const orderedResults = processes.map(p => resultsMap.get(String(p.id).trim()));

  const sumTat = orderedResults.reduce((acc, r) => acc + r.tat, 0);
  const sumWt = orderedResults.reduce((acc, r) => acc + r.wt, 0);
  const sumRt = orderedResults.reduce((acc, r) => acc + r.rt, 0);
  const busyTime = orderedResults.reduce((acc, r) => acc + r.burst, 0);

  const totalTime = timeline.length > 0 ? timeline[timeline.length - 1].end : 0;
  const totalOverhead = contextSwitches * oh;
  const cpuEfficiency = totalTime > 0 ? (busyTime / totalTime) * 100 : 0;

  return {
    timeline,
    results: orderedResults,
    summary: {
      avgTat: sumTat / n,
      avgWt: sumWt / n,
      avgRt: sumRt / n,
      contextSwitches,
      totalOverhead,
      totalTime,
      busyTime,
      cpuEfficiency
    }
  };
}

// ============================================================================
// 2. VERIFIED GROUND TRUTH & SELF-TEST SUITE
// ============================================================================

const GROUND_TRUTH_CASES = [
  {
    name: 'Activity 1: Quantum = 2, Overhead = 0',
    processes: [
      { id: 'P1', task: 'Water-quality monitoring', arrival: 0, burst: 5 },
      { id: 'P2', task: 'Waste-collection scheduling', arrival: 1, burst: 3 },
      { id: 'P3', task: 'Traffic-pollution analysis', arrival: 2, burst: 4 },
      { id: 'P4', task: 'Public energy-use monitoring', arrival: 3, burst: 2 }
    ],
    quantum: 2,
    overhead: 0,
    expected: {
      timeline: [
        { type: 'PROCESS', id: 'P1', start: 0, end: 2 },
        { type: 'PROCESS', id: 'P2', start: 2, end: 4 },
        { type: 'PROCESS', id: 'P3', start: 4, end: 6 },
        { type: 'PROCESS', id: 'P1', start: 6, end: 8 },
        { type: 'PROCESS', id: 'P4', start: 8, end: 10 },
        { type: 'PROCESS', id: 'P2', start: 10, end: 11 },
        { type: 'PROCESS', id: 'P3', start: 11, end: 13 },
        { type: 'PROCESS', id: 'P1', start: 13, end: 14 }
      ],
      results: [
        { id: 'P1', ct: 14, tat: 14, wt: 9, rt: 0 },
        { id: 'P2', ct: 11, tat: 10, wt: 7, rt: 1 },
        { id: 'P3', ct: 13, tat: 11, wt: 7, rt: 2 },
        { id: 'P4', ct: 10, tat: 7, wt: 5, rt: 5 }
      ],
      avgTat: 10.50,
      avgWt: 7.00,
      avgRt: 2.00,
      contextSwitches: 7,
      totalOverhead: 0,
      totalTime: 14,
      cpuEfficiency: 100.00
    }
  },
  {
    name: 'Activity 1: Quantum = 3, Overhead = 0',
    processes: [
      { id: 'P1', task: 'Water-quality monitoring', arrival: 0, burst: 5 },
      { id: 'P2', task: 'Waste-collection scheduling', arrival: 1, burst: 3 },
      { id: 'P3', task: 'Traffic-pollution analysis', arrival: 2, burst: 4 },
      { id: 'P4', task: 'Public energy-use monitoring', arrival: 3, burst: 2 }
    ],
    quantum: 3,
    overhead: 0,
    expected: {
      timeline: [
        { type: 'PROCESS', id: 'P1', start: 0, end: 3 },
        { type: 'PROCESS', id: 'P2', start: 3, end: 6 },
        { type: 'PROCESS', id: 'P3', start: 6, end: 9 },
        { type: 'PROCESS', id: 'P4', start: 9, end: 11 },
        { type: 'PROCESS', id: 'P1', start: 11, end: 13 },
        { type: 'PROCESS', id: 'P3', start: 13, end: 14 }
      ],
      results: [
        { id: 'P1', ct: 13, tat: 13, wt: 8, rt: 0 },
        { id: 'P2', ct: 6, tat: 5, wt: 2, rt: 2 },
        { id: 'P3', ct: 14, tat: 12, wt: 8, rt: 4 },
        { id: 'P4', ct: 11, tat: 8, wt: 6, rt: 6 }
      ],
      avgTat: 9.50,
      avgWt: 6.00,
      avgRt: 3.00,
      contextSwitches: 5,
      totalOverhead: 0,
      totalTime: 14,
      cpuEfficiency: 100.00
    }
  },
  {
    name: 'Activity 2: Quantum = 2, Overhead = 1',
    processes: [
      { id: 'P1', task: 'Flood-warning analysis', arrival: 0, burst: 5 },
      { id: 'P2', task: 'Air-quality alert generation', arrival: 1, burst: 4 },
      { id: 'P3', task: 'Emergency evacuation route update', arrival: 2, burst: 3 },
      { id: 'P4', task: 'Renewable-grid status monitoring', arrival: 3, burst: 2 }
    ],
    quantum: 2,
    overhead: 1,
    expected: {
      timeline: [
        { type: 'PROCESS', id: 'P1', start: 0, end: 2 },
        { type: 'CONTEXT_SWITCH', id: 'CS', start: 2, end: 3 },
        { type: 'PROCESS', id: 'P2', start: 3, end: 5 },
        { type: 'CONTEXT_SWITCH', id: 'CS', start: 5, end: 6 },
        { type: 'PROCESS', id: 'P3', start: 6, end: 8 },
        { type: 'CONTEXT_SWITCH', id: 'CS', start: 8, end: 9 },
        { type: 'PROCESS', id: 'P1', start: 9, end: 11 },
        { type: 'CONTEXT_SWITCH', id: 'CS', start: 11, end: 12 },
        { type: 'PROCESS', id: 'P4', start: 12, end: 14 },
        { type: 'CONTEXT_SWITCH', id: 'CS', start: 14, end: 15 },
        { type: 'PROCESS', id: 'P2', start: 15, end: 17 },
        { type: 'CONTEXT_SWITCH', id: 'CS', start: 17, end: 18 },
        { type: 'PROCESS', id: 'P3', start: 18, end: 19 },
        { type: 'CONTEXT_SWITCH', id: 'CS', start: 19, end: 20 },
        { type: 'PROCESS', id: 'P1', start: 20, end: 21 }
      ],
      results: [
        { id: 'P1', ct: 21, tat: 21, wt: 16, rt: 0 },
        { id: 'P2', ct: 17, tat: 16, wt: 12, rt: 2 },
        { id: 'P3', ct: 19, tat: 17, wt: 14, rt: 4 },
        { id: 'P4', ct: 14, tat: 11, wt: 9, rt: 9 }
      ],
      avgTat: 16.25,
      avgWt: 12.75,
      avgRt: 3.75,
      contextSwitches: 7,
      totalOverhead: 7,
      totalTime: 21,
      cpuEfficiency: 66.67
    }
  },
  {
    name: 'Activity 2: Quantum = 4, Overhead = 1',
    processes: [
      { id: 'P1', task: 'Flood-warning analysis', arrival: 0, burst: 5 },
      { id: 'P2', task: 'Air-quality alert generation', arrival: 1, burst: 4 },
      { id: 'P3', task: 'Emergency evacuation route update', arrival: 2, burst: 3 },
      { id: 'P4', task: 'Renewable-grid status monitoring', arrival: 3, burst: 2 }
    ],
    quantum: 4,
    overhead: 1,
    expected: {
      timeline: [
        { type: 'PROCESS', id: 'P1', start: 0, end: 4 },
        { type: 'CONTEXT_SWITCH', id: 'CS', start: 4, end: 5 },
        { type: 'PROCESS', id: 'P2', start: 5, end: 9 },
        { type: 'CONTEXT_SWITCH', id: 'CS', start: 9, end: 10 },
        { type: 'PROCESS', id: 'P3', start: 10, end: 13 },
        { type: 'CONTEXT_SWITCH', id: 'CS', start: 13, end: 14 },
        { type: 'PROCESS', id: 'P4', start: 14, end: 16 },
        { type: 'CONTEXT_SWITCH', id: 'CS', start: 16, end: 17 },
        { type: 'PROCESS', id: 'P1', start: 17, end: 18 }
      ],
      results: [
        { id: 'P1', ct: 18, tat: 18, wt: 13, rt: 0 },
        { id: 'P2', ct: 9, tat: 8, wt: 4, rt: 4 },
        { id: 'P3', ct: 13, tat: 11, wt: 8, rt: 8 },
        { id: 'P4', ct: 16, tat: 13, wt: 11, rt: 11 }
      ],
      avgTat: 12.50,
      avgWt: 9.00,
      avgRt: 5.75,
      contextSwitches: 4,
      totalOverhead: 4,
      totalTime: 18,
      cpuEfficiency: 77.78
    }
  }
];

/**
 * Runs automated self-test on the 4 canonical test cases.
 * Returns detailed pass/fail diagnostics.
 */
function runSelfTests() {
  const TOLERANCE = 0.005;
  const testResults = [];
  let passedCount = 0;

  for (const testCase of GROUND_TRUTH_CASES) {
    const diffs = [];
    const actual = roundRobin(testCase.processes, testCase.quantum, testCase.overhead);
    const exp = testCase.expected;

    // 1. Timeline check
    if (actual.timeline.length !== exp.timeline.length) {
      diffs.push(`Timeline length mismatch: expected ${exp.timeline.length}, got ${actual.timeline.length}`);
    } else {
      for (let i = 0; i < exp.timeline.length; i++) {
        const aSeg = actual.timeline[i];
        const eSeg = exp.timeline[i];
        if (aSeg.type !== eSeg.type || aSeg.id !== eSeg.id || aSeg.start !== eSeg.start || aSeg.end !== eSeg.end) {
          diffs.push(`Timeline[${i}] mismatch: expected ${eSeg.type}(${eSeg.id}, ${eSeg.start}-${eSeg.end}), got ${aSeg.type}(${aSeg.id}, ${aSeg.start}-${aSeg.end})`);
        }
      }
    }

    // 2. Per-process metrics check
    for (const eProc of exp.results) {
      const aProc = actual.results.find(r => r.id === eProc.id);
      if (!aProc) {
        diffs.push(`Missing process result for ${eProc.id}`);
        continue;
      }
      if (aProc.ct !== eProc.ct) diffs.push(`${eProc.id} CT mismatch: exp ${eProc.ct}, got ${aProc.ct}`);
      if (aProc.tat !== eProc.tat) diffs.push(`${eProc.id} TAT mismatch: exp ${eProc.tat}, got ${aProc.tat}`);
      if (aProc.wt !== eProc.wt) diffs.push(`${eProc.id} WT mismatch: exp ${eProc.wt}, got ${aProc.wt}`);
      if (aProc.rt !== eProc.rt) diffs.push(`${eProc.id} RT mismatch: exp ${eProc.rt}, got ${aProc.rt}`);
    }

    // 3. Summary metrics check
    if (Math.abs(actual.summary.avgTat - exp.avgTat) > TOLERANCE) {
      diffs.push(`Avg TAT mismatch: exp ${exp.avgTat.toFixed(2)}, got ${actual.summary.avgTat.toFixed(2)}`);
    }
    if (Math.abs(actual.summary.avgWt - exp.avgWt) > TOLERANCE) {
      diffs.push(`Avg WT mismatch: exp ${exp.avgWt.toFixed(2)}, got ${actual.summary.avgWt.toFixed(2)}`);
    }
    if (Math.abs(actual.summary.avgRt - exp.avgRt) > TOLERANCE) {
      diffs.push(`Avg RT mismatch: exp ${exp.avgRt.toFixed(2)}, got ${actual.summary.avgRt.toFixed(2)}`);
    }
    if (actual.summary.contextSwitches !== exp.contextSwitches) {
      diffs.push(`Context Switches mismatch: exp ${exp.contextSwitches}, got ${actual.summary.contextSwitches}`);
    }
    if (actual.summary.totalOverhead !== exp.totalOverhead) {
      diffs.push(`Total Overhead mismatch: exp ${exp.totalOverhead}, got ${actual.summary.totalOverhead}`);
    }
    if (actual.summary.totalTime !== exp.totalTime) {
      diffs.push(`Total Time mismatch: exp ${exp.totalTime}, got ${actual.summary.totalTime}`);
    }
    if (Math.abs(actual.summary.cpuEfficiency - exp.cpuEfficiency) > TOLERANCE) {
      diffs.push(`CPU Efficiency mismatch: exp ${exp.cpuEfficiency.toFixed(2)}%, got ${actual.summary.cpuEfficiency.toFixed(2)}%`);
    }

    const pass = diffs.length === 0;
    if (pass) passedCount++;
    testResults.push({
      name: testCase.name,
      pass,
      diffs,
      actual,
      expected: exp
    });
  }

  return {
    total: GROUND_TRUTH_CASES.length,
    passed: passedCount,
    allPassed: passedCount === GROUND_TRUTH_CASES.length,
    results: testResults
  };
}

// ============================================================================
// 3. APPLICATION STATE & PRESETS
// ============================================================================

const PRESETS = {
  act1: {
    title: 'Smart Municipal Control Centre',
    description: 'SDG 6 Clean Water and Sanitation, SDG 11 Sustainable Cities and Communities, SDG 12 Responsible Consumption and Production. Round Robin scheduling without context-switch latency.',
    sdgs: [
      { id: 'SDG 6', name: 'Clean Water and Sanitation', color: '#26BDE2' },
      { id: 'SDG 11', name: 'Sustainable Cities & Communities', color: '#FD9D24' },
      { id: 'SDG 12', name: 'Responsible Consumption & Production', color: '#BF8B2E' }
    ],
    quantumA: 2,
    quantumB: 3,
    overhead: 0,
    processes: [
      { id: 'P1', task: 'Water-quality monitoring', arrival: 0, burst: 5 },
      { id: 'P2', task: 'Waste-collection scheduling', arrival: 1, burst: 3 },
      { id: 'P3', task: 'Traffic-pollution analysis', arrival: 2, burst: 4 },
      { id: 'P4', task: 'Public energy-use monitoring', arrival: 3, burst: 2 }
    ]
  },
  act2: {
    title: 'Climate Emergency Response Centre',
    description: 'SDG 11 Sustainable Cities and Communities, SDG 13 Climate Action. Round Robin scheduling with 1 ms context-switch overhead latency.',
    sdgs: [
      { id: 'SDG 11', name: 'Sustainable Cities & Communities', color: '#FD9D24' },
      { id: 'SDG 13', name: 'Climate Action', color: '#3F7E44' }
    ],
    quantumA: 2,
    quantumB: 4,
    overhead: 1,
    processes: [
      { id: 'P1', task: 'Flood-warning analysis', arrival: 0, burst: 5 },
      { id: 'P2', task: 'Air-quality alert generation', arrival: 1, burst: 4 },
      { id: 'P3', task: 'Emergency evacuation route update', arrival: 2, burst: 3 },
      { id: 'P4', task: 'Renewable-grid status monitoring', arrival: 3, burst: 2 }
    ]
  },
  custom: {
    title: 'Custom Workload Sandbox',
    description: 'Experiment freely with custom process arrivals, execution bursts, time quanta, and switch overheads.',
    sdgs: [
      { id: 'Custom', name: 'User Defined Workload', color: '#6366f1' }
    ],
    quantumA: 2,
    quantumB: 3,
    overhead: 0,
    processes: [
      { id: 'P1', task: 'Water-quality monitoring', arrival: 0, burst: 5 },
      { id: 'P2', task: 'Waste-collection scheduling', arrival: 1, burst: 3 },
      { id: 'P3', task: 'Traffic-pollution analysis', arrival: 2, burst: 4 },
      { id: 'P4', task: 'Public energy-use monitoring', arrival: 3, burst: 2 }
    ]
  }
};

// Deep clone function
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Independent application state per tab
const appState = {
  activeTab: 'act1',
  tabs: {
    act1: deepClone(PRESETS.act1),
    act2: deepClone(PRESETS.act2),
    custom: deepClone(PRESETS.custom)
  },
  autoRun: true,
  debounceTimer: null
};

// 12 Accessible Process Color Tokens
const PROCESS_COLORS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#0891b2', // Cyan
  '#65a30d', // Lime
  '#ea580c', // Orange
  '#4f46e5', // Indigo
  '#0d9488', // Teal
  '#be123c', // Rose
  '#9333ea'  // Violet
];

/**
 * Returns a stable, deterministic color for any process ID.
 */
function getProcessColor(processId, allProcesses) {
  const index = allProcesses.findIndex(p => String(p.id).trim() === String(processId).trim());
  if (index >= 0) {
    return PROCESS_COLORS[index % PROCESS_COLORS.length];
  }
  // Fallback hash
  let hash = 0;
  for (let i = 0; i < processId.length; i++) {
    hash = processId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROCESS_COLORS[Math.abs(hash) % PROCESS_COLORS.length];
}

// ============================================================================
// 4. UI CONTROLLER & RENDERING
// ============================================================================

/**
 * Renders the active tab's scenario title, description, and SDG badges.
 */
function renderScenarioBanner() {
  const current = appState.tabs[appState.activeTab];
  const titleEl = document.getElementById('scenario-title');
  const descEl = document.getElementById('scenario-desc');
  const badgesEl = document.getElementById('sdg-badges');

  if (titleEl) titleEl.textContent = current.title;
  if (descEl) descEl.textContent = current.description;

  if (badgesEl) {
    badgesEl.innerHTML = '';
    current.sdgs.forEach(sdg => {
      const pill = document.createElement('span');
      pill.className = 'sdg-pill';
      pill.style.backgroundColor = sdg.color;
      pill.textContent = `${sdg.id}: ${sdg.name}`;
      badgesEl.appendChild(pill);
    });
  }
}

/**
 * Renders the process configuration table rows with editable inputs.
 */
function renderProcessTable() {
  const current = appState.tabs[appState.activeTab];
  const tbody = document.getElementById('process-table-body');
  const counter = document.getElementById('process-counter');
  const addBtn = document.getElementById('add-process-btn');

  if (!tbody) return;
  tbody.innerHTML = '';

  current.processes.forEach((proc, index) => {
    const tr = document.createElement('tr');
    tr.dataset.index = index;

    // Process ID
    const tdId = document.createElement('td');
    const inputId = document.createElement('input');
    inputId.type = 'text';
    inputId.className = 'form-control cell-input-id';
    inputId.value = proc.id;
    inputId.dataset.field = 'id';
    inputId.dataset.index = index;
    inputId.setAttribute('aria-label', `Process ID for row ${index + 1}`);
    tdId.appendChild(inputId);

    // Task Description
    const tdTask = document.createElement('td');
    const inputTask = document.createElement('input');
    inputTask.type = 'text';
    inputTask.className = 'form-control cell-input-task';
    inputTask.value = proc.task;
    inputTask.dataset.field = 'task';
    inputTask.dataset.index = index;
    inputTask.title = proc.task;
    inputTask.setAttribute('aria-label', `Task Description for row ${index + 1}`);
    tdTask.appendChild(inputTask);

    // Arrival Time
    const tdArr = document.createElement('td');
    const inputArr = document.createElement('input');
    inputArr.type = 'number';
    inputArr.className = 'form-control cell-input-num';
    inputArr.min = '0';
    inputArr.step = '1';
    inputArr.value = proc.arrival;
    inputArr.dataset.field = 'arrival';
    inputArr.dataset.index = index;
    inputArr.setAttribute('aria-label', `Arrival time for process ${proc.id}`);
    tdArr.appendChild(inputArr);

    // Burst Time
    const tdBurst = document.createElement('td');
    const inputBurst = document.createElement('input');
    inputBurst.type = 'number';
    inputBurst.className = 'form-control cell-input-num';
    inputBurst.min = '1';
    inputBurst.step = '1';
    inputBurst.value = proc.burst;
    inputBurst.dataset.field = 'burst';
    inputBurst.dataset.index = index;
    inputBurst.setAttribute('aria-label', `Burst time for process ${proc.id}`);
    tdBurst.appendChild(inputBurst);

    // Action (Delete)
    const tdAction = document.createElement('td');
    tdAction.className = 'text-center';
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-danger-outline btn-sm delete-row-btn';
    delBtn.dataset.index = index;
    delBtn.title = current.processes.length <= 1 ? 'At least one process is required' : 'Delete this process';
    delBtn.disabled = current.processes.length <= 1;
    delBtn.setAttribute('aria-label', `Delete process ${proc.id}`);
    delBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
    counter.textContent = `${current.processes.length} / 12 processes`;
  }
  if (addBtn) {
    addBtn.disabled = current.processes.length >= 12;
    addBtn.title = current.processes.length >= 12 ? 'Maximum 12 processes reached' : 'Add a new process';
  }

  // Sync parameters inputs
  const qaInput = document.getElementById('quantum-a-input');
  const qbInput = document.getElementById('quantum-b-input');
  const ohInput = document.getElementById('overhead-input');
  if (qaInput) qaInput.value = current.quantumA;
  if (qbInput) qbInput.value = current.quantumB;
  if (ohInput) ohInput.value = current.overhead;
}

/**
 * Validates the current input state.
 * Returns { valid: boolean, errors: Array<string> }
 */
function validateInputs() {
  const current = appState.tabs[appState.activeTab];
  const errors = [];

  // Reset error highlights
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

  // Validate Quanta and Overhead
  const qa = Number(current.quantumA);
  const qb = Number(current.quantumB);
  const oh = Number(current.overhead);

  const qaInput = document.getElementById('quantum-a-input');
  const qbInput = document.getElementById('quantum-b-input');
  const ohInput = document.getElementById('overhead-input');

  if (!Number.isInteger(qa) || qa < 1) {
    errors.push('Quantum A must be an integer >= 1');
    if (qaInput) qaInput.classList.add('input-error');
  }
  if (!Number.isInteger(qb) || qb < 1) {
    errors.push('Quantum B must be an integer >= 1');
    if (qbInput) qbInput.classList.add('input-error');
  }
  if (!Number.isInteger(oh) || oh < 0) {
    errors.push('Context Switch Overhead must be an integer >= 0');
    if (ohInput) ohInput.classList.add('input-error');
  }

  // Validate Processes
  if (!Array.isArray(current.processes) || current.processes.length === 0) {
    errors.push('At least one process must be configured');
  } else {
    const seenIds = new Set();
    current.processes.forEach((p, idx) => {
      const row = document.querySelector(`tr[data-index="${idx}"]`);
      const idStr = String(p.id).trim();

      // Check ID
      if (!idStr) {
        errors.push(`Row ${idx + 1}: Process ID cannot be empty`);
        if (row) row.querySelector('[data-field="id"]')?.classList.add('input-error');
      } else if (seenIds.has(idStr.toLowerCase())) {
        errors.push(`Row ${idx + 1}: Duplicate Process ID "${idStr}" detected. IDs must be unique`);
        if (row) row.querySelector('[data-field="id"]')?.classList.add('input-error');
      } else {
        seenIds.add(idStr.toLowerCase());
      }

      // Check Arrival
      const arr = Number(p.arrival);
      if (!Number.isInteger(arr) || arr < 0) {
        errors.push(`Process ${p.id || '#' + (idx + 1)}: Arrival time must be an integer >= 0`);
        if (row) row.querySelector('[data-field="arrival"]')?.classList.add('input-error');
      }

      // Check Burst
      const burst = Number(p.burst);
      if (!Number.isInteger(burst) || burst < 1) {
        errors.push(`Process ${p.id || '#' + (idx + 1)}: Burst time must be an integer >= 1`);
        if (row) row.querySelector('[data-field="burst"]')?.classList.add('input-error');
      }
    });
  }

  const valid = errors.length === 0;
  const valBox = document.getElementById('validation-box');
  const valText = document.getElementById('validation-message-text');
  const staleBanner = document.getElementById('stale-banner');
  const resultsWrapper = document.getElementById('results-wrapper');

  if (!valid) {
    if (valBox) {
      valBox.classList.remove('hidden');
      if (valText) {
        valText.innerHTML = errors.map(e => `<div>&bull; ${e}</div>`).join('');
      }
    }
    if (staleBanner) staleBanner.classList.remove('hidden');
    if (resultsWrapper) resultsWrapper.classList.add('stale-opacity');
  } else {
    if (valBox) valBox.classList.add('hidden');
    if (staleBanner) staleBanner.classList.add('hidden');
    if (resultsWrapper) resultsWrapper.classList.remove('stale-opacity');
  }

  return { valid, errors };
}

/**
 * Renders the unified color legend for all processes, context switch, and idle blocks.
 */
function renderLegend(processes) {
  const container = document.getElementById('unified-legend');
  if (!container) return;
  container.innerHTML = '';

  // Process items
  processes.forEach(p => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    const color = getProcessColor(p.id, processes);
    item.innerHTML = `
      <span class="legend-color-box" style="background-color: ${color};"></span>
      <span style="font-weight: 700; font-family: var(--font-mono);">${p.id}</span>
      <span style="color: var(--text-muted);">&bull; ${p.task}</span>
    `;
    container.appendChild(item);
  });

  // Context Switch Item
  const csItem = document.createElement('div');
  csItem.className = 'legend-item';
  csItem.innerHTML = `
    <span class="legend-color-box legend-color-cs"></span>
    <span style="font-weight: 700; font-family: var(--font-mono);">CS</span>
    <span style="color: var(--text-muted);">&bull; Context Switch Overhead</span>
  `;
  container.appendChild(csItem);

  // Idle Item
  const idleItem = document.createElement('div');
  idleItem.className = 'legend-item';
  idleItem.innerHTML = `
    <span class="legend-color-box legend-color-idle"></span>
    <span style="font-weight: 700; font-family: var(--font-mono);">Idle</span>
    <span style="color: var(--text-muted);">&bull; CPU Idle</span>
  `;
  container.appendChild(idleItem);
}

/**
 * Renders a horizontal Gantt chart track and time axis.
 */
function renderGanttChart(trackId, axisId, timeline, totalTime, processes) {
  const track = document.getElementById(trackId);
  const axis = document.getElementById(axisId);
  if (!track || !axis) return;

  track.innerHTML = '';
  axis.innerHTML = '';

  if (totalTime <= 0 || !timeline || timeline.length === 0) {
    track.innerHTML = '<div style="padding: 1rem; color: var(--text-muted);">No timeline data</div>';
    return;
  }

  // Set minimum pixel width so chart scrolls cleanly rather than squishing
  const minWidthPx = Math.max(500, totalTime * 38);
  track.style.minWidth = `${minWidthPx}px`;
  axis.style.minWidth = `${minWidthPx}px`;

  // Segment boundaries collection for axis ticks
  const boundaries = new Set([0]);

  timeline.forEach((seg, idx) => {
    boundaries.add(seg.end);
    const duration = seg.end - seg.start;
    const widthPct = (duration / totalTime) * 100;

    const block = document.createElement('div');
    block.className = 'gantt-block';
    block.style.width = `${widthPct}%`;

    let labelText = seg.id;
    let tooltip = '';

    if (seg.type === 'PROCESS') {
      const color = getProcessColor(seg.id, processes);
      block.style.backgroundColor = color;
      tooltip = `Process: ${seg.id}\nTask: ${seg.task || ''}\nStart: ${seg.start} ms\nEnd: ${seg.end} ms\nDuration: ${duration} ms`;
    } else if (seg.type === 'CONTEXT_SWITCH') {
      block.classList.add('gantt-block-cs');
      labelText = 'CS';
      tooltip = `Context Switch Overhead\nStart: ${seg.start} ms\nEnd: ${seg.end} ms\nDuration: ${duration} ms`;
    } else if (seg.type === 'IDLE') {
      block.classList.add('gantt-block-idle');
      labelText = 'Idle';
      tooltip = `CPU Idle\nStart: ${seg.start} ms\nEnd: ${seg.end} ms\nDuration: ${duration} ms`;
    }

    block.title = tooltip;

    const spanText = document.createElement('span');
    spanText.className = 'gantt-block-text';
    spanText.textContent = labelText;
    block.appendChild(spanText);

    track.appendChild(block);
  });

  // Render Time Axis Ticks at every segment boundary
  const sortedTimes = Array.from(boundaries).sort((a, b) => a - b);
  sortedTimes.forEach(t => {
    const leftPct = (t / totalTime) * 100;
    const tick = document.createElement('div');
    tick.className = 'gantt-tick';
    tick.style.left = `${leftPct}%`;

    // Boundary tick positioning to avoid clipping container edges
    if (t === 0) {
      tick.style.transform = 'translateX(0)';
    } else if (t === totalTime) {
      tick.style.transform = 'translateX(-100%)';
    } else {
      tick.style.transform = 'translateX(-50%)';
    }

    tick.innerHTML = `
      <div class="gantt-tick-line"></div>
      <div class="gantt-tick-label">${t}</div>
    `;
    axis.appendChild(tick);
  });
}

/**
 * Renders the per-process results table.
 */
function renderResultsTable(tbodyId, results) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';

  results.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 700; font-family: var(--font-mono);">${r.id}</td>
      <td class="process-task-cell" title="${r.task}">${r.task}</td>
      <td class="text-right">${r.arrival}</td>
      <td class="text-right">${r.burst}</td>
      <td class="text-right"><strong>${r.ct}</strong></td>
      <td class="text-right">${r.tat}</td>
      <td class="text-right">${r.wt}</td>
      <td class="text-right">${r.rt}</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Renders the performance summary cards for a quantum configuration.
 */
function renderSummaryCards(containerId, summary, overhead) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const cards = [
    { label: 'Avg Turnaround', value: summary.avgTat.toFixed(2), unit: 'ms' },
    { label: 'Avg Waiting', value: summary.avgWt.toFixed(2), unit: 'ms' },
    { label: 'Avg Response', value: summary.avgRt.toFixed(2), unit: 'ms' },
    { label: 'Context Switches', value: summary.contextSwitches, unit: 'switches' },
    { label: 'Total Elapsed Time', value: summary.totalTime, unit: 'ms' }
  ];

  // Only show Total Overhead and CPU Efficiency when overhead > 0
  if (overhead > 0) {
    cards.push({ label: 'Total Overhead', value: summary.totalOverhead, unit: 'ms' });
    cards.push({ label: 'CPU Efficiency', value: summary.cpuEfficiency.toFixed(2), unit: '%' });
  }

  cards.forEach(c => {
    const cardEl = document.createElement('div');
    cardEl.className = 'summary-card';
    cardEl.innerHTML = `
      <span class="summary-label">${c.label}</span>
      <span class="summary-value">${c.value}<span class="summary-unit">${c.unit}</span></span>
    `;
    container.appendChild(cardEl);
  });
}

/**
 * Renders the side-by-side metric comparison table.
 */
function renderComparison(summaryA, summaryB, overhead, quantumA, quantumB) {
  const tbody = document.getElementById('comparison-table-body');
  const notice = document.getElementById('identical-quanta-notice');
  const colA = document.getElementById('col-header-qa');
  const colB = document.getElementById('col-header-qb');

  if (colA) colA.textContent = `Quantum A (q = ${quantumA} ms)`;
  if (colB) colB.textContent = `Quantum B (q = ${quantumB} ms)`;

  if (!tbody) return;
  tbody.innerHTML = '';

  if (quantumA === quantumB) {
    if (notice) notice.classList.remove('hidden');
  } else {
    if (notice) notice.classList.add('hidden');
  }

  // Metric definitions
  // direction: 'lower' | 'higher'
  const metrics = [
    { key: 'avgTat', name: 'Average Turnaround Time (TAT)', unit: ' ms', decimals: 2, better: 'lower' },
    { key: 'avgWt', name: 'Average Waiting Time (WT)', unit: ' ms', decimals: 2, better: 'lower' },
    { key: 'avgRt', name: 'Average Response Time (RT)', unit: ' ms', decimals: 2, better: 'lower' },
    { key: 'contextSwitches', name: 'Context Switches Count', unit: '', decimals: 0, better: 'lower' },
    { key: 'totalTime', name: 'Total Elapsed Schedule Time', unit: ' ms', decimals: 0, better: 'lower' }
  ];

  if (overhead > 0) {
    metrics.push({ key: 'totalOverhead', name: 'Total Switch Overhead Cost', unit: ' ms', decimals: 0, better: 'lower' });
    metrics.push({ key: 'cpuEfficiency', name: 'CPU Utilization Efficiency', unit: '%', decimals: 2, better: 'higher' });
  }

  metrics.forEach(m => {
    const valA = summaryA[m.key];
    const valB = summaryB[m.key];

    let valAStr = m.decimals > 0 ? valA.toFixed(m.decimals) : String(valA);
    let valBStr = m.decimals > 0 ? valB.toFixed(m.decimals) : String(valB);

    let winner = 'Tie';
    let winBadge = `<span class="badge-tie">Tie</span>`;
    let winValA = false;
    let winValB = false;

    const diff = valA - valB;
    const isDifferent = Math.abs(diff) > 0.0001;

    if (isDifferent) {
      if (m.better === 'lower') {
        if (diff < 0) {
          winner = 'Quantum A';
          winValA = true;
          winBadge = `<span class="badge-win">Quantum A (${valAStr}${m.unit})</span>`;
        } else {
          winner = 'Quantum B';
          winValB = true;
          winBadge = `<span class="badge-win">Quantum B (${valBStr}${m.unit})</span>`;
        }
      } else {
        // higher is better
        if (diff > 0) {
          winner = 'Quantum A';
          winValA = true;
          winBadge = `<span class="badge-win">Quantum A (${valAStr}${m.unit})</span>`;
        } else {
          winner = 'Quantum B';
          winValB = true;
          winBadge = `<span class="badge-win">Quantum B (${valBStr}${m.unit})</span>`;
        }
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="comparison-metric-name">${m.name}</td>
      <td class="text-center metric-val" style="${winValA ? 'color: var(--success);' : ''}">${valAStr}${m.unit}</td>
      <td class="text-center metric-val" style="${winValB ? 'color: var(--success);' : ''}">${valBStr}${m.unit}</td>
      <td class="text-center">${winBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Generates the deterministic recommendation and trade-off analysis.
 */
function renderRecommendation(summaryA, summaryB, overhead, quantumA, quantumB) {
  const container = document.getElementById('recommendation-text-container');
  const badge = document.getElementById('rec-winner-badge');
  if (!container) return;

  if (quantumA === quantumB) {
    if (badge) badge.textContent = `Equal (q = ${quantumA} ms)`;
    container.innerHTML = `
      <p>Both <strong>Quantum A</strong> and <strong>Quantum B</strong> are configured to <strong>${quantumA} ms</strong>. Because the time slices and workload are identical, both schedulers produce equivalent execution timelines, context switches (${summaryA.contextSwitches}), and average metrics (Waiting Time: <strong>${summaryA.avgWt.toFixed(2)} ms</strong>, Turnaround Time: <strong>${summaryA.avgTat.toFixed(2)} ms</strong>).</p>
    `;
    return;
  }

  // Decision rule:
  // 1. Lowest average WT
  // 2. If tied, fewer context switches
  // 3. If tied, lower average RT
  // 4. If tied, smaller quantum
  let winner = 'A';
  let reason = '';

  const wtDiff = summaryA.avgWt - summaryB.avgWt;
  if (Math.abs(wtDiff) > 0.0001) {
    winner = wtDiff < 0 ? 'A' : 'B';
    reason = 'it minimizes average waiting time across processes';
  } else {
    const csDiff = summaryA.contextSwitches - summaryB.contextSwitches;
    if (csDiff !== 0) {
      winner = csDiff < 0 ? 'A' : 'B';
      reason = 'it minimizes context switch overhead with tied waiting times';
    } else {
      const rtDiff = summaryA.avgRt - summaryB.avgRt;
      if (Math.abs(rtDiff) > 0.0001) {
        winner = rtDiff < 0 ? 'A' : 'B';
        reason = 'it delivers superior initial response responsiveness with tied waiting times and switches';
      } else {
        winner = quantumA <= quantumB ? 'A' : 'B';
        reason = 'it employs the more conservative quantum under tied operational metrics';
      }
    }
  }

  const other = winner === 'A' ? 'B' : 'A';
  const winQ = winner === 'A' ? quantumA : quantumB;
  const otherQ = other === 'A' ? quantumA : quantumB;
  const winSum = winner === 'A' ? summaryA : summaryB;
  const otherSum = other === 'A' ? summaryA : summaryB;

  if (badge) {
    badge.textContent = `Recommended: Quantum ${winner} (q = ${winQ} ms)`;
  }

  let textHtml = `
    <p>
      <strong>Quantum ${winner} (<var>q</var> = ${winQ} ms)</strong> is recommended because ${reason}.
      It yields an average Waiting Time of <strong>${winSum.avgWt.toFixed(2)} ms</strong> (versus ${otherSum.avgWt.toFixed(2)} ms for Quantum ${other}), an average Turnaround Time of <strong>${winSum.avgTat.toFixed(2)} ms</strong> (versus ${otherSum.avgTat.toFixed(2)} ms), and requires <strong>${winSum.contextSwitches} context switches</strong> (versus ${otherSum.contextSwitches}).
    </p>
  `;

  if (overhead > 0) {
    textHtml += `
      <p>
        Under a context switch overhead of <strong>${overhead} ms</strong>, Quantum ${winner} incurs a total switching penalty of <strong>${winSum.totalOverhead} ms</strong>, achieving <strong>${winSum.cpuEfficiency.toFixed(2)}%</strong> CPU utilization efficiency (compared to ${otherSum.totalOverhead} ms overhead and ${otherSum.cpuEfficiency.toFixed(2)}% efficiency for Quantum ${other}).
      </p>
    `;
  }

  // Trade-off check: did the other quantum achieve better response time?
  if (otherSum.avgRt < winSum.avgRt - 0.0001) {
    textHtml += `
      <div class="tradeoff-box">
        <strong>Architectural Trade-off:</strong> Quantum ${other} (<var>q</var> = ${otherQ} ms) achieves a faster initial average Response Time of <strong>${otherSum.avgRt.toFixed(2)} ms</strong> compared to <strong>${winSum.avgRt.toFixed(2)} ms</strong> for Quantum ${winner}. In interactive or real-time priority systems, this faster initial dispatch may be desirable, though it comes at the expense of higher overall waiting time and increased schedule fragmentation.
      </div>
    `;
  } else if (winSum.avgRt < otherSum.avgRt - 0.0001) {
    textHtml += `
      <div class="tradeoff-box">
        <strong>Performance Advantage:</strong> Quantum ${winner} also delivers superior initial responsiveness, achieving an average Response Time of <strong>${winSum.avgRt.toFixed(2)} ms</strong> versus <strong>${otherSum.avgRt.toFixed(2)} ms</strong> for Quantum ${other}.
      </div>
    `;
  } else {
    textHtml += `
      <div class="tradeoff-box">
        <strong>Response Time Parity:</strong> Both quantum configurations deliver an identical average Response Time of <strong>${winSum.avgRt.toFixed(2)} ms</strong>.
      </div>
    `;
  }

  container.innerHTML = textHtml;
}

/**
 * Runs the simulation for both quanta and updates all UI displays.
 */
function runSimulation() {
  const { valid } = validateInputs();
  if (!valid) return;

  const current = appState.tabs[appState.activeTab];
  const procs = current.processes;
  const qa = Number(current.quantumA);
  const qb = Number(current.quantumB);
  const oh = Number(current.overhead);

  // Update header quantum values
  const valQa = document.getElementById('label-val-qa');
  const valQb = document.getElementById('label-val-qb');
  if (valQa) valQa.textContent = qa;
  if (valQb) valQb.textContent = qb;

  // Run pure algorithm engine for Quantum A & Quantum B
  const simA = roundRobin(procs, qa, oh);
  const simB = roundRobin(procs, qb, oh);

  // Render Legend
  renderLegend(procs);

  // Render Quantum A Views
  renderGanttChart('gantt-track-qa', 'gantt-axis-qa', simA.timeline, simA.summary.totalTime, procs);
  renderResultsTable('results-tbody-qa', simA.results);
  renderSummaryCards('summary-grid-qa', simA.summary, oh);

  // Render Quantum B Views
  renderGanttChart('gantt-track-qb', 'gantt-axis-qb', simB.timeline, simB.summary.totalTime, procs);
  renderResultsTable('results-tbody-qb', simB.results);
  renderSummaryCards('summary-grid-qb', simB.summary, oh);

  // Render Comparison & Recommendation
  renderComparison(simA.summary, simB.summary, oh, qa, qb);
  renderRecommendation(simA.summary, simB.summary, oh, qa, qb);
}

/**
 * Debounced trigger for auto-run.
 */
function triggerAutoRun() {
  if (!appState.autoRun) return;
  if (appState.debounceTimer) clearTimeout(appState.debounceTimer);
  appState.debounceTimer = setTimeout(() => {
    runSimulation();
  }, 250);
}

// ============================================================================
// 5. EVENT HANDLERS & INITIALIZATION
// ============================================================================

/**
 * Initializes theme toggle and loads stored preference from localStorage.
 */
function initTheme() {
  const themeBtn = document.getElementById('theme-toggle-btn');
  let currentTheme = 'light';
  try {
    const saved = localStorage.getItem('sdg_scheduler_theme');
    if (saved === 'dark' || saved === 'light') {
      currentTheme = saved;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      currentTheme = 'dark';
    }
  } catch (e) {
    // Ignore localStorage restrictions
  }

  document.documentElement.setAttribute('data-theme', currentTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', active);
      try {
        localStorage.setItem('sdg_scheduler_theme', active);
      } catch (e) {
        // Ignore
      }
    });
  }
}

/**
 * Initializes tab switching.
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      if (targetTab === appState.activeTab) return;

      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      appState.activeTab = targetTab;
      renderScenarioBanner();
      renderProcessTable();
      runSimulation();
    });
  });
}

/**
 * Sets up listeners for editing process rows, adding/deleting processes, and parameter changes.
 */
function initInputListeners() {
  const tbody = document.getElementById('process-table-body');
  const addBtn = document.getElementById('add-process-btn');
  const resetBtn = document.getElementById('reset-preset-btn');
  const runBtn = document.getElementById('run-simulation-btn');
  const autoRunSwitch = document.getElementById('auto-run-switch');
  const qaInput = document.getElementById('quantum-a-input');
  const qbInput = document.getElementById('quantum-b-input');
  const ohInput = document.getElementById('overhead-input');

  // Input change delegation on process table
  if (tbody) {
    tbody.addEventListener('input', (e) => {
      const target = e.target;
      if (!target || !target.dataset.field) return;

      const idx = Number(target.dataset.index);
      const field = target.dataset.field;
      const current = appState.tabs[appState.activeTab];
      if (!current.processes[idx]) return;

      if (field === 'id') {
        current.processes[idx].id = target.value;
      } else if (field === 'task') {
        current.processes[idx].task = target.value;
        target.title = target.value;
      } else if (field === 'arrival') {
        current.processes[idx].arrival = Number(target.value);
      } else if (field === 'burst') {
        current.processes[idx].burst = Number(target.value);
      }

      triggerAutoRun();
    });

    // Delete process row
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.delete-row-btn');
      if (!btn) return;
      const idx = Number(btn.dataset.index);
      const current = appState.tabs[appState.activeTab];
      if (current.processes.length <= 1) return;

      current.processes.splice(idx, 1);
      renderProcessTable();
      runSimulation();
    });
  }

  // Add process button
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const current = appState.tabs[appState.activeTab];
      if (current.processes.length >= 12) return;

      // Find next available process ID
      const existingIds = new Set(current.processes.map(p => p.id.toUpperCase()));
      let nextNum = current.processes.length + 1;
      while (existingIds.has(`P${nextNum}`)) {
        nextNum++;
      }
      const newId = `P${nextNum}`;

      current.processes.push({
        id: newId,
        task: `Task ${newId}`,
        arrival: 0,
        burst: 1
      });

      renderProcessTable();
      runSimulation();
    });
  }

  // Simulation parameter inputs
  if (qaInput) {
    qaInput.addEventListener('input', () => {
      appState.tabs[appState.activeTab].quantumA = Number(qaInput.value);
      triggerAutoRun();
    });
  }
  if (qbInput) {
    qbInput.addEventListener('input', () => {
      appState.tabs[appState.activeTab].quantumB = Number(qbInput.value);
      triggerAutoRun();
    });
  }
  if (ohInput) {
    ohInput.addEventListener('input', () => {
      appState.tabs[appState.activeTab].overhead = Number(ohInput.value);
      triggerAutoRun();
    });
  }

  // Reset to preset button
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const tab = appState.activeTab;
      appState.tabs[tab] = deepClone(PRESETS[tab]);
      renderScenarioBanner();
      renderProcessTable();
      runSimulation();
    });
  }

  // Manual run button
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      runSimulation();
    });
  }

  // Auto-run toggle switch
  if (autoRunSwitch) {
    autoRunSwitch.addEventListener('change', () => {
      appState.autoRun = autoRunSwitch.checked;
      if (appState.autoRun) {
        runSimulation();
      }
    });
  }
}

/**
 * Initializes the Self-Test modal dialog and runner.
 */
function initSelfTestModal() {
  const modal = document.getElementById('self-test-modal');
  const openBtn = document.getElementById('open-self-test-btn');
  const closeBtn = document.getElementById('close-modal-btn');
  const closeBottomBtn = document.getElementById('close-modal-bottom-btn');
  const testBody = document.getElementById('modal-test-body');
  const statusSummary = document.getElementById('modal-status-summary');

  function renderModalResults() {
    const report = runSelfTests();
    if (!testBody) return;
    testBody.innerHTML = '';

    report.results.forEach((test, idx) => {
      const card = document.createElement('div');
      card.className = 'test-case-item';

      const header = document.createElement('div');
      header.className = 'test-case-header';
      header.innerHTML = `
        <span class="test-case-title">Case ${idx + 1}: ${test.name}</span>
        <span class="${test.pass ? 'badge-pass' : 'badge-fail'}">${test.pass ? 'PASS' : 'FAIL'}</span>
      `;
      card.appendChild(header);

      if (!test.pass) {
        const diffList = document.createElement('ul');
        diffList.className = 'test-diff-list';
        test.diffs.forEach(d => {
          const li = document.createElement('li');
          li.textContent = d;
          diffList.appendChild(li);
        });
        card.appendChild(diffList);
      } else {
        const specGrid = document.createElement('div');
        specGrid.className = 'test-spec-grid';
        specGrid.innerHTML = `
          <div><span>Avg TAT:</span> <strong>${test.actual.summary.avgTat.toFixed(2)} ms</strong></div>
          <div><span>Avg WT:</span> <strong>${test.actual.summary.avgWt.toFixed(2)} ms</strong></div>
          <div><span>Avg RT:</span> <strong>${test.actual.summary.avgRt.toFixed(2)} ms</strong></div>
          <div><span>Switches:</span> <strong>${test.actual.summary.contextSwitches}</strong></div>
          <div><span>Overhead:</span> <strong>${test.actual.summary.totalOverhead} ms</strong></div>
          <div><span>Total Time:</span> <strong>${test.actual.summary.totalTime} ms</strong></div>
          <div><span>CPU Eff:</span> <strong>${test.actual.summary.cpuEfficiency.toFixed(2)}%</strong></div>
        `;
        card.appendChild(specGrid);
      }

      testBody.appendChild(card);
    });

    if (statusSummary) {
      statusSummary.innerHTML = `Summary: <strong>${report.passed}/${report.total} test suites verified</strong> (${report.allPassed ? 'All Ground-Truth Assertions Passed' : 'Failures Detected'})`;
    }
  }

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      renderModalResults();
      modal.showModal();
    });
  }

  function closeModal() {
    if (modal) modal.close();
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (closeBottomBtn) closeBottomBtn.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      const rect = modal.getBoundingClientRect();
      const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!isInDialog) {
        modal.close();
      }
    });
  }
}

// ============================================================================
// 6. DOM READY BOOTSTRAP
// ============================================================================

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Run self-tests automatically on page load and log single line
    const selfTestReport = runSelfTests();
    if (selfTestReport.allPassed) {
      console.log(`Self-test: ${selfTestReport.passed}/${selfTestReport.total} passed`);
    } else {
      console.error(`Self-test: ${selfTestReport.passed}/${selfTestReport.total} passed (failures detected)`, selfTestReport);
    }

    // 2. Initialize UI modules
    initTheme();
    initTabs();
    initInputListeners();
    initSelfTestModal();

    // 3. Render initial views for default preset (Activity 1)
    renderScenarioBanner();
    renderProcessTable();
    runSimulation();
  });
}

// Export for Node testing environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { roundRobin, runSelfTests, GROUND_TRUTH_CASES, PRESETS };
}
