# Thunderstore Web Mod Manager - Architecture Options

This document outlines two architectural approaches for building a web-based mod manager for game servers.

## Background

**Goal**: Create a web UI to browse Thunderstore mods and install them to a game server running in Docker.

**Core Functionality**:

- Browse mods by game community (Valheim, Lethal Company, etc.)
- Search and filter mods
- One-click install/uninstall
- View installed mods and dependencies
- Manage mod profiles

---

## Option A: Standalone Mod Manager (Sidecar) ⭐ Recommended

The mod manager runs as a separate container alongside existing game server containers.

```
┌─────────────────────────┐    ┌─────────────────────────┐
│   Mod Manager Container │    │   Game Server Container │
│   ────────────────────  │    │   ────────────────────  │
│   • Web UI on port 8080 │    │   • Valheim/Lethal Co.  │
│   • Downloads mods      │───▶│   • Runs the game       │
│   • Manages profiles    │    │   • Uses mounted mods   │
└─────────────────────────┘    └─────────────────────────┘
            │                              │
            └──────────┬───────────────────┘
                       ▼
              Shared Volume: /mods
```

### Pros

- Works with **any existing server image** (lloesche/valheim, ich777, etc.)
- Separation of concerns - update mod manager without touching server
- Can manage mods for **multiple servers** from one UI
- Server can restart independently
- Leverage battle-tested, community-maintained server images

### Cons

- Slightly more complex docker-compose setup
- Need to coordinate restarts after mod changes

### Example docker-compose.yml

```yaml
services:
  valheim:
    image: lloesche/valheim-server
    ports:
      - "2456-2458:2456-2458/udp"
    volumes:
      - ./server-data:/config
      - ./mods:/config/bepinex/plugins # Shared with mod manager
    environment:
      - SERVER_NAME=My Server
      - WORLD_NAME=MyWorld
      - SERVER_PASS=secret

  mod-manager:
    image: thunderstore-web-manager # Custom image we build
    ports:
      - "8080:8080"
    volumes:
      - ./mods:/mods
      - ./mod-manager-data:/data
      - /var/run/docker.sock:/var/run/docker.sock # Optional: for restart capability
    environment:
      - GAME_COMMUNITY=valheim
      - RESTART_CONTAINER=valheim # Container to restart after mod changes
```

---

## Option B: All-in-One Container

The mod manager and game server run together in a single container.

```
┌─────────────────────────────────────────┐
│   All-in-One Container                  │
│   ─────────────────────────────────     │
│   • Web UI on port 8080                 │
│   • Game Server on port 2456-2458       │
│   • Mod management built-in             │
│   • One-click install + auto-restart    │
└─────────────────────────────────────────┘
```

### Pros

- Simpler deployment (single container)
- Can auto-restart server after mod changes seamlessly
- Self-contained and easy to share/distribute
- No volume coordination needed

### Cons

- Tied to specific game server implementation
- Heavier maintenance burden (must update server + mod manager)
- Can't leverage existing battle-tested server images
- Must rebuild for each supported game

### Example docker-compose.yml

```yaml
services:
  valheim-modded:
    image: valheim-modded-all-in-one # Custom image we build
    ports:
      - "2456-2458:2456-2458/udp"
      - "8080:8080"
    volumes:
      - ./server-data:/config
    environment:
      - SERVER_NAME=My Server
      - WORLD_NAME=MyWorld
      - SERVER_PASS=secret
```

---

## Recommendation

**Option A (Sidecar)** is recommended because:

| Factor                | Why Option A                                            |
| --------------------- | ------------------------------------------------------- |
| Reuse existing images | lloesche/valheim-server and similar are well-maintained |
| Flexibility           | Same mod manager works for any game                     |
| Simpler to build      | Only build the mod manager, not the server              |
| Easier updates        | Update mod manager OR server independently              |
| Server control        | Can still restart server via Docker API                 |

---

## Technical Components

### Backend (Node.js or Python)

- REST API to proxy Thunderstore requests
- Download and extract mod ZIP files
- Track installed mods in JSON/SQLite
- Optional: Docker API integration for server restart

### Frontend (HTML/JS or Vue/React)

- Game community selector
- Mod browser with search/filter
- Installed mods list
- Install/uninstall buttons
- Server restart button

### Thunderstore API

- `GET /api/v1/package/` - List all mods
- `GET /api/v1/package/{uuid}/` - Mod details
- Download URL provided in response → extract to plugins folder

---

## Estimated Development Time

| Component                | Hours      |
| ------------------------ | ---------- |
| Backend API              | 4-6        |
| Thunderstore integration | 2-3        |
| Web UI                   | 4-6        |
| Docker setup             | 1-2        |
| **Total**                | **~12-17** |
