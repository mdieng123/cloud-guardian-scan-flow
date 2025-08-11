#!/bin/bash

echo "🚀 Starting Cloud Security Assessment Tool"
echo "========================================="

# Check if Python virtual environment exists
if [ ! -d "llama_env" ]; then
    echo "⚠️  Python environment not found. Running setup..."
    ./setup.sh --skip-system
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Make scripts executable
chmod +x cloudsec.sh setup.sh

# Setup Terraformer for AWS infrastructure import
echo "🔧 Setting up Terraformer for AWS..."
setup_terraformer() {
    # Check if terraformer is already installed
    if ! command -v terraformer &> /dev/null; then
        echo "📥 Installing Terraformer..."
        
        # Detect OS and architecture
        OS=$(uname -s | tr '[:upper:]' '[:lower:]')
        ARCH=$(uname -m)
        
        case $ARCH in
            x86_64) ARCH="amd64" ;;
            arm64) ARCH="arm64" ;;
            aarch64) ARCH="arm64" ;;
            *) echo "❌ Unsupported architecture: $ARCH"; return 1 ;;
        esac
        
        # Download and install terraformer
        TERRAFORMER_VERSION="0.8.24"
        TERRAFORMER_URL="https://github.com/GoogleCloudPlatform/terraformer/releases/download/${TERRAFORMER_VERSION}/terraformer-${OS}-${ARCH}"
        
        echo "📥 Downloading Terraformer ${TERRAFORMER_VERSION} for ${OS}/${ARCH}..."
        
        if command -v curl &> /dev/null; then
            curl -L "$TERRAFORMER_URL" -o terraformer
        elif command -v wget &> /dev/null; then
            wget "$TERRAFORMER_URL" -O terraformer
        else
            echo "❌ Neither curl nor wget found. Please install one of them."
            return 1
        fi
        
        chmod +x terraformer
        sudo mv terraformer /usr/local/bin/ 2>/dev/null || {
            echo "⚠️  Could not install to /usr/local/bin, installing to current directory"
            mv terraformer ./terraformer
            export PATH="$PWD:$PATH"
        }
        
        echo "✅ Terraformer installed successfully"
    else
        echo "✅ Terraformer already installed: $(terraformer version 2>/dev/null || echo 'version unknown')"
    fi
}

# Setup Terraform if not already installed
setup_terraform() {
    if ! command -v terraform &> /dev/null; then
        echo "📥 Terraform not found. Installing Terraform..."
        
        # Detect OS and architecture
        OS=$(uname -s | tr '[:upper:]' '[:lower:]')
        ARCH=$(uname -m)
        
        case $ARCH in
            x86_64) ARCH="amd64" ;;
            arm64) ARCH="arm64" ;;
            aarch64) ARCH="arm64" ;;
            *) echo "❌ Unsupported architecture: $ARCH"; return 1 ;;
        esac
        
        TERRAFORM_VERSION="1.6.6"
        TERRAFORM_URL="https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_${OS}_${ARCH}.zip"
        
        echo "📥 Downloading Terraform ${TERRAFORM_VERSION}..."
        
        if command -v curl &> /dev/null; then
            curl -L "$TERRAFORM_URL" -o terraform.zip
        elif command -v wget &> /dev/null; then
            wget "$TERRAFORM_URL" -O terraform.zip
        else
            echo "❌ Neither curl nor wget found. Please install one of them."
            return 1
        fi
        
        unzip terraform.zip
        chmod +x terraform
        sudo mv terraform /usr/local/bin/ 2>/dev/null || {
            echo "⚠️  Could not install to /usr/local/bin, installing to current directory"
            mv terraform ./terraform
            export PATH="$PWD:$PATH"
        }
        rm terraform.zip
        
        echo "✅ Terraform installed successfully"
    else
        echo "✅ Terraform already installed: $(terraform version | head -n1)"
    fi
}

# Run setup functions
setup_terraform
setup_terraformer

# Setup tftest directory for AWS import
echo "📁 Setting up tftest directory for AWS import..."
mkdir -p tftest
cd tftest

# Initialize Terraform in tftest directory if not already done
if [ ! -d ".terraform" ] || [ ! -f ".terraform.lock.hcl" ]; then
    echo "🔧 Initializing Terraform in tftest directory..."
    terraform init
    if [ $? -eq 0 ]; then
        echo "✅ Terraform initialized successfully"
    else
        echo "❌ Terraform initialization failed"
        echo "Make sure Terraform is installed: https://terraform.io/downloads"
    fi
else
    echo "✅ Terraform already initialized in tftest"
fi

cd ..

echo "🔧 Backend: Starting Express server on port 3001"
echo "🎨 Frontend: Starting React app on port 5173"
echo ""
echo "📖 Usage:"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. Follow the step-by-step workflow"
echo "  3. Make sure you're authenticated with cloud CLI:"
echo "     - GCP: gcloud auth login"
echo "     - Azure: az login" 
echo "     - AWS: ./setup_aws.sh (or aws configure)"
echo "  4. Add your Gemini API key in the UI"
echo ""
echo "☁️  AWS Import Workflow:"
echo "  - Setup AWS: ./setup_aws.sh"
echo "  - Import resources: ./aws_import.sh --vpc-ids vpc-123,vpc-456 --regions eu-west-1"
echo "  - Run security scan via UI or directly with gemini_security_scanner.py"
echo ""

# Start both server and frontend
npm run dev 