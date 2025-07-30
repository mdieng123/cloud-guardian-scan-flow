#!/bin/bash
#===============================================
# Cloud Guardian Scan Flow - Setup Script
# Purpose: Complete environment setup for new developers
# Version: 1.0
# Author: Cloud Security Team
#===============================================

set -e  # Exit on any error

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}     Cloud Guardian Scan Flow Setup            ${NC}"
echo -e "${BLUE}     Complete Environment Configuration        ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Homebrew on macOS
install_homebrew() {
    if [[ "$OSTYPE" == "darwin"* ]] && ! command_exists brew; then
        echo -e "${YELLOW}Installing Homebrew...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
}

# Function to install system dependencies
install_system_deps() {
    echo -e "${YELLOW}Installing system dependencies...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS with Homebrew
        if command_exists brew; then
            brew update
            brew install python@3.13 node jq
            
            # Install cloud CLIs
            echo -e "${YELLOW}Installing cloud CLIs...${NC}"
            brew install google-cloud-sdk
            brew install azure-cli
            
            # Install prowler dependencies
            echo -e "${YELLOW}Installing security tools...${NC}"
            brew install prowler || echo -e "${YELLOW}Prowler will be installed via pip${NC}"
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command_exists apt-get; then
            sudo apt-get update
            sudo apt-get install -y python3 python3-pip python3-venv nodejs npm jq curl
            
            # Install Google Cloud SDK
            echo -e "${YELLOW}Installing Google Cloud SDK...${NC}"
            curl https://sdk.cloud.google.com | bash
            
            # Install Azure CLI
            echo -e "${YELLOW}Installing Azure CLI...${NC}"
            curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
        fi
    fi
}

# Function to setup Python virtual environment
setup_python_env() {
    echo -e "${YELLOW}Setting up Python virtual environment...${NC}"
    
    # Create virtual environment if it doesn't exist
    if [[ ! -d "llama_env" ]]; then
        python3 -m venv llama_env
        echo -e "${GREEN}✓ Created Python virtual environment: llama_env${NC}"
    else
        echo -e "${GREEN}✓ Python virtual environment already exists${NC}"
    fi
    
    # Activate virtual environment
    source llama_env/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install Python dependencies
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    pip install -r requirements.txt
    
    echo -e "${GREEN}✓ Python dependencies installed${NC}"
}

# Function to setup Node.js dependencies
setup_node_env() {
    echo -e "${YELLOW}Setting up Node.js environment...${NC}"
    
    # Check Node.js version
    if command_exists node; then
        NODE_VERSION=$(node --version)
        echo -e "${BLUE}Node.js version: ${NODE_VERSION}${NC}"
    else
        echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
        exit 1
    fi
    
    # Install dependencies
    echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
    npm install
    
    echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
}

# Function to verify cloud CLI authentication
verify_cloud_auth() {
    echo -e "${YELLOW}Checking cloud CLI authentication...${NC}"
    
    # Check GCP authentication
    if command_exists gcloud; then
        if gcloud auth list 2>/dev/null | grep -q "ACTIVE"; then
            echo -e "${GREEN}✓ GCP authentication is active${NC}"
        else
            echo -e "${YELLOW}⚠ GCP not authenticated. Run: gcloud auth login${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Google Cloud SDK not found${NC}"
    fi
    
    # Check Azure authentication
    if command_exists az; then
        if az account show &>/dev/null; then
            echo -e "${GREEN}✓ Azure authentication is active${NC}"
        else
            echo -e "${YELLOW}⚠ Azure not authenticated. Run: az login${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Azure CLI not found${NC}"
    fi
}

