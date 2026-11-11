/**
 * SentinelLite Node.js & Express Security Middleware.
 * 
 * Provides real-time log tracking, active IP blocklist defense,
 * and automated threat detection for Node.js / Express websites & APIs.
 * 
 * Usage in any Express app:
 *   const express = require('express');
 *   const { sentinelLite } = require('./sentinellite');
 *   const app = express();
 * 
 *   app.use(sentinelLite({
 *     apiUrl: 'http://localhost:8000/api/v1',
 *     enableActiveBlocking: true
 *   }));
 */

const http = require('http');
const https = require('https');

const SQLI_REGEX = /(\b(union|select|insert|update|delete|drop|alter|exec|sleep)\b|['"]\s*or\s*['"]|--|\/\*|\b1=1\b)/i;
const XSS_REGEX = /(<script|javascript:|onerror=|onload=|<svg|<img\s+src=)/i;
const TRAVERSAL_REGEX = /(\.\.\/|\.\.\\|\/etc\/passwd|win\.ini)/i;

function sentinelLite(options = {}) {
  const apiUrl = (options.apiUrl || 'http://localhost:8000/api/v1').replace(/\/$/, '');
  const enableActiveBlocking = options.enableActiveBlocking !== false;
  const serverAssetIp = options.serverAssetIp || '10.0.0.10';

  let blockedIps = new Set();
  let lastSync = 0;

  // Background blocklist synchronizer
  function syncBlocklist() {
    const now = Date.now();
    if (now - lastSync < 60000) return;
    lastSync = now;

    try {
      const client = apiUrl.startsWith('https') ? https : http;
      client.get(`${apiUrl}/defense/blocklist`, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (data.rules) {
              blockedIps = new Set(data.rules.map(r => r.ip));
            }
          } catch (e) {}
        });
      }).on('error', () => {});
    } catch (e) {}
  }

  // Asynchronous telemetry dispatcher
  function dispatchEvent(payload) {
    try {
      const client = apiUrl.startsWith('https') ? https : http;
      const urlObj = new URL(`${apiUrl}/events/`);
      const body = JSON.stringify(payload);

      const req = client.request({
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'SentinelLite-Node-Agent/1.0'
        }
      });
      req.on('error', () => {});
      req.write(body);
      req.end();
    } catch (e) {}
  }

  // Express middleware function
  return function (req, res, next) {
    syncBlocklist();
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // 1. Check perimeter blocklist
    if (enableActiveBlocking && blockedIps.has(clientIp)) {
      return res.status(403).json({
        error: 'Access Denied by SentinelLite Active Defense',
        reason: 'Client IP flagged for malicious cyber activity.',
        clientIp: clientIp
      });
    }

    // 2. Scan query and URL for exploit signatures
    const fullUrl = req.originalUrl || req.url;
    let detectedThreat = null;

    if (SQLI_REGEX.test(fullUrl)) {
      detectedThreat = 'sql_injection_attempt';
    } else if (XSS_REGEX.test(fullUrl)) {
      detectedThreat = 'xss_probe';
    } else if (TRAVERSAL_REGEX.test(fullUrl)) {
      detectedThreat = 'directory_traversal';
    }

    if (detectedThreat && enableActiveBlocking) {
      dispatchEvent({
        source_ip: clientIp,
        dest_ip: serverAssetIp,
        dest_port: 443,
        protocol: 'TCP',
        event_type: detectedThreat,
        raw_data: { url: fullUrl, method: req.method }
      });
      return res.status(400).json({
        error: 'Malicious payload detected by SentinelLite inspection engine.',
        violation: detectedThreat
      });
    }

    // 3. Track response telemetry
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000.0;
      let eventType = 'http_request';
      if (res.statusCode === 401 || res.statusCode === 403) {
        eventType = 'http_auth_failure';
      }

      dispatchEvent({
        source_ip: clientIp,
        dest_ip: serverAssetIp,
        dest_port: 443,
        protocol: 'TCP',
        event_type: eventType,
        duration: duration,
        raw_data: {
          path: req.path,
          method: req.method,
          status_code: res.statusCode
        }
      });
    });

    next();
  };
}

module.exports = { sentinelLite };

