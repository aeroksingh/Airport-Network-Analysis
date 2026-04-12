const express = require('express');
const os = require('os');
const dns = require('dns').promises;
const child_process = require('child_process');
const logger = require('../utils/logger');
const { protect } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const udpHeartbeat = require('../utils/udpHeartbeat');

const router = express.Router();

// GET /topology  (protect only)
router.get('/topology', protect, authorize('admin'), (req, res) => { // FIX(HIGH): was protect-only; now admin-only
  const topology = {
    subnets: [
      {
        name: 'Terminal Operations',
        network: 'terminal_ops',
        subnet: '192.168.10.0',
        subnetMask: '255.255.255.0',
        gateway: '192.168.10.1',
        broadcast: '192.168.10.255',
        usableHosts: 254,
        nodes: [
          { name: 'mongo', ip: '192.168.10.10' },
          { name: 'backend', ip: '192.168.10.20' },
        ],
      },
      {
        name: 'Passenger Services',
        network: 'passenger_services',
        subnet: '192.168.20.0',
        subnetMask: '255.255.255.0',
        gateway: '192.168.20.1',
        broadcast: '192.168.20.255',
        usableHosts: 254,
        nodes: [{ name: 'frontend', ip: '192.168.20.10' }],
      },
      {
        name: 'Admin Control',
        network: 'admin_control',
        subnet: '192.168.30.0',
        subnetMask: '255.255.255.0',
        gateway: '192.168.30.1',
        broadcast: '192.168.30.255',
        usableHosts: 254,
        nodes: [
          { name: 'backend', ip: '192.168.30.10' },
          { name: 'frontend', ip: '192.168.30.20' },
        ],
      },
    ],
    routingTable: [
      {
        from: '192.168.10.0/24',
        to: '192.168.20.0/24',
        via: '192.168.30.10',
        description: 'Backend (192.168.30.10) routes between Terminal Ops and Passenger Services',
      },
      {
        from: '192.168.10.0/24',
        to: '192.168.30.0/24',
        via: '192.168.30.1',
        description: 'Admin control connectivity',
      },
    ],
  };

  res.json(topology);
});

// All routes after this require admin role
router.use(protect, authorize('admin'));

// GET /interfaces - system network interfaces (Layer 2 / Layer 3 info)
router.get('/interfaces', (req, res) => {
  try {
    const nets = os.networkInterfaces();
    const result = [];
    Object.keys(nets).forEach((name) => {
      nets[name].forEach((iface) => {
        result.push({
          interface: name,
          ip: iface.address,
          family: iface.family,
          mac: iface.mac,
          cidr: iface.cidr,
          internal: iface.internal,
          layer2: { mac: iface.mac || null, frameType: 'Ethernet' },
          layer3: { ip: iface.address, protocol: iface.family },
        });
      });
    });
    res.json(result);
  } catch (err) {
    logger.error(`GET /interfaces error: ${err.message}`);
    res.status(500).json({ error: 'Unable to read network interfaces' });
  }
});

// GET /arp - parse local ARP table
router.get('/arp', (req, res) => {
  try {
    const platform = process.platform;
    let cmd = 'arp -n';
    if (platform === 'win32') cmd = 'arp -a';

    const out = child_process.execSync(cmd, { encoding: 'utf8' });
    const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const results = [];

    const ipRe = /\b\d{1,3}(?:\.\d{1,3}){3}\b/;
    const macRe = /([0-9a-fA-F]{2}(?::|-)){5}[0-9a-fA-F]{2}/;

    for (const line of lines) {
      const ipMatch = line.match(ipRe);
      const macMatch = line.match(macRe);
      if (ipMatch && macMatch) {
        // try to extract interface name heuristically (last token)
        const parts = line.split(/\s+/);
        const iface = parts[parts.length - 1];
        results.push({ ip: ipMatch[0], mac: macMatch[0], interface: iface, layer: 2, protocol: 'ARP' });
      }
    }

    res.json(results);
  } catch (err) {
    logger.warn(`ARP lookup failed: ${err.message}`);
    res.status(200).json({ ok: false, message: 'ARP command not supported on this platform or returned no entries', error: err.message });
  }
});

// GET /udp-stats - return udpHeartbeat statistics
router.get('/udp-stats', (req, res) => {
  try {
    const stats = udpHeartbeat.getStats();
    res.json(stats);
  } catch (err) {
    logger.error(`GET /udp-stats error: ${err.message}`);
    res.status(500).json({ error: 'Unable to retrieve UDP stats' });
  }
});

// GET /dns-resolve?host=example.com
router.get('/dns-resolve', async (req, res) => {
  const host = req.query.host;
  if (!host) return res.status(400).json({ error: 'Missing host query parameter' });

  try {
    const lookup = await dns.lookup(host);
    res.json({ host, resolvedIP: lookup.address, family: lookup.family, layer: 7, protocol: 'DNS' });
  } catch (err) {
    logger.warn(`DNS resolve failed for ${host}: ${err.message}`);
    res.status(500).json({ error: `DNS lookup failed for ${host}`, details: err.message });
  }
});

module.exports = router;
