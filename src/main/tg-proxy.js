'use strict';

/**
 * tg-proxy.js — SOCKS5 → WSS tunnel for Telegram Desktop
 *
 * Mirrors tglock by by-sonic (https://github.com/by-sonic/tglock)
 *
 * Flow:
 *   Telegram Desktop
 *     ↓  SOCKS5  (127.0.0.1:1080)
 *   [tg-proxy]
 *     ↓  detect DC from obf2 init packet, or fall back to destination IP
 *     ↓  WSS  →  wss://kws{N}.web.telegram.org/apiws
 *   Telegram servers
 *
 * Key difference vs plain TCP proxy:
 *   The provider sees ordinary HTTPS to web.telegram.org, not raw MTProto.
 *   DPI cannot detect or block the connection.
 */

const net      = require('net');
const crypto   = require('crypto');
const WebSocket = require('ws');

const CONNECT_TIMEOUT_MS = 15_000;

// ── DC helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the Telegram DC number (1-5) for a given IPv4 string,
 * or null if the address is not a known Telegram range.
 * Identical to tglock's dc_from_ip().
 */
function dcFromIp(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return null;
  const [a, b, c] = parts;

  if (a === 149 && b === 154) {
    if (c >= 160 && c <= 163) return 1;
    if (c >= 164 && c <= 167) return 2;
    if (c >= 168 && c <= 171) return 3;
    if (c >= 172 && c <= 175) return 1;
    return 2;
  }
  if (a === 91 && b === 108) {
    if (c >= 56 && c <= 59) return 5;
    if (c >= 8  && c <= 11) return 3;
    if (c >= 12 && c <= 15) return 4;
    return 2;
  }
  if ((a === 91 && b === 105) || (a === 185 && b === 76)) return 2;
  return null;
}

/**
 * Extracts the DC number from the 64-byte obfuscated2 MTProto init packet.
 * Algorithm (same as tglock's extract_dc_from_init):
 *   key = buf[8..40], iv = buf[40..56]
 *   AES-256-CTR decrypt the whole 64-byte buffer from counter = iv
 *   DC = |int32_le(dec[60..64])|, must be 1-5
 */
function dcFromInit(buf) {
  try {
    if (buf.length < 64) return null;
    const decipher = crypto.createDecipheriv(
      'aes-256-ctr',
      buf.slice(8, 40),   // 32-byte key
      buf.slice(40, 56)   // 16-byte iv (counter start)
    );
    const dec = Buffer.concat([decipher.update(buf.slice(0, 64)), decipher.final()]);
    const dc  = Math.abs(dec.readInt32LE(60));
    return dc >= 1 && dc <= 5 ? dc : null;
  } catch {
    return null;
  }
}

/** WSS endpoint for a given DC number (matches tglock's ws_url()). */
function wsEndpoint(dc) {
  return `wss://kws${dc}.web.telegram.org/apiws`;
}

// ── Buffered sequential reader ────────────────────────────────────────────────

/**
 * Wraps a net.Socket and lets callers await exact byte counts.
 * Call detach() when the handshake phase is done to hand the socket
 * back to the relay code cleanly (returns any bytes already buffered).
 */
class SocketReader {
  constructor(socket) {
    this._s       = socket;
    this._buf     = Buffer.alloc(0);
    this._waiters = [];
    this._dead    = false;

    this._onData  = (chunk) => {
      this._buf = Buffer.concat([this._buf, chunk]);
      this._flush();
    };
    this._onDead  = (err) => this._die(err || new Error('Socket closed'));

    socket.on('data',  this._onData);
    socket.once('error', this._onDead);
    socket.once('close', this._onDead);
  }

  _flush() {
    while (this._waiters.length && this._buf.length >= this._waiters[0].n) {
      const { n, resolve } = this._waiters.shift();
      resolve(this._buf.slice(0, n));
      this._buf = this._buf.slice(n);
    }
  }

  _die(err) {
    if (this._dead) return;
    this._dead = true;
    this._waiters.splice(0).forEach(({ reject }) => reject(err));
  }

