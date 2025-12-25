const express = require('express');
const path = require('path');
const thunderstore = require('./thunderstore');
const mods = require('./mods');

const app = express();
const PORT = process.env.PORT || 9876;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes

/**
 * Get supported communities
 */
app.get('/api/communities', (req, res) => {
  res.json(thunderstore.getCommunities());
});

/**
 * Get all packages for a community
 */
app.get('/api/packages/:community', async (req, res) => {
  try {
    const packages = await thunderstore.getPackages(req.params.community);
    res.json(packages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Search packages
 */
app.get('/api/packages/:community/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const packages = await thunderstore.searchPackages(req.params.community, query);
    res.json(packages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Get installed mods
 */
app.get('/api/installed', async (req, res) => {
  try {
    const installed = await mods.getInstalledMods();
    res.json(installed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Install a mod (with dependencies)
 */
app.post('/api/install', async (req, res) => {
  try {
    const { community, fullName, includeDeps } = req.body;
    
    if (!community || !fullName) {
      return res.status(400).json({ error: 'community and fullName required' });
    }

    let packagesToInstall = [];
    
    if (includeDeps) {
      // Resolve and install dependencies
      packagesToInstall = await thunderstore.resolveDependencies(community, fullName);
    } else {
      // Just install this package
      const pkg = await thunderstore.getPackageByName(community, fullName);
      if (pkg) {
        packagesToInstall = [pkg];
      }
    }

    const results = [];
    for (const pkg of packagesToInstall) {
      try {
        const result = await mods.installMod(pkg);
        results.push({ fullName: pkg.fullName, ...result });
      } catch (e) {
        results.push({ fullName: pkg.fullName, success: false, message: e.message });
      }
    }

    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Uninstall a mod
 */
app.delete('/api/uninstall/:fullName', async (req, res) => {
  try {
    const result = await mods.uninstallMod(req.params.fullName);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Restart game server container (optional feature)
 */
app.post('/api/restart-server', async (req, res) => {
  const containerName = process.env.RESTART_CONTAINER;
  if (!containerName) {
    return res.status(400).json({ error: 'RESTART_CONTAINER not configured' });
  }

  try {
    const Docker = require('dockerode');
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const container = docker.getContainer(containerName);
    await container.restart();
    res.json({ success: true, message: `Restarted ${containerName}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Thunderstore Web Manager running on http://0.0.0.0:${PORT}`);
  console.log(`Mods directory: ${mods.MODS_DIR}`);
});
