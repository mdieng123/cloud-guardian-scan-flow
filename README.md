# GEMINI VAULT
IMPORTANT:DELETE CHROMBDB AND EXPORT FILES AFTER EACH RUN TO NOT MIX UP FINDINGS. 
This is a comprehensive cloud security assessment tool that combines Terraform export capabilities with advanced AI-powered security analysis using Google Gemini and Prowler security scanning.

## 🚀 Quick Start

**New to the project? Run this single command:**

```bash
./start.sh
```

This will automatically install all dependencies, set up virtual environments, configure everything, and start the application!

## ✨ Features

- **🔄 Use Latest Export**: Skip 10-minute exports by reusing recent ones
- **🌐 Multi-Cloud Support**: Export resources from AWS, GCP, and Azure to Terraform format
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
- **Cloud CLIs**: gcloud, az, aws (auto-installed)
- **Terraform**: Latest version (auto-installed)

## ⚡ Installation & Setup

### Option 1: Automated Setup & Start (Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd cloud-guardian-scan-flow

# Run the complete setup and start (installs everything and starts the app)
./start.sh

# Follow the instructions to configure API keys
cp .env .env.local
# Edit .env.local with your Gemini API key
```

### Option 2: Setup Only (No Auto-Start)
```bash
# Run setup without starting the application
./setup.sh

# Start manually when ready
npm run dev
```

### Option 3: Manual Setup
```bash
# Install Node.js dependencies
npm install

# Setup Python environment
npm run python:setup

# Create configuration
cp .env .env.local
# Edit .env.local with your settings
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
   - 📤 Select cloud provider (AWS/GCP/Azure)
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
npm run auth:aws     # or: aws configure (or ./setup_aws.sh)
```

### AWS-Specific Setup
```bash
# Option 1: Quick AWS setup script
./setup_aws.sh

# Option 2: Manual AWS CLI configuration
aws configure

# Option 3: Use existing AWS credentials
# Ensure ~/.aws/credentials exists with access keys

# Import specific AWS resources (examples)
./aws_import.sh --vpc-ids vpc-123,vpc-456 --regions us-east-1
./aws_import.sh --resources vpc,subnet,instance --regions us-west-2
./aws_import.sh --help  # See all options
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
- **Cloud Export**: Terraform + Terraformer (AWS), gcloud/az CLI tools (GCP/Azure)
- **Vector Store**: ChromaDB for provider-specific data isolation

### Modern Features (2025)
- ✅ **Non-deprecated LlamaIndex APIs**: Future-proof implementation
- ✅ **RAG Pipeline**: Advanced document analysis with vector embeddings
- ✅ **Latest Export Reuse**: Skip lengthy exports when possible
- ✅ **Provider Isolation**: Separate ChromaDB collections prevent data contamination
- ✅ **AWS Terraformer Integration**: Reverse Terraform for existing AWS infrastructure
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
├── 🔗 aws_import.sh                # AWS resource import script
├── 📁 tftest/                      # Terraform workspace for AWS imports
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
aws sts get-caller-identity
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

- ✅ **AWS Support Added**: Full AWS integration with Terraformer and Terraform
- ✅ **Provider Isolation**: ChromaDB collections isolated per cloud provider (AWS/GCP/Azure)
- ✅ **Modern LlamaIndex**: Upgraded to 2025 non-deprecated APIs
- ✅ **Latest Export Feature**: Skip 10-minute waits by reusing exports
- ✅ **Automated Setup**: Complete environment setup with one command
- ✅ **Enhanced Security**: Fixed cross-provider data contamination issues

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
