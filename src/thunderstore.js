const fetch = require('node-fetch');

// Supported game communities
const COMMUNITIES = {
  valheim: { name: 'Valheim', slug: 'valheim' },
  lethal_company: { name: 'Lethal Company', slug: 'lethal-company' },
  risk_of_rain_2: { name: 'Risk of Rain 2', slug: 'riskofrain2' },
  content_warning: { name: 'Content Warning', slug: 'content-warning' },
  gtfo: { name: 'GTFO', slug: 'gtfo' },
  vintage_story: { name: 'Vintage Story', slug: 'vintagestory' }
};

const THUNDERSTORE_BASE = 'https://thunderstore.io';

// Cache for package data (community -> {data, timestamp})
const packageCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get list of supported communities
 */
function getCommunities() {
  return Object.entries(COMMUNITIES).map(([key, value]) => ({
    id: key,
    ...value
  }));
}

/**
 * Fetch all packages for a community
 */
async function getPackages(communityId) {
  const community = COMMUNITIES[communityId];
  if (!community) {
    throw new Error(`Unknown community: ${communityId}`);
  }

  // Check cache
  const cached = packageCache.get(communityId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const url = `${THUNDERSTORE_BASE}/c/${community.slug}/api/v1/package/`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Thunderstore API error: ${response.status}`);
  }

  const packages = await response.json();
  
  // Transform data for our use
  const transformed = packages.map(pkg => ({
    uuid: pkg.uuid4,
    name: pkg.name,
    fullName: pkg.full_name,
    owner: pkg.owner,
    description: pkg.versions[0]?.description || '',
    icon: pkg.versions[0]?.icon || '',
    latestVersion: pkg.versions[0]?.version_number || '',
    downloadUrl: pkg.versions[0]?.download_url || '',
    downloads: pkg.versions.reduce((sum, v) => sum + v.downloads, 0),
    rating: pkg.rating_score,
    categories: pkg.categories,
    dependencies: pkg.versions[0]?.dependencies || [],
    isDeprecated: pkg.is_deprecated,
    dateUpdated: pkg.date_updated
  }));

  // Cache the result
  packageCache.set(communityId, {
    data: transformed,
    timestamp: Date.now()
  });

  return transformed;
}

/**
 * Search packages by query
 */
async function searchPackages(communityId, query) {
  const packages = await getPackages(communityId);
  const lowerQuery = query.toLowerCase();
  
  return packages.filter(pkg => 
    pkg.name.toLowerCase().includes(lowerQuery) ||
    pkg.owner.toLowerCase().includes(lowerQuery) ||
    pkg.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get package by full name (owner-name)
 */
async function getPackageByName(communityId, fullName) {
  const packages = await getPackages(communityId);
  return packages.find(pkg => pkg.fullName === fullName);
}

/**
 * Resolve dependencies for a package (returns list of packages to install)
 */
async function resolveDependencies(communityId, fullName) {
  const packages = await getPackages(communityId);
  const pkgMap = new Map(packages.map(p => [p.fullName, p]));
  
  const toInstall = [];
  const visited = new Set();
  
  function resolve(name) {
    // Extract package name without version (Owner-ModName-X.X.X -> Owner-ModName)
    const parts = name.split('-');
    const pkgName = parts.slice(0, 2).join('-');
    
    if (visited.has(pkgName)) return;
    visited.add(pkgName);
    
    const pkg = pkgMap.get(pkgName);
    if (pkg) {
      // Resolve dependencies first
      for (const dep of pkg.dependencies) {
        resolve(dep);
      }
      toInstall.push(pkg);
    }
  }
  
  resolve(fullName);
  return toInstall;
}

module.exports = {
  getCommunities,
  getPackages,
  searchPackages,
  getPackageByName,
  resolveDependencies,
  COMMUNITIES
};
