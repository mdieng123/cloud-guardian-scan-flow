#!/bin/bash

echo "🔐 AWS CLI Setup Helper"
echo "======================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Installing..."
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "🍎 Detected macOS - Installing AWS CLI..."
        if command -v brew &> /dev/null; then
            echo "📦 Using Homebrew..."
            brew install awscli
        else
            echo "📥 Downloading AWS CLI installer..."
            curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
            echo "🔧 Installing AWS CLI (requires sudo)..."
            sudo installer -pkg AWSCLIV2.pkg -target /
            rm AWSCLIV2.pkg
        fi
    elif [[ "$OSTYPE" == "linux"* ]]; then
        # Linux
        echo "🐧 Detected Linux - Installing AWS CLI..."
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        sudo ./aws/install
        rm -rf aws awscliv2.zip
    else
        echo "❌ Unsupported OS: $OSTYPE"
        echo "   Please install AWS CLI manually: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
    
    # Verify installation
    if command -v aws &> /dev/null; then
        echo "✅ AWS CLI installed successfully: $(aws --version)"
    else
        echo "❌ AWS CLI installation failed"
        exit 1
    fi
fi

# Check if AWS CLI is configured
if aws sts get-caller-identity >/dev/null 2>&1; then
    echo "✅ AWS CLI already configured"
    aws sts get-caller-identity
    echo ""
    echo "🎯 You're ready to run AWS import:"
    echo "   ./aws_import.sh --vpc-ids vpc-12345,vpc-67890 --regions eu-west-1"
    exit 0
fi

echo ""
echo "🔧 AWS CLI Configuration"
echo "========================"
echo ""
echo "Choose your authentication method:"
echo ""
echo "1) Access Keys (for personal/testing accounts)"
echo "2) AWS SSO (for enterprise accounts)"
echo "3) Environment Variables (manual setup)"
echo "4) Skip configuration (manual setup later)"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🔑 Access Keys Configuration"
        echo "   You'll need:"
        echo "   - AWS Access Key ID"
        echo "   - AWS Secret Access Key"
        echo "   - Default region (e.g., us-east-1, eu-west-1)"
        echo ""
        echo "   💡 Get these from AWS Console > IAM > Users > Your User > Security credentials"
        echo ""
        aws configure
        ;;
    2)
        echo ""
        echo "🏢 AWS SSO Configuration"
        echo "   You'll need your SSO start URL and region"
        echo ""
        aws configure sso
        ;;
    3)
        echo ""
        echo "🌐 Environment Variables Setup"
        echo "   Add these to your ~/.bashrc or ~/.zshrc:"
        echo ""
        echo "   export AWS_ACCESS_KEY_ID=\"your-access-key-here\""
        echo "   export AWS_SECRET_ACCESS_KEY=\"your-secret-key-here\""
        echo "   export AWS_DEFAULT_REGION=\"us-east-1\""
        echo ""
        echo "   Then reload your shell: source ~/.bashrc"
        echo ""
        ;;
    4)
        echo ""
        echo "⏭️  Skipping configuration"
        echo "   Configure AWS CLI manually when ready:"
        echo "   - aws configure"
        echo "   - aws configure sso"
        echo "   - Environment variables"
        echo ""
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🧪 Testing AWS Configuration..."
if aws sts get-caller-identity; then
    echo ""
    echo "✅ AWS CLI configured successfully!"
    echo ""
    echo "📋 Your AWS Identity:"
    aws sts get-caller-identity --output table
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Run the AWS import script:"
    echo "      ./aws_import.sh --vpc-ids vpc-12345,vpc-67890 --regions eu-west-1"
    echo ""
    echo "   2. Or get help with options:"
    echo "      ./aws_import.sh --help"
    echo ""
else
    echo ""
    echo "❌ AWS Configuration failed"
    echo "   Please check your credentials and try again"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   - Verify your credentials are correct"
    echo "   - Check if your account is active"
    echo "   - Ensure you have basic permissions (sts:GetCallerIdentity)"
    echo ""
fi