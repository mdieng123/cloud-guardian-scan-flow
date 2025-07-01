# Cloud Security Assessment Tool

A comprehensive cloud security assessment tool with Terraform export and AI-powered analysis for GCP and Azure environments.

## 🚀 Quick Start

**The easiest way to run this tool:**

```bash
./start.sh
```

Then open http://localhost:5173 in your browser and follow the step-by-step workflow.

## 📋 Prerequisites

### Required CLI Tools
- **Node.js** (v16 or higher)
- **Google Cloud SDK** (`gcloud`)
- **Azure CLI** (`az`)
- **Python 3** (for security scanning)

### Optional Tools (for enhanced scanning)
- **Prowler** - `pip install prowler`
- **Gemini CLI** - For AI-powered consolidation analysis

### Authentication
Before using the tool, authenticate with your cloud providers:

```bash
# GCP Authentication
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Azure Authentication  
az login
```

## 🏗️ Architecture

This tool consists of:

1. **React Frontend** - Beautiful multi-step UI workflow
2. **Express Backend** - Executes the original bash script via API
3. **Bash Script** (`cloudsec.sh`) - Core cloud security logic (unchanged)
4. **WebSocket Communication** - Real-time progress updates

## 📖 Usage Workflow

1. **Authentication Check** - Verify cloud provider credentials
2. **Cloud Provider Selection** - Choose GCP or Azure
3. **Resource Export** - Export resources to Terraform format
4. **Security Scanning** - Run Gemini AI + Prowler analysis
5. **Results Review** - View consolidated security report

## 🔧 Manual Commands

If you prefer to run components separately:

```bash
# Backend only
npm run server

# Frontend only  
npm run dev

# Original bash script (standalone)
./cloudsec.sh
```

## 📁 Project Structure

```
cloud-guardian-scan-flow/
├── cloudsec.sh              # Original bash script (unchanged)
├── server/                  # Express backend
│   └── index.js            # API server with script execution  
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── lib/api.ts         # Backend communication
│   └── pages/             # Application pages
├── start.sh               # Easy startup script
└── package.json          # Dependencies
```

## 🔑 Key Features

- **Zero Script Changes** - Original `cloudsec.sh` logic preserved
- **Real-time Updates** - WebSocket progress streaming  
- **Beautiful UI** - Professional React interface
- **Error Handling** - Comprehensive error reporting
- **Cross-platform** - Works on macOS, Linux, Windows

## 🐛 Troubleshooting

**Backend connection failed:**
- Ensure port 3001 is available
- Check if all dependencies are installed: `npm install`

**Authentication issues:**
- Verify cloud CLI authentication: `gcloud auth list` / `az account show`
- Check network connectivity

**Export failures:**
- Ensure proper permissions for the project/resource group
- Verify Cloud Asset API is enabled (GCP)
- Check if `aztfexport` is installed (Azure)

## 🤝 Contributing

The integration preserves the original bash script functionality while adding a modern web interface. Modifications should maintain this separation of concerns.

## 📄 License

This project maintains compatibility with existing security assessment workflows while providing an enhanced user experience through modern web technologies.
