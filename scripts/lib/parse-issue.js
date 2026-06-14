'use strict';

// GitHub Issue Forms render the submitted body as markdown: each field becomes a
// "### <Label>" heading followed by the value (or the literal "_No response_"
// for an empty optional field). This turns that back into { label: value }.
function parseIssueForm(body) {
  const result = {};
  if (!body) return result;

  const normalized = '\n' + String(body).replace(/\r\n/g, '\n');
  const sections = normalized.split(/\n###\s+/).slice(1);

  for (const section of sections) {
    const newline = section.indexOf('\n');
    if (newline === -1) continue;
    const heading = section.slice(0, newline).trim();
    let value = section.slice(newline + 1).trim();
    if (!heading) continue;
    if (value === '_No response_') value = '';
    result[heading] = value;
  }

  return result;
}

module.exports = { parseIssueForm };