# Function to create configuration files
create_config_files() {
    echo -e "${YELLOW}Creating configuration files...${NC}"
    
    # Create .env template if it doesn't exist
    if [[ ! -f ".env" ]]; then
        cat > .env << 'EOF'
# Cloud Guardian Scan Flow Environment Variables
# Copy this to .env.local and fill in your values

# Google Gemini API Key (get from https://aistudio.google.com/app/apikey)
GOOGLE_API_KEY=your_gemini_api_key_here

# GCP Settings
GCP_PROJECT_ID=your_gcp_project_id
GCP_REGION=us-central1

# Azure Settings (optional)
AZURE_SUBSCRIPTION_ID=your_azure_subscription_id
AZURE_RESOURCE_GROUP=your_resource_group

# Server Settings
PORT=3001
NODE_ENV=development

# Security Settings
HEADLESS_MODE=false
PROWLER_NO_BANNER=true
PROWLER_QUIET=false
EOF
        echo -e "${GREEN}✓ Created .env template${NC}"
        echo -e "${YELLOW}  Please copy .env to .env.local and add your API keys${NC}"
    fi
}

# Function to run tests
run_tests() {
    echo -e "${YELLOW}Running system tests...${NC}"
    
    # Test Python environment
    source llama_env/bin/activate
    python3 -c "
import sys
try:
    from llama_index.llms.google_genai import GoogleGenAI
    from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
    from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, Settings
    print('✅ Python: All LlamaIndex modules available')
except ImportError as e:
    print(f'❌ Python: Missing dependency: {e}')
    sys.exit(1)

try:
    import requests, pandas, numpy
    print('✅ Python: Core dependencies available')
except ImportError as e:
    print(f'❌ Python: Missing core dependency: {e}')
    sys.exit(1)
"
    
    # Test Node.js environment
    node -e "
try {
    require('express');
    require('cors');
    require('ws');
    require('glob');
    console.log('✅ Node.js: All required modules available');
} catch (e) {
    console.log('❌ Node.js: Missing dependency:', e.message);
    process.exit(1);
}
"
    
    echo -e "${GREEN}✓ All tests passed${NC}"
}

# Function to display final instructions
show_final_instructions() {
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}     Setup Complete!                          ${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "1. ${YELLOW}Configure your API keys:${NC}"
    echo -e "   cp .env .env.local"
    echo -e "   # Edit .env.local with your actual API keys"
    echo ""
    echo -e "2. ${YELLOW}Authenticate with cloud providers:${NC}"
    echo -e "   gcloud auth login"
    echo -e "   az login"
    echo ""
    echo -e "3. ${YELLOW}Start the application:${NC}"
    echo -e "   npm run dev"
    echo ""
    echo -e "${BLUE}Available commands:${NC}"
    echo -e "  ${GREEN}npm run dev${NC}        - Start development servers"
    echo -e "  ${GREEN}npm run build${NC}      - Build for production"
    echo -e "  ${GREEN}npm run server${NC}     - Start backend server only"
    echo -e "  ${GREEN}./cloudsec.sh${NC}      - Run security scan (CLI)"
    echo ""
    echo -e "${BLUE}Virtual Environments:${NC}"
    echo -e "  ${GREEN}source llama_env/bin/activate${NC} - Activate Python environment"
    echo ""
    echo -e "${YELLOW}Documentation:${NC}"
    echo -e "  README.md - Project overview"
    echo -e "  GEMINI_UPGRADE_SUMMARY.md - Recent upgrades"
    echo ""
}

# Main setup flow
main() {
    echo -e "${BLUE}Starting setup process...${NC}"
    echo ""
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]] || [[ ! -f "cloudsec.sh" ]]; then
        echo -e "${RED}✗ Please run this script from the project root directory${NC}"
        exit 1
    fi
    
    # Install system dependencies
    if [[ "$1" != "--skip-system" ]]; then
        install_homebrew
        install_system_deps
    fi
    
    # Setup environments
    setup_python_env
    setup_node_env
    
    # Create config files
    create_config_files
    
    # Verify setup
    verify_cloud_auth
    run_tests
    
    # Show final instructions
    show_final_instructions
    
    echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Cloud Guardian Scan Flow Setup Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --skip-system    Skip system dependency installation"
        echo "  --help, -h       Show this help message"
        echo ""
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac