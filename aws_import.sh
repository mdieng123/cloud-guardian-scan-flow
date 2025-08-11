#!/bin/bash

echo "🔗 AWS Infrastructure Import with Terraformer"
echo "============================================="

# Default values
RESOURCES="vpc,subnet,ec2_instance,security_group,iam_role,s3_bucket,rds_instance,lambda_function"
REGIONS="us-east-1"
FILTER=""
OUTPUT_DIR="./tftest"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --resources)
            RESOURCES="$2"
            shift 2
            ;;
        --regions)
            REGIONS="$2"
            shift 2
            ;;
        --filter)
            FILTER="$2"
            shift 2
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --vpc-ids)
            # Convert comma-separated VPC IDs to filter format
            VPC_IDS="$2"
            FILTER="vpc=$(echo $VPC_IDS | tr ',' ':')"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --resources RESOURCES    Comma-separated list of AWS resources to import"
            echo "                          Default: vpc,subnet,ec2_instance,security_group,iam_role,s3_bucket,rds_instance,lambda_function"
            echo "  --regions REGIONS        Comma-separated list of AWS regions"
            echo "                          Default: us-east-1"
            echo "  --filter FILTER         Terraformer filter (e.g., vpc=vpc-12345:vpc-67890)"
            echo "  --vpc-ids VPC_IDS       Comma-separated VPC IDs for filtering (converts to filter automatically)"
            echo "  --output-dir DIR        Output directory for generated Terraform files"
            echo "                          Default: ./tftest"
            echo "  -h, --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --vpc-ids vpc-12345,vpc-67890 --regions eu-west-1"
            echo "  $0 --resources vpc,subnet --filter 'vpc=vpc-12345:vpc-67890' --regions eu-west-1"
            echo "  $0 --resources ec2_instance,security_group --regions us-west-2,us-east-1"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not installed"
    echo ""
    echo "📥 Installing AWS CLI..."
    echo "   Please choose your installation method:"
    echo ""
    echo "   🍎 macOS:"
    echo "   curl \"https://awscli.amazonaws.com/AWSCLIV2.pkg\" -o \"AWSCLIV2.pkg\""
    echo "   sudo installer -pkg AWSCLIV2.pkg -target /"
    echo ""
    echo "   🐧 Linux:"
    echo "   curl \"https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip\" -o \"awscliv2.zip\""
    echo "   unzip awscliv2.zip"
    echo "   sudo ./aws/install"
    echo ""
    echo "   Or install via package manager:"
    echo "   - Ubuntu/Debian: sudo apt-get install awscli"
    echo "   - macOS Homebrew: brew install awscli"
    echo ""
    exit 1
fi

# Check if AWS CLI is configured
# First try with explicit credential file paths
export AWS_SHARED_CREDENTIALS_FILE="$HOME/.aws/credentials"
export AWS_CONFIG_FILE="$HOME/.aws/config"

if ! aws sts get-caller-identity >/dev/null 2>&1; then
    # Try with default region if no region is set
    if [ -z "$AWS_DEFAULT_REGION" ] && [ -z "$AWS_REGION" ]; then
        export AWS_DEFAULT_REGION="us-east-1"
        echo "🔧 Setting default region to us-east-1"
    fi
    
    # Try again with region set
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        echo "❌ AWS CLI not configured or credentials invalid"
        echo ""
        echo "🔐 AWS CLI Configuration Required"
        echo "   Choose one of the following options:"
        echo ""
        echo "   Option 1: Interactive Configuration"
        echo "   aws configure"
        echo ""
        echo "   Option 2: Environment Variables"
        echo "   export AWS_ACCESS_KEY_ID=\"your-access-key\""
        echo "   export AWS_SECRET_ACCESS_KEY=\"your-secret-key\""
        echo "   export AWS_DEFAULT_REGION=\"us-east-1\"  # or your preferred region"
        echo ""
        echo "   Option 3: AWS SSO (if using AWS Organizations)"
        echo "   aws configure sso"
        echo ""
        echo "   Option 4: IAM Role (if running on EC2)"
        echo "   # No configuration needed - uses instance metadata"
        echo ""
        echo "📋 Required AWS Permissions:"
        echo "   For basic resource import, you need READ permissions for:"
        echo "   - ec2:Describe* (VPC, subnets, instances, security groups)"
        echo "   - iam:List*, iam:Get* (IAM roles, policies)"
        echo "   - s3:ListBucket, s3:GetBucketLocation (S3 buckets)"
        echo "   - rds:Describe* (RDS instances)"
        echo "   - lambda:List*, lambda:Get* (Lambda functions)"
        echo ""
        echo "💡 Quick Test:"
        echo "   After configuration, test with: aws sts get-caller-identity"
        echo ""
        echo "🐛 Debug Info:"
        echo "   HOME: $HOME"
        echo "   AWS_SHARED_CREDENTIALS_FILE: $AWS_SHARED_CREDENTIALS_FILE"
        echo "   AWS_CONFIG_FILE: $AWS_CONFIG_FILE"
        echo "   AWS_DEFAULT_REGION: $AWS_DEFAULT_REGION"
        echo "   AWS_REGION: $AWS_REGION"
        echo "   AWS_PROFILE: $AWS_PROFILE"
        echo "   Credentials file exists: $([ -f "$HOME/.aws/credentials" ] && echo "Yes" || echo "No")"
        exit 1
    fi
