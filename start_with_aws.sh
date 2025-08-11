#!/bin/bash

echo "🚀 Starting Cloud Security Assessment Tool with AWS Support"
echo "==========================================================="

# Check AWS credentials first
echo "🔍 Checking AWS credentials..."
if aws sts get-caller-identity >/dev/null 2>&1; then
    echo "✅ AWS credentials are configured"
    aws sts get-caller-identity
    echo ""
else
    echo "❌ AWS credentials not found"
    echo ""
    echo "Please configure AWS credentials first:"
    echo "1. Run: aws configure"
    echo "2. Or set environment variables:"
    echo "   export AWS_ACCESS_KEY_ID=\"your-access-key\""
    echo "   export AWS_SECRET_ACCESS_KEY=\"your-secret-key\""
    echo "   export AWS_DEFAULT_REGION=\"your-region\""
    echo "3. Or run: ./setup_aws.sh"
    echo ""
    read -p "Do you want to configure AWS now? (y/n): " configure_aws
    
    if [[ $configure_aws == "y" || $configure_aws == "Y" ]]; then
        ./setup_aws.sh
        # Check again after setup
        if ! aws sts get-caller-identity >/dev/null 2>&1; then
            echo "❌ AWS configuration failed. Exiting."
            exit 1
        fi
    else
        echo "ℹ️  Starting without AWS support. You can configure it later."
    fi
fi

# Run the normal startup
echo "🚀 Starting application..."
./start.sh