  read(n, timeoutMs = CONNECT_TIMEOUT_MS) {
    if (this._dead) return Promise.reject(new Error('Socket dead'));
    if (this._buf.length >= n) {
      const d = this._buf.slice(0, n);
      this._buf = this._buf.slice(n);
      return Promise.resolve(d);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = this._waiters.findIndex(w => w.resolve === resolve);
        if (i !== -1) this._waiters.splice(i, 1);
        reject(new Error(`Read timeout waiting for ${n} bytes`));
      }, timeoutMs);

      this._waiters.push({
        n,
        resolve: (d) => { clearTimeout(timer); resolve(d); },
        reject:  (e) => { clearTimeout(timer); reject(e);  },
      });
    });
  }

  /**
   * Remove all listeners from the socket and return any bytes
   * that were already buffered but not yet consumed.
   * After detach() the socket is "raw" again for the caller to use.
   */
  detach() {
    this._dead = true;
    this._waiters.splice(0).forEach(({ reject }) => reject(new Error('Detached')));
    this._s.removeListener('data',  this._onData);
    this._s.removeListener('error', this._onDead);
    this._s.removeListener('close', this._onDead);
    const leftover = this._buf;
    this._buf = Buffer.alloc(0);
    return leftover;
  }
}

// ── SOCKS5 negotiation ────────────────────────────────────────────────────────

/**
 * Performs the SOCKS5 handshake on `socket` using `reader`.
 * Returns { addr, port } of the requested destination.
 * Sends the SOCKS5 success response before returning.
 */