fi

# Check if terraformer is available
if ! command -v terraformer &> /dev/null; then
    echo "❌ Terraformer not found. Please run start.sh first to install it."
    exit 1
fi

# Check if terraform is available
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform not found. Please run start.sh first to install it."
    exit 1
fi

# Get AWS account information
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_USER=$(aws sts get-caller-identity --query Arn --output text)
echo "✅ AWS configured - Account: $AWS_ACCOUNT"
echo "   User/Role: $AWS_USER"

# Create output directory
mkdir -p "$OUTPUT_DIR"
cd "$OUTPUT_DIR"

# Clean up previous imports (optional)
if [ -d "generated" ]; then
    echo "🧹 Cleaning up previous import..."
    rm -rf generated/aws
fi

# Build terraformer command
TERRAFORMER_CMD="terraformer import aws --resources=$RESOURCES --regions=$REGIONS"

if [ ! -z "$FILTER" ]; then
    TERRAFORMER_CMD="$TERRAFORMER_CMD --filter=$FILTER"
fi

# Add current directory as output
TERRAFORMER_CMD="$TERRAFORMER_CMD ."

echo "🚀 Running Terraformer import..."
echo "   Resources: $RESOURCES"
echo "   Regions: $REGIONS"
if [ ! -z "$FILTER" ]; then
    echo "   Filter: $FILTER"
fi
echo "   Output: $OUTPUT_DIR"
echo ""
echo "Command: $TERRAFORMER_CMD"
echo ""

# Run terraformer import
if eval "$TERRAFORMER_CMD"; then
    echo ""
    echo "✅ Terraformer import completed successfully!"
    
    # List generated files
    if [ -d "generated/aws" ]; then
        echo ""
        echo "📁 Generated Terraform files:"
        find generated/aws -name "*.tf" -type f | sort
        
        # Count total files
        TOTAL_FILES=$(find generated/aws -name "*.tf" -type f | wc -l)
        echo ""
        echo "📊 Total Terraform files generated: $TOTAL_FILES"
        
        # Create consolidated file for scanner
        echo "📝 Creating consolidated file for security scanner..."
        CONSOLIDATED_FILE="generated/aws_consolidated.txt"
        
        # Add metadata header
        cat > "$CONSOLIDATED_FILE" << EOF
# AWS Infrastructure Import - Security Scan Input
# Generated: $(date)
# Account: $AWS_ACCOUNT
# User/Role: $AWS_USER
# Resources: $RESOURCES
# Regions: $REGIONS
$([ ! -z "$FILTER" ] && echo "# Filter: $FILTER")
# Total Files: $TOTAL_FILES
# 
# This file contains all imported AWS Terraform configurations for security analysis
# by the Enhanced Gemini Security Scanner with ChromaDB Vector Store
#
===============================================================================

EOF
        
        # Append all .tf files with file headers
        find generated/aws -name "*.tf" -type f | sort | while read -r file; do
            echo "" >> "$CONSOLIDATED_FILE"
            echo "# File: $file" >> "$CONSOLIDATED_FILE"
            echo "# ===========================================" >> "$CONSOLIDATED_FILE"
            echo "" >> "$CONSOLIDATED_FILE"
            cat "$file" >> "$CONSOLIDATED_FILE"
            echo "" >> "$CONSOLIDATED_FILE"
        done
        
        CONSOLIDATED_SIZE=$(wc -c < "$CONSOLIDATED_FILE")
        echo "✅ Consolidated file created: $CONSOLIDATED_FILE ($CONSOLIDATED_SIZE bytes)"
        
        # Run terraform init in generated directories to ensure state consistency
        echo "🔧 Initializing Terraform in generated directories..."
        find generated/aws -type d -name "*" | while read -r dir; do
            if [ -f "$dir/provider.tf" ] || [ -f "$dir/main.tf" ]; then
                echo "   Initializing: $dir"
                (cd "$dir" && terraform init -input=false >/dev/null 2>&1 || echo "   ⚠️  Warning: terraform init failed in $dir")
            fi
        done
        
        echo ""
        echo "🎯 Next Steps:"
        echo "   1. Review generated files in: $OUTPUT_DIR/generated/aws"
        echo "   2. Run security scan on consolidated file: $CONSOLIDATED_FILE"
        echo "   3. Use the Enhanced Gemini Security Scanner:"
        echo "      python3 gemini_security_scanner.py <project_id> $OUTPUT_DIR <api_key>"
        echo ""
        echo "🔐 Security Scan Command Example:"
        echo "   python3 gemini_security_scanner.py aws-import-$(date +%Y%m%d) $OUTPUT_DIR \$GEMINI_API_KEY"
        
    else
        echo "⚠️  No files generated in generated/aws directory"
    fi
    
else
    echo ""
    echo "❌ Terraformer import failed!"
    echo "   Check your AWS credentials and permissions"
    echo "   Ensure you have read access to the resources you're trying to import"
    echo "   For VPC import, you need ec2:Describe* permissions"
    exit 1
fi

cd ..