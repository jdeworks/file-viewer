// HL7 v2.x message viewer — parses pipe-delimited segments.
// Sensitive health data: values shown, no redaction by default (files are local).
// Security note: file-viewer never transmits file content anywhere.

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Well-known segment descriptions
const SEG_LABEL = {
  MSH: 'Message Header', PID: 'Patient Identification', PV1: 'Patient Visit',
  OBR: 'Observation Request', OBX: 'Observation Result', ORC: 'Common Order',
  DG1: 'Diagnosis', AL1: 'Patient Allergy', NK1: 'Next of Kin',
  NTE: 'Notes / Comments', MSA: 'Message Acknowledgment', ERR: 'Error',
  EVN: 'Event Type', MRG: 'Merge Patient Info', IN1: 'Insurance',
  IN2: 'Insurance Additional', GT1: 'Guarantor', RXA: 'Pharmacy Admin',
  RXO: 'Pharmacy Order', RXR: 'Pharmacy Route',
};

// Field names for MSH segment (0-indexed after MSH|)
const MSH_FIELDS = [null, 'Encoding Chars', 'Sending App', 'Sending Facility',
  'Receiving App', 'Receiving Facility', null, 'Date/Time', null,
  'Message Type', 'Message Control ID', 'Processing ID', 'Version'];

// Field names for PID segment
const PID_FIELDS = [null, 'PID Set ID', 'Patient ID', 'Patient ID List',
  null, 'Patient Name', 'Mother Maiden Name', 'DOB', 'Sex',
  null, 'Race', 'Patient Address', null, 'Phone Home',
  'Phone Business', null, 'Language'];

function parseSegments(text) {
  const lines = text.split(/\r\n|\n|\r/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const parts = line.split('|');
    return { name: parts[0], fields: parts.slice(1) };
  }).filter((s) => /^[A-Z0-9]{2,3}$/.test(s.name));
}

// `msh.fields` is `parts.slice(1)` (see parseSegments) — it does NOT include the
// leading "MSH" token, so it is offset by one from standard 1-based MSH-n field
// numbering (fields[0] = MSH-2, fields[7] = MSH-9, ...).
function mshSummary(msh) {
  const f = msh.fields;
  const msgType = f[7] || '';       // MSH-9 Message Type
  const version = f[10] || '';      // MSH-12 Version ID
  const sendingApp = f[1] || '';    // MSH-3 Sending Application
  const receivingApp = f[3] || '';  // MSH-5 Receiving Application
  const dateTime = f[5] || '';      // MSH-7 Date/Time of Message
  const controlId = f[8] || '';     // MSH-10 Message Control ID
  return { msgType, version, sendingApp, receivingApp, dateTime, controlId };
}

function pidSummary(pid) {
  const f = pid.fields;
  const name = f[4] || '';  // patient name (could be sensitive)
  const dob = f[6] || '';
  const sex = f[7] || '';
  const addr = f[10] || '';
  return { name, dob, sex, addr };
}

function fieldRow(label, value) {
  if (!value) return '';
  return `<tr><td class="hl7-key">${esc(label)}</td><td>${esc(value)}</td></tr>`;
}

export function render(intake) {
  const text = intake.text || '';
  const segments = parseSegments(text);

  if (!segments.length) {
    return { bodyHtml: '<div class="hl7-preview"><p class="hl7-note">No HL7 segments found.</p></div>' };
  }

  const msh = segments.find((s) => s.name === 'MSH');
  const summary = msh ? mshSummary(msh) : null;

  const segCounts = {};
  for (const s of segments) segCounts[s.name] = (segCounts[s.name] || 0) + 1;
  const segTypes = Object.keys(segCounts).length;

  const statsHtml = `<div class="hl7-stats">
    <div class="hl7-stat"><div class="hl7-stat-value">${segments.length}</div><div class="hl7-stat-label">Segments</div></div>
    <div class="hl7-stat"><div class="hl7-stat-value">${segTypes}</div><div class="hl7-stat-label">Types</div></div>
    ${summary?.version ? `<div class="hl7-stat"><div class="hl7-stat-value">v${summary.version}</div><div class="hl7-stat-label">Version</div></div>` : ''}
  </div>`;

  let summaryRows = '';
  if (summary) {
    summaryRows = [
      fieldRow('Message Type', summary.msgType.replace(/\^/g, ' / ')),
      fieldRow('Control ID', summary.controlId),
      fieldRow('Sending App', summary.sendingApp),
      fieldRow('Receiving App', summary.receivingApp),
      fieldRow('Date / Time', summary.dateTime),
    ].filter(Boolean).join('');
  }

  // Segment list table
  const segRows = segments.slice(0, 100).map((s) => {
    const label = SEG_LABEL[s.name] || '';
    const preview = s.fields.slice(0, 5).join(' | ').slice(0, 80);
    return `<tr><td class="hl7-seg-name">${esc(s.name)}</td><td class="hl7-seg-label">${esc(label)}</td><td class="hl7-seg-preview">${esc(preview)}</td></tr>`;
  }).join('');

  const bodyHtml = `<div class="hl7-preview">
  <div class="hl7-header"><span class="hl7-badge">HL7</span><span class="hl7-subtitle">${summary?.msgType ? `Message: ${esc(summary.msgType.replace(/\^/g, ' / '))}` : 'v2.x Message'}</span></div>
  ${statsHtml}
  ${summaryRows ? `<table class="hl7-table hl7-summary">${summaryRows}</table>` : ''}
  <div class="hl7-seg-section"><div class="hl7-seg-title">Segments</div>
  <table class="hl7-table"><thead><tr><th>Segment</th><th>Type</th><th>Fields (preview)</th></tr></thead><tbody>${segRows}</tbody></table></div>
  ${segments.length > 100 ? `<p class="hl7-note">Showing first 100 of ${segments.length} segments.</p>` : ''}
</div>`;

  return { bodyHtml };
}