async function socks5Handshake(socket, reader) {
  // ── auth methods ──────────────────────────────────────────────────────────
  const hdr = await reader.read(2);
  if (hdr[0] !== 0x05) throw new Error(`Not SOCKS5 (ver=${hdr[0]})`);
  await reader.read(hdr[1]);                         // discard method list
  socket.write(Buffer.from([0x05, 0x00]));           // no-auth accepted

  // ── CONNECT request ───────────────────────────────────────────────────────
  const req = await reader.read(4);
  if (req[0] !== 0x05 || req[1] !== 0x01) {
    socket.write(Buffer.from([0x05, 0x07, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
    throw new Error(`Expected CONNECT (cmd=${req[1]})`);
  }

  let addr, port;
  switch (req[3]) {
    case 0x01: {                                     // IPv4
      const raw = await reader.read(4);
      const pt  = await reader.read(2);
      addr = raw.join('.');
      port = pt.readUInt16BE(0);
      break;
    }
    case 0x03: {                                     // domain
      const len = (await reader.read(1))[0];
      const dom = await reader.read(len);
      const pt  = await reader.read(2);
      addr = dom.toString('ascii');
      port = pt.readUInt16BE(0);
      break;
    }
    case 0x04: {                                     // IPv6
      const raw = await reader.read(16);
      const pt  = await reader.read(2);
      const segs = [];
      for (let i = 0; i < 16; i += 2) segs.push(raw.readUInt16BE(i).toString(16));
      addr = segs.join(':');
      port = pt.readUInt16BE(0);
      break;
    }
    default:
      socket.write(Buffer.from([0x05, 0x08, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
      throw new Error(`Unknown ATYP=${req[3]}`);
  }

  // Success — BND.ADDR = 127.0.0.1, BND.PORT = 1080 (placeholder, per RFC 1928)
  socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0x04, 0x38]));
  return { addr, port };
}

// ── WSS relay ────────────────────────────────────────────────────────────────

/**
 * Tunnels `clientSocket` ↔ Telegram DC{dc} via WebSocket Secure.
 *
 * @param {net.Socket} clientSocket  - already past SOCKS5 handshake
 * @param {number}     dc            - Telegram DC number (1-5)
 * @param {Buffer}     init64        - first 64 bytes already read from client
 * @param {Buffer}     leftover      - any bytes buffered after init64 (usually empty)
 * @param {Function}   [onLog]       - optional logger
 */
function relayViaWS(clientSocket, dc, init64, leftover, onLog) {
  return new Promise((resolve) => {
    const url = wsEndpoint(dc);
    const ws  = new WebSocket(url, 'binary', {
      rejectUnauthorized: false,   // Telegram uses valid certs, but be safe
      handshakeTimeout: CONNECT_TIMEOUT_MS,
      perMessageDeflate: false,    // disable compression — raw binary
    });

    let closed = false;
    const finish = () => {
      if (closed) return;
      closed = true;
      try { ws.terminate(); }         catch (_) {}
      try { clientSocket.destroy(); } catch (_) {}
      resolve();
    };

    ws.once('error', (e) => {
      onLog?.(`WS error DC${dc}: ${e.message}`);
      finish();
    });
    ws.once('close', finish);
    clientSocket.once('error', finish);
    clientSocket.once('close', finish);

    ws.once('open', () => {
      onLog?.(`WS open → DC${dc} (${url})`);

      // 1. First message to the server is the 64-byte obf2 init (unmodified)
      ws.send(init64);

      // 2. Any bytes that arrived while we were connecting
      if (leftover.length > 0) ws.send(leftover);

      // 3. Stream client → WS
      clientSocket.on('data', (chunk) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
      });

      // 4. Stream WS → client
      ws.on('message', (data) => {
        if (!clientSocket.destroyed) {
          // ws delivers binary frames as Buffer when binaryType is implicit
          clientSocket.write(Buffer.isBuffer(data) ? data : Buffer.from(data));
        }
      });
    });
  });
}

// ── Direct TCP passthrough (non-Telegram traffic) ────────────────────────────

function relayTCP(clientSocket, addr, port, leftover) {
  return new Promise((resolve) => {
    const remote = net.createConnection({ host: addr, port });
    remote.setTimeout(CONNECT_TIMEOUT_MS);

    remote.once('timeout', () => { remote.destroy(); clientSocket.destroy(); resolve(); });
    remote.once('error',   () => { clientSocket.destroy(); resolve(); });
    clientSocket.once('error', () => { remote.destroy(); resolve(); });

    remote.once('connect', () => {
      remote.setTimeout(0);
      if (leftover.length > 0) remote.write(leftover);
      clientSocket.pipe(remote);
      remote.pipe(clientSocket);
      clientSocket.once('close', resolve);
      remote.once('close', resolve);
    });
  });
}

// ── Per-connection handler ────────────────────────────────────────────────────

async function handleClient(socket, onLog) {
  socket.setNoDelay(true);
  const reader = new SocketReader(socket);

  try {
    const { addr, port } = await socks5Handshake(socket, reader);
    const ipDC = dcFromIp(addr);

    if (ipDC !== null) {
      // ── Telegram IP: tunnel via WSS ──────────────────────────────────────
      const init64   = await reader.read(64);
      const initDC   = dcFromInit(init64);
      const dc       = initDC ?? ipDC;          // init packet is more reliable
      const leftover = reader.detach();          // hand socket back cleanly

      onLog?.(`TG connection → DC${dc} (ip=${addr}, initDC=${initDC ?? 'n/a'})`);
      await relayViaWS(socket, dc, init64, leftover, onLog);
    } else {
      // ── Non-Telegram: direct TCP ─────────────────────────────────────────
      const leftover = reader.detach();
      await relayTCP(socket, addr, port, leftover);
    }
  } catch (e) {
    try { socket.destroy(); } catch (_) {}
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start the SOCKS5 proxy server.
 *
 * @param {object}   opts
 * @param {number}   [opts.port=1080]   - port to listen on
 * @param {Function} [opts.onLog]       - called with (message: string)
 * @returns {Promise<net.Server>}       - resolves when the server is listening
 */
function createProxy({ port = 1080, onLog } = {}) {
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => {
      handleClient(socket, onLog).catch(() => {
        try { socket.destroy(); } catch (_) {}
      });
    });

    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      onLog?.(`Telegram SOCKS5 proxy ready on 127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

module.exports = { createProxy, dcFromIp, dcFromInit };
