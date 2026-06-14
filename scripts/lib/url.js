'use strict';

// Target URLs are injected into the generated Redirect Page, so anything that
// isn't a plain http(s) URL is rejected here (kills javascript:, data:, etc.).
// Writers are trusted (ADR-0002), so this guards against mistakes, not attackers —
// but the Redirect Page still escapes the value on output as defence in depth.
function validateTarget(input) {
  const raw = String(input == null ? '' : input).trim();
  if (!raw) {
    return { ok: false, message: 'A target URL is required.' };
  }

  let url;
  try {
    url = new URL(raw);
  } catch (_err) {
    return {
      ok: false,
      message: `\`${raw}\` is not a valid URL. Include the scheme, e.g. https://example.com`,
    };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, message: 'Only http and https target URLs are allowed.' };
  }
  if (!url.hostname) {
    return { ok: false, message: 'The target URL is missing a hostname.' };
  }

  return { ok: true, url: url.toString() };
}

module.exports = { validateTarget };
