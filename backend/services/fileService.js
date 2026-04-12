const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger');

// FIX (MEDIUM): SSRF protection — validate destination URL before posting
const ALLOWED_TRANSFER_HOSTS = (process.env.ALLOWED_TRANSFER_HOSTS || '')
  .split(',').map(h => h.trim()).filter(Boolean);

// Block private/internal IP ranges
const PRIVATE_IP_RE = /^(localhost$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function validateDestinationUrl(destinationUrl) {
  let parsed;
  try {
    parsed = new URL(destinationUrl);
  } catch {
    return { ok: false, error: 'Invalid destination URL format' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, error: `Protocol not allowed: ${parsed.protocol}` };
  }

  if (PRIVATE_IP_RE.test(parsed.hostname)) {
    return { ok: false, error: `Internal host not permitted: ${parsed.hostname}` };
  }

  if (ALLOWED_TRANSFER_HOSTS.length > 0 && !ALLOWED_TRANSFER_HOSTS.includes(parsed.hostname)) {
    return { ok: false, error: `Host not in allowlist: ${parsed.hostname}` };
  }

  return { ok: true };
}

async function transferFile({ fileRecord, destinationUrl, metadata = {} }) {
  // Validate before making any network call
  const validation = validateDestinationUrl(destinationUrl);
  if (!validation.ok) {
    logger.warn(`fileService.transferFile blocked: ${validation.error}`);
    return { ok: false, error: validation.error };
  }

  try {
    const form = new FormData();
    const fileStream = fs.createReadStream(path.resolve(fileRecord.path));
    form.append('file', fileStream, { filename: fileRecord.originalName });
    form.append('metadata', JSON.stringify({ ...metadata, senderIP: fileRecord.senderIP, timestamp: new Date().toISOString() }));

    const headers = form.getHeaders();
    const resp = await axios.post(destinationUrl, form, { headers, timeout: 30000 });
    return { ok: true, status: resp.status, data: resp.data };
  } catch (err) {
    logger.warn(`fileService.transferFile failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

module.exports = { transferFile };
