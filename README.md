<div align="center">

<img src="docs/media/bond-logo.png" alt="Bond AI Logo" width="120" height="120" />

# Bond AI

### The Autonomous Multi-Agent Desktop Command Hub

One unified desktop workbench for all your frontier AI coding agents. Run Claude Code, OpenAI Codex, Google Gemini CLI, Grok, and local LLMs simultaneously in native pseudo-terminal grids.

Windows 10/11 (64-bit) · macOS 13+ · Free & Open Source

<br/>

[![Download Windows Installer](https://img.shields.io/badge/Download-Windows%20x64%20Installer-00A86B?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/Krishna5567/BOND/releases/download/v1.0.0/Bond-Setup-x64.exe)
[![Download Portable Edition](https://img.shields.io/badge/Download-Portable%20x64%20Exe-10B981?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/Krishna5567/BOND/releases/download/v1.0.0/Bond-Portable-x64.exe)
[![YouTube Guide](https://img.shields.io/badge/YouTube-Krishna%20Tech-red?style=for-the-badge&logo=youtube)](https://youtube.com/@krishnatech-ind?si=divbfYPKeEpRVIB1)
[![Website Portal](https://img.shields.io/badge/Website-Live%20Portal-004D2C?style=for-the-badge)](https://krishna5567.github.io/bond-website/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=for-the-badge)](LICENSE)

</div>

---

## ⚡ What is Bond?

**Bond** is a dedicated desktop command hub for AI developers and agentic workflows. Instead of constantly switching between terminal tabs, web sandboxes, and multiple chat windows:

1. **Native ConPTY Engine**: Runs real interactive Windows ConPTY / POSIX PTY sessions directly on your machine with sub-millisecond typing latency.
2. **Default Operator Theme**: Shipped exclusively with the high-contrast **Operator (dark ops)** theme designed for extended coding sessions with zero eye fatigue.
3. **Multi-Agent Fleet**: Dispatch Claude Code in Pane 1, Gemini CLI in Pane 2, and PowerShell/Git in Pane 3 — watching all agents work concurrently on the same workspace folder.
4. **Model Context Protocol (MCP)**: Built-in MCP client giving all your agents unified access to databases, GitHub tools, local files, and custom tool endpoints.
5. **Local Voice Dictation**: Embedded on-device Whisper speech-to-text dictation runs 100% offline with zero external network requests.

---

## 📥 Downloads & Installation

| Package | Type | Architecture | Direct Download |
| :--- | :--- | :--- | :--- |
| **Standard Setup** | Automated Windows Installer (.exe) | x64 (64-bit) | [**Download Bond-Setup-x64.exe**](https://github.com/Krishna5567/BOND/releases/download/v1.0.0/Bond-Setup-x64.exe) |
| **Portable Edition** | Zero-Install Standalone Executable | x64 (64-bit) | [**Download Bond-Portable-x64.exe**](https://github.com/Krishna5567/BOND/releases/download/v1.0.0/Bond-Portable-x64.exe) |

> 💡 **Note on Windows SmartScreen**: Because this is a fresh open-source release, Windows Defender SmartScreen may display a blue warning (*"Windows protected your PC"*). Click **"More info"** and then **"Run anyway"** to launch. Bond is 100% open-source, safe, and transparent.

---

## 📺 Video Guide & Tutorial

Watch the complete video walkthrough by **Krishna Tech** on YouTube:
👉 **[Watch Setup & Installation Guide on Krishna Tech](https://youtube.com/@krishnatech-ind?si=divbfYPKeEpRVIB1)**

Topics covered:
* Downloading & installing the Bond Desktop App
* Handling the Windows SmartScreen dialog
* Setting up Anthropic, OpenAI, and Google Gemini API keys
* Connecting offline Ollama models
* Multi-pane agent split and fleet orchestration

---

## 🛠️ Building from Source

```bash
# Clone the repository
git clone https://github.com/Krishna5567/BOND.git
cd BOND

# Install dependencies
npm install

# Start in development mode
npm start

# Run test suite (1,700 unit & integration tests)
npm test

# Build Windows installer
npm run dist:win -- --x64
```

---

## 📄 License

Bond AI is free and open-source software licensed under the **[Apache License 2.0](LICENSE)**.
