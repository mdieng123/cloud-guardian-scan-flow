# Cloud Guardian Scan Flow

A comprehensive cloud security assessment tool that combines Terraform export capabilities with advanced AI-powered security analysis using Google Gemini and Prowler security scanning.

## 🚀 Quick Start

**New to the project? Run this single command:**

```bash
./setup.sh
```

This will install all dependencies, set up virtual environments, and configure everything for you!

## ✨ Features

- **🔄 Use Latest Export**: Skip 10-minute exports by reusing recent ones
- **🌐 Multi-Cloud Support**: Export resources from GCP and Azure to Terraform format
- **🤖 Modern AI Analysis**: Advanced security analysis using Google Gemini 2.0 Flash with LlamaIndex RAG
- **🛡️ Prowler Integration**: Industry-standard security scanning with Prowler
- **⚡ Real-time UI**: Modern React interface with real-time progress updates
- **📊 Consolidation Reports**: Combined analysis from multiple security tools
- **🔧 Export Management**: Automated Terraform configuration export and analysis

## 📋 Prerequisites

The setup script will install most of these automatically, but you may need:

- **System**: macOS or Linux
- **Node.js**: 18+ (auto-installed)
- **Python**: 3.13+ (auto-installed)
- **Cloud CLIs**: gcloud, az (auto-installed)

## ⚡ Installation & Setup

### Option 1: Automated Setup (Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd cloud-guardian-scan-flow

# Run the complete setup (installs everything)
./setup.sh

# Follow the instructions to configure API keys
cp .env .env.local
# Edit .env.local with your Gemini API key
```

### Option 2: Manual Setup
```bash
# Install Node.js dependencies
npm install

# Setup Python environment
npm run python:setup

# Create configuration
cp .env .env.local
# Edit .env.local with your settings
```

### Option 3: Quick Setup (Skip System Dependencies)
```bash
# If you already have system tools installed
npm run setup:quick
```

## 🎯 Usage

### Web Interface (Recommended)

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Open your browser:** `http://localhost:5173`

3. **Follow the workflow:**
   - ✅ Check cloud authentication
   - 📤 Select cloud provider (GCP/Azure)
   - ⚡ **Use Latest Export** (skip 10-min wait!) or create new export
   - 🔑 Enter your Gemini API key
   - 🔍 Run security analysis
   - 📊 Review consolidated reports

### Command Line Interface
```bash
# Interactive security scan
./cloudsec.sh

# Test the setup
npm run scan:test
```

## 🔑 Configuration

### Required: Gemini API Key
1. Get your free API key: [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Add to `.env.local`:
   ```bash
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```

### Cloud Authentication
```bash
# Authenticate with cloud providers
npm run auth:gcp     # or: gcloud auth login
npm run auth:azure   # or: az login
```

## 🛠️ Available Commands

### Development
```bash
npm run dev              # Start full development environment
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only
npm run build           # Build for production
```

### Python Environment
```bash
npm run python:setup    # Create Python virtual environment
npm run python:activate # Activate Python environment
```

### Security Scanning
```bash
npm run scan:cli        # Run CLI security scanner
npm run scan:test       # Test scanner functionality
```

### Maintenance
```bash
npm run deps:check      # Check for dependency issues
npm run deps:update     # Update all dependencies
npm run clean          # Clean install everything
```

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React + TypeScript + Vite + shadcn/ui
- **Backend**: Node.js + Express + WebSocket
- **AI Analysis**: Python + LlamaIndex + Google Gemini 2.0 Flash
- **Security Scanning**: Prowler
- **Cloud Export**: gcloud/az CLI tools

### Modern Features (2025)
- ✅ **Non-deprecated LlamaIndex APIs**: Future-proof implementation
- ✅ **RAG Pipeline**: Advanced document analysis with vector embeddings
- ✅ **Latest Export Reuse**: Skip lengthy exports when possible
- ✅ **Lazy Initialization**: Better performance and testing
- ✅ **Comprehensive Testing**: Automated verification of all components

### Project Structure
```
cloud-guardian-scan-flow/
├── 📁 src/                           # React frontend
│   ├── 📁 components/               # UI components
│   ├── 📁 lib/                     # API client & utilities
│   └── 📁 pages/                   # App pages
├── 📁 server/                       # Node.js backend
├── 📁 llama_env/                   # Python virtual environment
├── 🐍 gemini_security_scanner.py   # Modern AI scanner
├── 🔧 cloudsec.sh                  # Main security script
├── 📦 requirements.txt             # Python dependencies
├── ⚡ setup.sh                     # Automated setup script
└── 📚 README.md                    # This file
```

## 🧪 Testing & Verification

The setup includes comprehensive testing:

```bash
# Run all tests
npm run scan:test

# Check dependencies
npm run deps:check

# Verify cloud authentication
gcloud auth list
az account show
```

## 🔒 Security Considerations

- ✅ **API keys**: Handled securely, never logged or committed
- ✅ **Local processing**: All analysis performed on your machine
- ✅ **Data privacy**: Export data stored locally, auto-cleaned
- ✅ **HTTPS**: Secure communication with APIs
- ✅ **Minimal permissions**: Least-privilege access patterns

## 🐛 Troubleshooting

### Common Issues

**"Command not found" errors:**
```bash
# Re-run setup to install missing tools
./setup.sh
```

**Python import errors:**
```bash
# Recreate Python environment
npm run python:setup
```

**Server connection issues:**
```bash
# Check if server is running
curl http://localhost:3001/api/health
```

**Export directory not found:**
```bash
# Check for existing exports
ls -la *_export_*
```

## 🚀 Recent Updates

- ✅ **Modern LlamaIndex**: Upgraded to 2025 non-deprecated APIs
- ✅ **Latest Export Feature**: Skip 10-minute waits by reusing exports
- ✅ **Automated Setup**: Complete environment setup with one command
- ✅ **Comprehensive Testing**: Full test suite for reliability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test: `npm run scan:test`
4. Update dependencies: Add to `requirements.txt` and `package.json`
5. Update setup script: Modify `setup.sh` if needed
6. Submit a pull request

## 📝 License

[Add your license information]

## 💬 Support

For issues and questions:
1. 📖 Check this README and setup instructions
2. 🧪 Run `npm run scan:test` to verify your setup
3. 🔍 Review existing GitHub issues
4. 🆕 Create a new issue with detailed information

---

**⚡ Pro Tip**: Always use `npm run dev` to start both frontend and backend servers together!