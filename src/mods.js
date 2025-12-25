const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const unzipper = require('unzipper');
const { Readable } = require('stream');

// Directory where mods are installed (mounted from game server)
const MODS_DIR = process.env.MODS_DIR || '/mods';
// File to track installed mods
const INSTALLED_FILE = path.join(process.env.DATA_DIR || '/data', 'installed.json');

/**
 * Get list of installed mods
 */
async function getInstalledMods() {
  try {
    const data = await fs.readFile(INSTALLED_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    // File doesn't exist yet
    return [];
  }
}

/**
 * Save installed mods list
 */
async function saveInstalledMods(mods) {
  const dataDir = path.dirname(INSTALLED_FILE);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(INSTALLED_FILE, JSON.stringify(mods, null, 2));
}

/**
 * Install a mod from Thunderstore
 * @param {Object} pkg - Package object from thunderstore.js
 * @returns {Object} - Installation result
 */
async function installMod(pkg) {
  const installed = await getInstalledMods();
  
  // Check if already installed
  if (installed.find(m => m.fullName === pkg.fullName)) {
    return { success: false, message: 'Mod already installed' };
  }

  // Download the mod
  const response = await fetch(pkg.downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download mod: ${response.status}`);
  }

  // Create mod directory
  const modDir = path.join(MODS_DIR, pkg.fullName);
  await fs.mkdir(modDir, { recursive: true });

  // Extract ZIP contents
  const buffer = Buffer.from(await response.arrayBuffer());
  const stream = Readable.from(buffer);
  
  await new Promise((resolve, reject) => {
    stream
      .pipe(unzipper.Extract({ path: modDir }))
      .on('close', resolve)
      .on('error', reject);
  });

  // Add to installed list
  installed.push({
    fullName: pkg.fullName,
    name: pkg.name,
    owner: pkg.owner,
    version: pkg.latestVersion,
    icon: pkg.icon,
    installedAt: new Date().toISOString()
  });
  
  await saveInstalledMods(installed);

  return { success: true, message: `Installed ${pkg.fullName}` };
}

/**
 * Uninstall a mod
 * @param {string} fullName - Full name of the mod (Owner-ModName)
 */
async function uninstallMod(fullName) {
  const installed = await getInstalledMods();
  
  const modIndex = installed.findIndex(m => m.fullName === fullName);
  if (modIndex === -1) {
    return { success: false, message: 'Mod not installed' };
  }

  // Remove mod directory
  const modDir = path.join(MODS_DIR, fullName);
  try {
    await fs.rm(modDir, { recursive: true, force: true });
  } catch (e) {
    console.error(`Failed to remove mod directory: ${e.message}`);
  }

  // Remove from installed list
  installed.splice(modIndex, 1);
  await saveInstalledMods(installed);

  return { success: true, message: `Uninstalled ${fullName}` };
}

/**
 * Check if a mod is installed
 * @param {string} fullName - Full name of the mod
 */
async function isInstalled(fullName) {
  const installed = await getInstalledMods();
  return installed.some(m => m.fullName === fullName);
}

module.exports = {
  getInstalledMods,
  installMod,
  uninstallMod,
  isInstalled,
  MODS_DIR
};
