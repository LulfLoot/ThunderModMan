# Thunder Dockman

A lightweight, web-based mod manager for game servers. Browse and install mods from [Thunderstore](https://thunderstore.io) directly through your browser.

![Docker](https://img.shields.io/badge/docker-ready-blue?logo=docker)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 🎮 **Multi-game support** – Valheim, Lethal Company, Risk of Rain 2, GTFO, and more
- 🔍 **Browse & search** – Find mods directly from Thunderstore
- ⚡ **One-click install** – Automatic download and extraction to your server
- 📦 **Dependency handling** – Installs required dependencies automatically
- 🔄 **Server restart** – Restart your game server container after mod changes
- 🎨 **Modern UI** – Dark theme with responsive design

## Quick Start

### Option 1: Standalone (Recommended)

Use with your existing game server:

```bash
docker run -d \
  --name thunderdock \
  -p 9876:9876 \
  -v /path/to/your/bepinex/plugins:/mods \
  -v thunderdock-data:/data \
  ghcr.io/YOUR_USERNAME/thunderdock:latest
```

Then open **http://localhost:9876** to manage mods.

### Option 2: With Example Valheim Server

Clone the repo and use the included docker-compose:

```bash
git clone https://github.com/YOUR_USERNAME/thunderdock.git
cd thunderdock

# Edit docker-compose.yml to configure your server
docker compose up -d
```

## Configuration

| Environment Variable | Default | Description                                                               |
| -------------------- | ------- | ------------------------------------------------------------------------- |
| `PORT`               | 9876    | Web UI port                                                               |
| `MODS_DIR`           | /mods   | Directory to install mods (mount your game's BepInEx/plugins folder here) |
| `DATA_DIR`           | /data   | Data directory for tracking installed mods                                |
| `RESTART_CONTAINER`  | -       | (Optional) Container name to restart after mod changes                    |

### Enabling Server Restart

To allow Thunder Dockman to restart your game server after installing mods:

```bash
docker run -d \
  --name thunderdock \
  -p 9876:9876 \
  -v /path/to/bepinex/plugins:/mods \
  -v thunderdock-data:/data \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e RESTART_CONTAINER=your-game-server-container \
  ghcr.io/YOUR_USERNAME/thunderdock:latest
```

## Supported Games

Any game supported by Thunderstore with BepInEx mods:

- Valheim
- Lethal Company
- Risk of Rain 2
- Content Warning
- GTFO
- Vintage Story
- _...and many more_

## Volume Mount Examples

| Game           | Container         | Mod Path                              |
| -------------- | ----------------- | ------------------------------------- |
| Valheim        | mbround18/valheim | `/home/steam/valheim/BepInEx/plugins` |
| Valheim        | lloesche/valheim  | `/config/bepinex/plugins`             |
| Lethal Company | -                 | `/game/BepInEx/plugins`               |

## Development

Run locally without Docker:

```bash
npm install
npm run dev
```

The server will start on http://localhost:9876

## API

| Method | Endpoint                             | Description          |
| ------ | ------------------------------------ | -------------------- |
| GET    | `/api/communities`                   | List supported games |
| GET    | `/api/packages/:community`           | Get mods for a game  |
| GET    | `/api/packages/:community/search?q=` | Search mods          |
| GET    | `/api/installed`                     | List installed mods  |
| POST   | `/api/install`                       | Install a mod        |
| DELETE | `/api/uninstall/:fullName`           | Uninstall a mod      |
| POST   | `/api/restart-server`                | Restart game server  |

## License

MIT
