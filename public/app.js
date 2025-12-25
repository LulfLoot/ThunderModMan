// State
let currentCommunity = '';
let packages = [];
let installedMods = [];

// DOM Elements
const communitySelect = document.getElementById('community');
const searchInput = document.getElementById('search');
const modContainer = document.getElementById('mod-container');
const installedList = document.getElementById('installed-list');
const totalModsEl = document.getElementById('total-mods');
const installedCountEl = document.getElementById('installed-count');
const installedBadgeEl = document.getElementById('installed-badge');
const refreshBtn = document.getElementById('refresh-btn');
const restartServerBtn = document.getElementById('restart-server-btn');

// API Functions
async function fetchCommunities() {
  const res = await fetch('/api/communities');
  return res.json();
}

async function fetchPackages(community) {
  const res = await fetch(`/api/packages/${community}`);
  return res.json();
}

async function searchPackages(community, query) {
  const res = await fetch(`/api/packages/${community}/search?q=${encodeURIComponent(query)}`);
  return res.json();
}

async function fetchInstalled() {
  const res = await fetch('/api/installed');
  return res.json();
}

async function installMod(community, fullName) {
  const res = await fetch('/api/install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ community, fullName, includeDeps: true })
  });
  return res.json();
}

async function uninstallMod(fullName) {
  const res = await fetch(`/api/uninstall/${encodeURIComponent(fullName)}`, {
    method: 'DELETE'
  });
  return res.json();
}

async function restartServer() {
  const res = await fetch('/api/restart-server', { method: 'POST' });
  return res.json();
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Render Functions
function renderModGrid(mods) {
  if (!mods.length) {
    modContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>No mods found</p>
      </div>
    `;
    return;
  }

  const installedNames = new Set(installedMods.map(m => m.fullName));

  modContainer.innerHTML = `
    <div class="mod-grid">
      ${mods.slice(0, 100).map(pkg => {
        const isInstalled = installedNames.has(pkg.fullName);
        return `
          <div class="mod-card ${isInstalled ? 'installed' : ''}" data-fullname="${pkg.fullName}">
            <div class="mod-header">
              <img class="mod-icon" src="${pkg.icon || ''}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23252532%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22 font-size=%2240%22>📦</text></svg>'">
              <div class="mod-info">
                <div class="mod-name">${pkg.name}</div>
                <div class="mod-owner">by ${pkg.owner}</div>
                <span class="mod-version">v${pkg.latestVersion}</span>
              </div>
            </div>
            <div class="mod-description">${pkg.description || 'No description'}</div>
            <div class="mod-footer">
              <div class="mod-stats">
                <span>⬇️ ${formatNumber(pkg.downloads)}</span>
                <span>⭐ ${pkg.rating}</span>
              </div>
              <button class="install-btn ${isInstalled ? 'installed' : ''}" 
                      data-fullname="${pkg.fullName}"
                      ${isInstalled ? 'disabled' : ''}>
                ${isInstalled ? '✓ Installed' : 'Install'}
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Add click handlers
  modContainer.querySelectorAll('.install-btn:not(.installed)').forEach(btn => {
    btn.addEventListener('click', handleInstall);
  });
}

function renderInstalledMods() {
  installedCountEl.textContent = installedMods.length;
  installedBadgeEl.textContent = installedMods.length;

  if (!installedMods.length) {
    installedList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎮</div>
        <p>No mods installed yet</p>
      </div>
    `;
    return;
  }

  installedList.innerHTML = installedMods.map(mod => `
    <div class="installed-item">
      <img class="installed-icon" src="${mod.icon || ''}" alt="" onerror="this.style.display='none'">
      <div class="installed-info">
        <div class="installed-name">${mod.name}</div>
        <div class="installed-version">v${mod.version}</div>
      </div>
      <button class="uninstall-btn" data-fullname="${mod.fullName}">Remove</button>
    </div>
  `).join('');

  // Add click handlers
  installedList.querySelectorAll('.uninstall-btn').forEach(btn => {
    btn.addEventListener('click', handleUninstall);
  });
}

// Event Handlers
async function handleCommunityChange() {
  currentCommunity = communitySelect.value;
  if (!currentCommunity) return;

  modContainer.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>Loading mods...</p>
    </div>
  `;

  try {
    packages = await fetchPackages(currentCommunity);
    totalModsEl.textContent = formatNumber(packages.length);
    renderModGrid(packages);
  } catch (e) {
    showToast('Failed to load mods', 'error');
  }
}

async function handleSearch() {
  const query = searchInput.value.trim();
  if (!currentCommunity) return;

  if (!query) {
    renderModGrid(packages);
    return;
  }

  try {
    const results = await searchPackages(currentCommunity, query);
    renderModGrid(results);
  } catch (e) {
    showToast('Search failed', 'error');
  }
}

async function handleInstall(e) {
  const btn = e.target;
  const fullName = btn.dataset.fullname;
  
  btn.disabled = true;
  btn.textContent = 'Installing...';

  try {
    const result = await installMod(currentCommunity, fullName);
    if (result.results?.some(r => r.success)) {
      showToast(`Installed ${fullName}`, 'success');
      await refreshInstalled();
      renderModGrid(packages);
    } else {
      showToast('Installation failed', 'error');
      btn.disabled = false;
      btn.textContent = 'Install';
    }
  } catch (e) {
    showToast('Installation error', 'error');
    btn.disabled = false;
    btn.textContent = 'Install';
  }
}

async function handleUninstall(e) {
  const fullName = e.target.dataset.fullname;
  
  try {
    const result = await uninstallMod(fullName);
    if (result.success) {
      showToast(`Removed ${fullName}`, 'success');
      await refreshInstalled();
      renderModGrid(packages);
    } else {
      showToast('Uninstall failed', 'error');
    }
  } catch (e) {
    showToast('Uninstall error', 'error');
  }
}

async function handleRestartServer() {
  restartServerBtn.disabled = true;
  restartServerBtn.textContent = '🔄 Restarting...';
  
  try {
    const result = await restartServer();
    if (result.success) {
      showToast('Server restarting...', 'success');
    } else {
      showToast(result.error || 'Restart failed', 'error');
    }
  } catch (e) {
    showToast('Restart error', 'error');
  }
  
  restartServerBtn.disabled = false;
  restartServerBtn.textContent = '🔄 Restart Server';
}

async function refreshInstalled() {
  try {
    installedMods = await fetchInstalled();
    renderInstalledMods();
  } catch (e) {
    console.error('Failed to fetch installed mods:', e);
  }
}

// Utility
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Debounce search
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(handleSearch, 300);
});

// Init
async function init() {
  try {
    const communities = await fetchCommunities();
    communitySelect.innerHTML = `
      <option value="">Select a game...</option>
      ${communities.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
    `;
    
    await refreshInstalled();
  } catch (e) {
    showToast('Failed to initialize', 'error');
  }
}

// Event Listeners
communitySelect.addEventListener('change', handleCommunityChange);
refreshBtn.addEventListener('click', handleCommunityChange);
restartServerBtn.addEventListener('click', handleRestartServer);

init();
