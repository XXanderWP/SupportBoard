# SupportBoard

<div align="center">

A powerful Telegram bot for managing support tickets and topics with ease. Organize, track, and respond to support requests efficiently within Telegram groups.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

[Features](#features) • [Installation](#installation) • [Configuration](#configuration) • [Usage](#usage) • [Development](#development)

</div>

---

## 📋 Overview

**SupportBoard** is a feature-rich Telegram bot designed to streamline support ticket management. It allows teams to create, organize, and manage support topics directly within Telegram groups. With multi-language support, customizable topic limits, and flexible configuration options, SupportBoard is perfect for communities, teams, and businesses looking to centralize their support infrastructure.

## ✨ Features

- 🤖 **Telegram Bot Integration** - Direct integration with Telegram groups for seamless support management
- 📝 **Topic Management** - Create, edit, and track support topics with ease
- 🌍 **Multi-Language Support** - Built-in support for English, Ukrainian, and Russian
- 👥 **User Roles** - Admin, client, and system-level role management
- 💾 **Persistent Storage** - Secure storage system for topics and user data
- 🔐 **Key Control** - Advanced permission and authentication system
- ⚙️ **Configurable Limits** - Set maximum topic limits and manage storage retention
- 🧹 **System Messages** - Optional system message filtering to keep conversations clean
- 📊 **Data Management** - Comprehensive data handling and retrieval system

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- **Telegram Bot Token** (obtain from [BotFather](https://t.me/botfather))
- **Telegram Group ID** where the bot will operate

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/XXanderWP/SupportBoard.git
   cd SupportBoard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.defaults .env
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

## ⚙️ Configuration

Create a `.env` file in the project root based on `.env.defaults`:

```env
# Telegram Bot Configuration
# Create a bot using BotFather (@BotFather on Telegram)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Telegram group ID where support topics will be posted
# Use a negative number for supergroups (e.g., -1001234567890)
TELEGRAM_GROUP_ID=your-telegram-group-id

# System language for messages
# Options: 'en' (English), 'uk' (Ukrainian), 'ru' (Russian)
LANG=en

# Remove system messages (like "topic edited") from the Telegram group
REMOVE_SYSTEM_MESSAGES=true

# Keep closed topics in storage (marked as closed, not deleted)
KEEP_CLOSED_TOPICS=true

# Maximum number of topics to keep in storage
# Older topics will be deleted when this limit is exceeded
# If active topics exceed this limit, new ones cannot be created until some are closed
TOPIC_LIMITS=30
```

### Configuration Options

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | string | - | Your Telegram bot token from BotFather |
| `TELEGRAM_GROUP_ID` | number | - | The ID of your Telegram group |
| `LANG` | string | `en` | System language (en/uk/ru) |
| `REMOVE_SYSTEM_MESSAGES` | boolean | `true` | Filter out system messages |
| `KEEP_CLOSED_TOPICS` | boolean | `true` | Preserve closed topics in storage |
| `TOPIC_LIMITS` | number | `30` | Maximum number of topics allowed |

## 📖 Usage

### Available Scripts

```bash
# Build the project (TypeScript → JavaScript)
npm run build

# Watch mode - rebuild on file changes
npm run watch

# Development mode with auto-reload
npm run dev

# Run tests (not yet implemented)
npm run test
```

### Getting Started

1. **Start the bot in development mode:**
   ```bash
   npm run dev
   ```

2. **In production, build and run:**
   ```bash
   npm run build
   npm start
   ```

3. **Interact with the bot:**
   - Add the bot to your Telegram group
   - Use bot commands to create and manage support topics
   - The bot will post updates to your configured group

## 🏗️ Project Structure

```
SupportBoard/
├── src/
│   ├── backend/
│   │   ├── index.ts              # Backend entry point
│   │   └── modules/              # Backend modules
│   │       ├── admin.ts          # Admin functionality
│   │       ├── client.ts         # Client-facing features
│   │       ├── data.ts           # Data management
│   │       ├── keycontrol.ts     # Permission control
│   │       ├── lang.ts           # Language handling
│   │       ├── storage.ts        # Storage management
│   │       ├── system.ts         # System utilities
│   │       └── telegram.ts       # Telegram bot integration
│   ├── frontend/                 # Frontend components
│   ├── lang/                     # Language files (en, uk, ru)
│   ├── shared/                   # Shared utilities
│   └── types/                    # TypeScript definitions
├── bundle/                       # Compiled output
├── webpack.config.js             # Webpack configuration
├── tsconfig.json                 # TypeScript configuration
├── eslint.config.mjs             # ESLint configuration
├── .prettierrc                   # Prettier configuration
└── package.json                  # Project metadata
```

## 🛠️ Development

### Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **Bundler:** Webpack
- **Linter:** ESLint
- **Formatter:** Prettier
- **Telegram Integration:** node-telegram-bot-api

### Code Quality

The project includes:
- **ESLint** - Code style enforcement
- **Prettier** - Code formatting
- **TypeScript** - Type safety
- **Webpack** - Module bundling

### Development Workflow

1. **Write code** in TypeScript
2. **Run** `npm run watch` for automatic compilation
3. **Use** `npm run dev` for development with auto-reload
4. **Format** code with Prettier
5. **Build** with `npm run build` for production

### Making Changes

- Edit source files in `/src/` directory
- TypeScript will compile to `/bundle/` directory
- Webpack handles bundling and asset management
- ESLint and Prettier ensure code quality

## 🌐 Multi-Language Support

SupportBoard supports multiple languages. Language files are located in `src/lang/`:

- `en.json` - English
- `uk.json` - Ukrainian
- `ru.json` - Russian
- `shared.json` - Shared translations

Set your preferred language in the `.env` file using the `LANG` variable.

## 📦 Modules

### Core Modules

- **admin.ts** - Administrative functions and controls
- **client.ts** - Client-side operations and interactions
- **data.ts** - Data retrieval and manipulation
- **keycontrol.ts** - Authentication and permission management
- **lang.ts** - Language management and translation
- **storage.ts** - Topic and data storage operations
- **system.ts** - System-wide utilities and helpers
- **telegram.ts** - Telegram bot integration and message handling

## 🔗 Dependencies

### Main Dependencies

- `node-telegram-bot-api` - Telegram bot API wrapper
- `webpack` - Module bundler
- `typescript` - Type-safe JavaScript

### Development Dependencies

- `@typescript-eslint/parser` - TypeScript ESLint parser
- `eslint` - Code linter
- `prettier` - Code formatter
- `nodemon` - Development auto-reload
- `@types/node-telegram-bot-api` - Type definitions

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 🐛 Troubleshooting

### Bot not responding?
- Verify your `TELEGRAM_BOT_TOKEN` is correct
- Check that the bot has permissions in your Telegram group
- Ensure `TELEGRAM_GROUP_ID` is correct (use negative number for supergroups)

### Topics not saving?
- Check that storage directory (`.storage`) has write permissions
- Verify `TOPIC_LIMITS` is configured appropriately

### Language not changing?
- Confirm `LANG` variable is set to a supported language (en/uk/ru)
- Ensure language files exist in `src/lang/`

## 📧 Support

For support, issues, or feature requests, please visit the [Issues page](https://github.com/XXanderWP/SupportBoard/issues).

---

<div align="center">

**Made with ❤️ by [XXanderWP](https://github.com/XXanderWP)**

[⬆ Back to top](#supportboard)

</div>
