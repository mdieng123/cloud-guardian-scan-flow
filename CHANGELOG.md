# Changelog

All notable changes to the Cloud Guardian Scan Flow project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2025-07-30

### 🎉 Major Features Added
- **Use Latest Export Button**: Skip 10-minute export process by reusing recent exports
- **Modern LlamaIndex Integration**: Upgraded to 2025 non-deprecated APIs
- **Automated Setup System**: Complete environment setup with single command
- **Comprehensive Testing Suite**: Automated verification of all components

### ✨ Enhanced Features
- **Modern RAG Pipeline**: Advanced document analysis with vector embeddings
- **Lazy Initialization**: Better performance and testing capabilities
- **Real-time Export Detection**: Automatically finds and validates existing exports
- **Enhanced Error Handling**: Better error messages and recovery options

### 🔧 Technical Improvements
- **LlamaIndex Upgrade**: 
  - Replaced deprecated `llama_index.core.workflow` with modern RAG patterns
  - Uses `GoogleGenAI` + `GoogleGenAIEmbedding` + `VectorStoreIndex`
  - Future-proof implementation with current 2025 APIs
- **Backend API Enhancements**:
  - Added `/api/check-latest-export` endpoint
  - Improved API key handling from UI to scanner
  - Better WebSocket communication patterns
- **Frontend Improvements**:
  - Added "Use Latest Export" card with export details
  - Better progress indicators and user feedback
  - Enhanced error states and recovery options

### 📦 Dependencies
- **Added**: 
  - `llama-index-core>=0.12.47`
  - `llama-index-llms-google-genai>=0.2.3`
  - `llama-index-embeddings-google-genai>=0.2.1`
  - `google-genai>=1.24.0`
  - `glob` for export directory scanning
- **Updated**: Modern LlamaIndex ecosystem packages
- **Maintained**: All existing security scanning dependencies

### 🛠️ Developer Experience
- **New Scripts**:
  - `npm run setup` - Complete automated setup
  - `npm run setup:quick` - Quick setup (skip system deps)
  - `npm run python:setup` - Python environment setup
  - `npm run scan:test` - Test scanner functionality
  - `npm run deps:check` - Dependency verification
  - `npm run clean` - Clean reinstall
- **Setup Automation**: 
  - `setup.sh` - Comprehensive environment setup script
  - `requirements.txt` - Python dependency management
  - `.env` template with all required variables

### 📋 New Files
- `requirements.txt` - Python dependencies specification
- `setup.sh` - Automated setup script
- `gemini_security_scanner.py` - Modern LlamaIndex-based scanner
- `GEMINI_UPGRADE_SUMMARY.md` - Technical upgrade documentation
- `CHANGELOG.md` - This changelog file

### 🔄 Changed
- **Main Development Command**: `npm run dev` now starts both frontend and backend
- **Scanner Architecture**: Moved from deprecated workflows to modern RAG pipeline
- **API Key Flow**: Streamlined from UI → Server → Python scanner
- **Export Workflow**: Added option to reuse existing exports

### 🔒 Security Improvements
- **API Key Security**: Enhanced secure handling throughout the pipeline
- **Local Processing**: All AI analysis performed locally
- **Data Privacy**: Export data automatically cleaned up
- **Minimal Permissions**: Least-privilege access patterns maintained

### 🧪 Testing
- **Comprehensive Test Suite**: Validates all components
- **Automated Verification**: Tests imports, file structure, and scanner initialization
- **Dependency Checking**: Ensures all required packages are available
- **Integration Testing**: End-to-end workflow verification

### 📖 Documentation
- **Complete README Rewrite**: Comprehensive setup and usage instructions
- **Setup Documentation**: Step-by-step onboarding process
- **Architecture Documentation**: Clear technical overview
- **Troubleshooting Guide**: Common issues and solutions

## [1.0.0] - 2025-07-29

### Added
- Initial release of Cloud Guardian Scan Flow
- Multi-cloud support (GCP and Azure)
- Terraform resource export functionality
- Basic Gemini AI integration
- Prowler security scanning
- React frontend with real-time updates
- WebSocket-based progress streaming
- Consolidation analysis reports

### Features
- Cloud resource export to Terraform format
- AI-powered security analysis
- Real-time UI with progress updates
- Multi-step workflow interface
- Authentication verification
- Export result management

---

## Migration Guide: v1.0 → v2.0

### For New Users
Simply run `./setup.sh` and follow the instructions.

### For Existing Users
1. **Update Dependencies**:
   ```bash
   npm run clean  # This will reinstall everything fresh
   ```

2. **Configure Environment**:
   ```bash
   cp .env .env.local
   # Add your Gemini API key to .env.local
   ```

3. **Test Setup**:
   ```bash
   npm run scan:test
   ```

### Breaking Changes
- **None**: v2.0 maintains full backward compatibility
- **Enhanced**: All existing functionality preserved and improved
- **New**: Additional features available but optional

### Recommended Actions
- **Use Latest Export**: Take advantage of the new export reuse feature
- **Modern Scanner**: Benefits from improved AI analysis automatically
- **Automated Setup**: Use `./setup.sh` for easier onboarding of team members