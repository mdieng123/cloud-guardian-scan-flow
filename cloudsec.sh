#!/bin/bash#!/bin/bash
#===============================================
# Cloud Security Assessment Script
# Purpose: End-to-end cloud security assessment
# with Terraform export for GCP and Azure
# Version: 1.0
# Author: Security Assessment Team
#===============================================


# Check if we're running in bash
if [ -z "$BASH_VERSION" ]; then
   echo "This script requires bash. Please run with: bash $0"
   exit 1
fi


# Color definitions for better UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color


# Global variables
CLOUD_PROVIDER="${CLOUD_PROVIDER:-}"
PROJECT_ID="${PROJECT_ID:-}"
RESOURCE_GROUP="${RESOURCE_GROUP:-}"
EXPORT_SUCCESS=false
LAST_EXPORT_DIR=""
LAST_EXPORT_FILE=""
GEMINI_ANALYSIS_FILE=""
PROWLER_CLEANED_FILE=""
HEADLESS_MODE="${HEADLESS_MODE:-false}"


#######################################
# Function: Display welcome message
# Globals: None
# Arguments: None
# Outputs: Welcome banner
# Returns: None
#######################################
function display_welcome() {
   clear
   echo -e "${BLUE}================================================${NC}"
   echo -e "${BLUE}     Cloud Security Assessment Tool v1.0        ${NC}"
   echo -e "${BLUE}     Terraform Export & Gemini Integration      ${NC}"
   echo -e "${BLUE}================================================${NC}"
   echo ""
}


#######################################
# Function: Check authentication status
# Globals: CLOUD_PROVIDER
# Arguments: None
# Outputs: Authentication status
# Returns: 0 if authenticated, 1 if not
#######################################
function check_authentication() {
   echo -e "${YELLOW}Checking authentication status...${NC}"
   echo ""
  
   # Check GCP authentication
   echo -e "${BLUE}Google Cloud Platform (GCP):${NC}"
   if gcloud auth list 2>/dev/null | grep -q "ACTIVE"; then
       echo -e "${GREEN}✓ Authenticated with GCP${NC}"
       local gcp_account=$(gcloud config get-value account 2>/dev/null)
       echo -e "  Account: ${gcp_account}"
   else
       echo -e "${RED}✗ Not authenticated with GCP${NC}"
       echo -e "  Run: ${YELLOW}gcloud auth login${NC}"
   fi
  
   echo ""
  
   # Check Azure authentication
   echo -e "${BLUE}Microsoft Azure:${NC}"
   if az account show &>/dev/null; then
       echo -e "${GREEN}✓ Authenticated with Azure${NC}"
       local azure_account=$(az account show --query user.name -o tsv 2>/dev/null)
       echo -e "  Account: ${azure_account}"
   else
       echo -e "${RED}✗ Not authenticated with Azure${NC}"
       echo -e "  Run: ${YELLOW}az login${NC}"
   fi
  
   echo ""
   
   # In headless mode, skip interactive confirmation
   if [[ "$HEADLESS_MODE" == "true" ]]; then
       # Check if at least one provider is authenticated
       if gcloud auth list 2>/dev/null | grep -q "ACTIVE" || az account show &>/dev/null; then
           echo -e "${GREEN}✓ Authentication verified for headless mode${NC}"
           return 0
       else
           echo -e "${RED}✗ No valid authentication found for headless mode${NC}"
           return 1
       fi
   fi
   
   read -p "Are you properly authenticated with your cloud provider? (Y/N): " auth_confirm
  
   # Convert to uppercase in a portable way
   auth_confirm=$(echo "$auth_confirm" | tr '[:lower:]' '[:upper:]')
   if [[ "$auth_confirm" == "Y" ]]; then
       return 0
   else
       echo -e "${RED}Please authenticate before proceeding.${NC}"
       return 1
   fi
}


#######################################
# Function: Select cloud environment
# Globals: CLOUD_PROVIDER
# Arguments: None
# Outputs: Environment selection menu
# Returns: None
#######################################
function select_environment() {
   # In headless mode, use environment variable
   if [[ "$HEADLESS_MODE" == "true" ]]; then
       if [[ -n "$CLOUD_PROVIDER" ]]; then
           echo -e "${GREEN}Using cloud provider from environment: ${CLOUD_PROVIDER}${NC}"
           return 0
       else
           echo -e "${RED}✗ CLOUD_PROVIDER environment variable not set for headless mode${NC}"
           return 1
       fi
   fi
   
   echo -e "${YELLOW}Select your cloud environment:${NC}"
   echo "1) GCP Terraform Export"
   echo "2) Azure Terraform Export"
   echo ""
  
   while true; do
       read -p "Enter your choice (1 or 2): " env_choice
       case $env_choice in
           1)
               CLOUD_PROVIDER="GCP"
               echo -e "${GREEN}Selected: Google Cloud Platform${NC}"
               break
               ;;
           2)
               CLOUD_PROVIDER="AZURE"
               echo -e "${GREEN}Selected: Microsoft Azure${NC}"
               break
               ;;
           *)
               echo -e "${RED}Invalid choice. Please enter 1 or 2.${NC}"
               ;;
       esac
   done
}


#######################################
# Function: Get GCP project details
# Globals: PROJECT_ID
# Arguments: None
# Outputs: Project ID prompt
# Returns: 0 if valid, 1 if invalid
#######################################
function get_gcp_project() {
   # In headless mode, use environment variable
   if [[ "$HEADLESS_MODE" == "true" ]]; then
       if [[ -n "$PROJECT_ID" ]]; then
           echo -e "${GREEN}Using GCP Project ID from environment: ${PROJECT_ID}${NC}"
           # Validate project exists
           if gcloud projects describe "$PROJECT_ID" &>/dev/null; then
               echo -e "${GREEN}✓ Project ID validated${NC}"
               return 0
           else
               echo -e "${RED}✗ Invalid project ID or no access: ${PROJECT_ID}${NC}"
               return 1
           fi
       else
           echo -e "${RED}✗ PROJECT_ID environment variable not set for headless mode${NC}"
           return 1
       fi
   fi
   
   echo ""
   echo -e "${YELLOW}Enter GCP Project Information:${NC}"
  
   # Show current project if set
   local current_project=$(gcloud config get-value project 2>/dev/null)
   if [[ -n "$current_project" ]]; then
       echo -e "Current project: ${BLUE}${current_project}${NC}"
       read -p "Use this project? (Y/N): " use_current
       use_current=$(echo "$use_current" | tr '[:lower:]' '[:upper:]')
       if [[ "$use_current" == "Y" ]]; then
           PROJECT_ID=$current_project
           return 0
       fi
   fi
  
   # Get project ID from user
   while [[ -z "$PROJECT_ID" ]]; do
       read -p "Enter GCP Project ID: " PROJECT_ID
      
       # Validate project exists
       if gcloud projects describe "$PROJECT_ID" &>/dev/null; then
           echo -e "${GREEN}✓ Project ID validated${NC}"
           return 0
       else
           echo -e "${RED}✗ Invalid project ID or no access${NC}"
           PROJECT_ID=""
       fi
   done
}


#######################################
# Function: Get Azure resource group
# Globals: RESOURCE_GROUP
# Arguments: None
# Outputs: Resource group prompt
# Returns: 0 if valid, 1 if invalid
#######################################
function get_azure_resource_group() {
   # In headless mode, use environment variable
   if [[ "$HEADLESS_MODE" == "true" ]]; then
       if [[ -n "$RESOURCE_GROUP" ]]; then
           echo -e "${GREEN}Using Azure Resource Group from environment: ${RESOURCE_GROUP}${NC}"
           # Validate resource group exists
           if az group show --name "$RESOURCE_GROUP" &>/dev/null; then
               echo -e "${GREEN}✓ Resource group validated${NC}"
               return 0
           else
               echo -e "${RED}✗ Invalid resource group or no access: ${RESOURCE_GROUP}${NC}"
               return 1
           fi
       else
           echo -e "${RED}✗ RESOURCE_GROUP environment variable not set for headless mode${NC}"
           return 1
       fi
   fi
   
   echo ""
   echo -e "${YELLOW}Enter Azure Resource Group Information:${NC}"
  
   # List available resource groups
   echo -e "${BLUE}Available Resource Groups:${NC}"
   az group list --query "[].name" -o tsv 2>/dev/null | head -10
   echo ""
  
   while [[ -z "$RESOURCE_GROUP" ]]; do
       read -p "Enter Resource Group Name: " RESOURCE_GROUP
      
       # Validate resource group exists
       if az group show --name "$RESOURCE_GROUP" &>/dev/null; then
           echo -e "${GREEN}✓ Resource group validated${NC}"
           return 0
       else
           echo -e "${RED}✗ Invalid resource group or no access${NC}"
           RESOURCE_GROUP=""
       fi
   done
}


#######################################
# Function: Show loading animation
# Globals: None
# Arguments: Process PID
# Outputs: Loading animation
# Returns: None
#######################################
function show_loading() {
   local pid=$1
   local delay=0.1
   local spinstr='|/-\'
  
   echo -n " "
   while ps -p $pid > /dev/null 2>&1; do
       local temp=${spinstr#?}
       printf " [%c]  " "$spinstr"
       local spinstr=$temp${spinstr%"$temp"}
       sleep $delay
       printf "\b\b\b\b\b\b"
   done
   printf "    \b\b\b\b"
}


#######################################
# Function: Export GCP resources
# Globals: PROJECT_ID, EXPORT_SUCCESS
# Arguments: None
# Outputs: Export status
# Returns: 0 if successful, 1 if failed
#######################################
function export_gcp_resources() {
   echo ""
   echo -e "${YELLOW}Starting GCP Terraform export...${NC}"
  
   # Check if Cloud Asset API is enabled
   echo "Checking Cloud Asset API status..."
   if ! gcloud services list --enabled --project="$PROJECT_ID" 2>/dev/null | grep -q "cloudasset.googleapis.com"; then
       echo -e "${YELLOW}Enabling Cloud Asset API...${NC}"
       gcloud services enable cloudasset.googleapis.com --project="$PROJECT_ID"
       sleep 5
   fi
  
   # Create export directory
   local export_dir="gcp_export_$(date +%Y%m%d_%H%M%S)"
   mkdir -p "$export_dir"
  
   # Run export command
   echo "Exporting GCP resources to Terraform format..."
   echo "Output file: ${export_dir}/gcp_resources.tf"
  
   # Run export in background and show loading
   (gcloud beta resource-config bulk-export \
       --resource-format=terraform \
       --project="$PROJECT_ID" \
       >> "${export_dir}/gcp_resources.tf" 2>&1) &
  
   local export_pid=$!
   show_loading $export_pid
   wait $export_pid
   local export_status=$?
  
   if [[ $export_status -eq 0 ]] && [[ -s "${export_dir}/gcp_resources.tf" ]]; then
       echo -e "${GREEN}✓ Export completed successfully!${NC}"
       echo -e "Exported to: ${BLUE}${export_dir}/gcp_resources.tf${NC}"
      
       # Create .txt duplicate
       echo -e "${YELLOW}Creating .txt duplicate for Vertex AI...${NC}"
       cp "${export_dir}/gcp_resources.tf" "${export_dir}/gcp_resources.txt"
       echo -e "${GREEN}✓ Created: ${export_dir}/gcp_resources.txt${NC}"
      
       EXPORT_SUCCESS=true
      
       # Show file statistics
       local line_count=$(wc -l < "${export_dir}/gcp_resources.tf")
       local file_size=$(du -h "${export_dir}/gcp_resources.tf" | cut -f1)
       echo -e "File size: ${file_size}, Lines: ${line_count}"
      
       # Save metadata
       echo "Export completed at: $(date)" > "${export_dir}/export_metadata.txt"
       echo "Project ID: $PROJECT_ID" >> "${export_dir}/export_metadata.txt"
       echo "TXT file location: $(pwd)/${export_dir}/gcp_resources.txt" >> "${export_dir}/export_metadata.txt"
      
       # Store export directory for later use
       LAST_EXPORT_DIR="$(pwd)/${export_dir}"
       LAST_EXPORT_FILE="gcp_resources.txt"
      
       return 0
   else
       echo -e "${RED}✗ Export failed!${NC}"
       echo "Please check error messages above."
       EXPORT_SUCCESS=false
       return 1
   fi
}


#######################################
# Function: Export Azure resources
# Globals: RESOURCE_GROUP, EXPORT_SUCCESS
# Arguments: None
# Outputs: Export status
# Returns: 0 if successful, 1 if failed
#######################################
function export_azure_resources() {
   echo ""
   echo -e "${YELLOW}Starting Azure Terraform export...${NC}"
  
   # Check if aztfexport is installed
   if ! command -v aztfexport &> /dev/null; then
       echo -e "${RED}aztfexport is not installed!${NC}"
       echo "Please install aztfexport first:"
       echo "  - macOS: brew install aztfexport"
       echo "  - Linux: See https://github.com/Azure/aztfexport"
       echo "  - Windows: Download from releases page"
       return 1
   fi
  
   # Create export directory
   local export_dir="azure_export_$(date +%Y%m%d_%H%M%S)"
   mkdir -p "$export_dir"
   cd "$export_dir" || return 1
  
   # Run export command
   echo "Exporting Azure resources to Terraform format..."
   echo "Resource Group: $RESOURCE_GROUP"
  
   # Run aztfexport with non-interactive mode
   echo "Running aztfexport (this may take several minutes)..."
  
   if aztfexport resource-group --non-interactive "$RESOURCE_GROUP" 2>&1 | tee export.log; then
       echo -e "${GREEN}✓ Export completed successfully!${NC}"
       EXPORT_SUCCESS=true
      
       # Check for generated files and create .txt duplicate
       if [[ -f "main.tf" ]]; then
           echo -e "${YELLOW}Creating .txt duplicate for Vertex AI...${NC}"
           cp "main.tf" "azure_resources.txt"
           echo -e "${GREEN}✓ Created: azure_resources.txt${NC}"
          
           echo -e "Files exported to: ${BLUE}$(pwd)${NC}"
          
           # Show file statistics
           local line_count=$(wc -l < "main.tf")
           local file_size=$(du -h "main.tf" | cut -f1)
           echo -e "main.tf - Size: ${file_size}, Lines: ${line_count}"
          
           # Save metadata
           echo "Export completed at: $(date)" > "export_metadata.txt"
           echo "Resource Group: $RESOURCE_GROUP" >> "export_metadata.txt"
           echo "Subscription: $(az account show --query id -o tsv)" >> "export_metadata.txt"
           echo "TXT file location: $(pwd)/azure_resources.txt" >> "export_metadata.txt"
          
           # Store export directory for later use
           LAST_EXPORT_DIR="$(pwd)"
           LAST_EXPORT_FILE="azure_resources.txt"
       fi
      
       cd ..
       return 0
   else
       echo -e "${RED}✗ Export failed!${NC}"
       echo "Check export.log for details."
       EXPORT_SUCCESS=false
       cd ..
       return 1
   fi
}




#######################################
# Function: Launch Prowler Scan Only (without consolidation)
# Globals: None
# Arguments: Project ID
# Outputs: Prowler scan results
# Returns: 0 if successful, 1 if failed
#######################################
function launch_prowler_scan_only() {
    local project_id=$1
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Launching Prowler Security Scan${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    # Check if prowler is installed
    if ! command -v prowler &> /dev/null; then
        echo -e "${RED}✗ Prowler is not installed!${NC}"
        echo "Please install prowler first:"
        echo "  pip install prowler"
        echo "  Or visit: https://github.com/prowler-cloud/prowler"
        return 1
    fi
    
    echo -e "${YELLOW}Running Prowler scan for project: ${project_id}${NC}"
    echo "This may take several minutes..."
    echo ""
    
    # Create output filename with timestamp
    local prowler_output="prowler_scan_$(date +%Y%m%d_%H%M%S)"
    
    # Run prowler scan
    echo -e "${YELLOW}Executing: prowler gcp --project-ids ${project_id} --output-formats json-ocsf --output-filename ${prowler_output} --output-directory output${NC}"
    
    # Run prowler and capture exit code
    prowler gcp --project-ids "$project_id" --output-formats json-ocsf --output-filename "$prowler_output" --output-directory output
    local prowler_exit_code=$?
    
    # Prowler exit codes: 0 = success, 3 = success but found issues, others = failure
    if [[ $prowler_exit_code -eq 0 ]] || [[ $prowler_exit_code -eq 3 ]]; then
        echo -e "${GREEN}✓ Prowler scan completed successfully!${NC}"
        echo -e "Raw output saved to: ${BLUE}${prowler_output}${NC}"
        echo ""
        
        # Clean the JSON output
        if clean_prowler_json "output/$prowler_output.ocsf.json"; then
            echo -e "${GREEN}✓ Prowler JSON cleaned successfully${NC}"
            return 0
        else
            echo -e "${RED}✗ Failed to clean Prowler JSON output${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Prowler scan failed!${NC}"
        return 1
    fi
}

#######################################
# Function: Launch Prowler Scan
# Globals: None
# Arguments: Project ID
# Outputs: Prowler scan results
# Returns: 0 if successful, 1 if failed
#######################################
function launch_prowler_scan() {
    local project_id=$1
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Launching Prowler Security Scan${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    # Check if prowler is installed
    if ! command -v prowler &> /dev/null; then
        echo -e "${RED}✗ Prowler is not installed!${NC}"
        echo "Please install prowler first:"
        echo "  pip install prowler"
        echo "  Or visit: https://github.com/prowler-cloud/prowler"
        return 1
    fi
    
    echo -e "${YELLOW}Running Prowler scan for project: ${project_id}${NC}"
    echo "This may take several minutes..."
    echo ""
    
    # Create output filename with timestamp
    local prowler_output="prowler_scan_$(date +%Y%m%d_%H%M%S)"
    
    # Run prowler scan
    echo -e "${YELLOW}Executing: prowler gcp --project-ids ${project_id} --output-formats json-ocsf --output-filename ${prowler_output} --output-directory output${NC}"
    
    prowler gcp --project-ids "$project_id" --output-formats json-ocsf --output-filename "$prowler_output" --output-directory output
    echo -e "${GREEN}✓ Prowler scan completed successfully!${NC}"
    echo -e "Raw output saved to: ${BLUE}${prowler_output}${NC}"
    echo ""
        
            # Clean the JSON output
        clean_prowler_json "output/$prowler_output.ocsf.json"
        
        # Launch consolidation analysis if both files are available
        if [[ -n "$GEMINI_ANALYSIS_FILE" ]] && [[ -n "$PROWLER_CLEANED_FILE" ]]; then
            echo ""
            launch_consolidation_analysis
        else
            echo -e "${YELLOW}⚠ Skipping consolidation - missing file paths${NC}"
            echo "Gemini file: ${GEMINI_ANALYSIS_FILE:-'Not found'}"
            echo "Prowler file: ${PROWLER_CLEANED_FILE:-'Not found'}"
        fi
        
        return 0
   
}

#######################################
# Function: Clean Prowler JSON Output
# Globals: None
# Arguments: Input JSON file path
# Outputs: Cleaned JSON file
# Returns: 0 if successful, 1 if failed
#######################################
function clean_prowler_json() {
    local input_file=$1
    
    echo -e "${YELLOW}Cleaning Prowler JSON output...${NC}"
    
    # Check if input file exists
    if [[ ! -f "$input_file" ]]; then
        echo -e "${RED}✗ Prowler output file not found: $input_file${NC}"
        return 1
    fi
    
    # Create temporary Python cleaner script
    local temp_cleaner="temp_prowler_cleaner_$$.py"
    
    # Write the cleaner script
    cat > "$temp_cleaner" << 'EOF'
#!/usr/bin/env python3
"""
Simple Prowler JSON Cleaner
Takes Prowler JSON input, filters failed findings, returns clean JSON output
"""

import json
import sys
import os
from pathlib import Path


def clean_prowler_json(input_file):
    """
    Process Prowler JSON and return only essential failed findings
    """
    # Load the JSON data
    with open(input_file, 'r') as f:
        content = f.read().strip()
        
        # Handle different JSON formats
        if content.startswith('['):
            data = json.loads(content)
        else:
            # Handle multiple JSON objects concatenated
            try:
                data = [json.loads(content)]
            except json.JSONDecodeError:
                # Split by '},{'  and reconstruct
                objects = []
                parts = content.split('},{')
                for i, part in enumerate(parts):
                    if i == 0:
                        part += '}'
                    elif i == len(parts) - 1:
                        part = '{' + part
                    else:
                        part = '{' + part + '}'
                    objects.append(json.loads(part))
                data = objects
    
    # Filter and clean findings
    cleaned_findings = []
    
    for finding in data:
        status = finding.get('status_code', '')
        severity = finding.get('severity', '')
        
        # Only include failed findings with Medium, High, or Critical severity
        if status == 'FAIL' and severity in ['Medium', 'High', 'Critical']:
            
            # Extract remediation info
            remediation = finding.get('remediation', {})
            
            clean_finding = {
                'status': status,
                'message': finding.get('message', ''),
                'severity': severity,
                'remediation': {
                    'description': remediation.get('desc', ''),
                    'references': remediation.get('references', [])
                },
                'risk_details': finding.get('risk_details', '')
            }
            
            cleaned_findings.append(clean_finding)
    
    return cleaned_findings


def main():
    if len(sys.argv) != 2:
        print("Usage: python clean_prowler.py <input_prowler.json>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    if not os.path.exists(input_file):
        print(f"Error: File {input_file} not found")
        sys.exit(1)
    
    # Process the file
    cleaned_data = clean_prowler_json(input_file)
    
    # Generate output filename
    input_path = Path(input_file)
    output_file = input_path.parent / f"{input_path.stem}_cleaned.json"
    
    # Write cleaned JSON
    with open(output_file, 'w') as f:
        json.dump(cleaned_data, f, indent=2)
    
    # Print output file path
    print(str(output_file.absolute()))


if __name__ == "__main__":
    main()
EOF
    
    # Run the cleaner script
    echo -e "${YELLOW}Processing Prowler JSON with cleaner script...${NC}"
    local cleaned_output
    cleaned_output=$(python3 "$temp_cleaner" "$input_file")
    local cleaner_exit_code=$?
    
    # Cleanup temp file
    rm -f "$temp_cleaner"
    
    if [[ $cleaner_exit_code -eq 0 ]]; then
        echo -e "${GREEN}✓ Prowler JSON cleaned successfully!${NC}"
        echo -e "Cleaned output saved to: ${BLUE}${cleaned_output}${NC}"
        
        # Copy the cleaned file to root directory for consolidation access
        local cleaned_filename=$(basename "$cleaned_output")
        cp "$cleaned_output" "./$cleaned_filename"
        echo -e "${YELLOW}Copied cleaned file to root directory for consolidation: ./${cleaned_filename}${NC}"
        
        # Save cleaned file path to global variable (use root directory copy)
        PROWLER_CLEANED_FILE="./$cleaned_filename"
        
        # Show statistics
        local original_size=$(du -h "$input_file" | cut -f1)
        local cleaned_size=$(du -h "$cleaned_output" | cut -f1)
        local findings_count=$(python3 -c "import json; print(len(json.load(open('$cleaned_output'))))" 2>/dev/null || echo "unknown")
        
        echo -e "Original file size: ${original_size}"
        echo -e "Cleaned file size: ${cleaned_size}"
        echo -e "Failed findings (Medium/High/Critical): ${findings_count}"
        
        return 0
    else
        echo -e "${RED}✗ Failed to clean Prowler JSON output${NC}"
        return 1
    fi
}

#######################################
# Function: Launch Consolidation Analysis
# Globals: GEMINI_ANALYSIS_FILE, PROWLER_CLEANED_FILE
# Arguments: None
# Outputs: Consolidated security assessment report
# Returns: 0 if successful, 1 if failed
#######################################
function launch_consolidation_analysis() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Launching Enhanced Security Consolidation${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    # Check if Python3 is available
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}✗ Python3 is not installed!${NC}"
        echo "Please install Python3 first"
        return 1
    fi
    
    # Check if consolidation script exists
    if [[ ! -f "security_consolidation_script.py" ]]; then
        echo -e "${RED}✗ Security consolidation script not found!${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}🔍 Auto-discovering analysis results...${NC}"
    echo ""
    
    # Use the comprehensive consolidation script with auto-discovery
    if [[ -d "llama_env" ]]; then
        echo -e "${BLUE}Activating LlamaIndex virtual environment...${NC}"
        source llama_env/bin/activate && python3 "security_consolidation_script.py" "$vertex_project_id" "." "$gemini_api_key"
    else
        echo -e "${BLUE}Running consolidation script...${NC}"
        python3 "security_consolidation_script.py" "$vertex_project_id" "." "$gemini_api_key"
    fi
    
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}✅ Security consolidation completed successfully!${NC}"
        
        # Find the generated final report
        FINAL_SECURITY_REPORT=$(ls -t final_security_report_*.md 2>/dev/null | head -1)
        if [[ -n "$FINAL_SECURITY_REPORT" ]]; then
            echo -e "${GREEN}📄 Final security report: $FINAL_SECURITY_REPORT${NC}"
            export FINAL_SECURITY_REPORT
        fi
        
        return 0
    else
        echo -e "${RED}❌ Security consolidation failed with exit code: $exit_code${NC}"
        return 1
    fi
}

#######################################
# Function: Launch Gemini Security Scanner
# Globals: LAST_EXPORT_DIR, LAST_EXPORT_FILE
# Arguments: None
# Outputs: Security scan launch
# Returns: None
#######################################
function launch_gemini_security_scanner() {
   echo ""
   echo -e "${GREEN}========================================${NC}"
   echo -e "${GREEN}Launching Modern Gemini Security Scanner${NC}"
   echo -e "${GREEN}========================================${NC}"
   echo ""
  
   # Get API key from environment (set by server from UI)
   local gemini_api_key="${GOOGLE_API_KEY:-}"
   if [[ -z "$gemini_api_key" ]]; then
       echo -e "${RED}✗ GOOGLE_API_KEY environment variable not set${NC}"
       echo -e "${YELLOW}Please set GOOGLE_API_KEY environment variable with your Gemini API key${NC}"
       return 1
   fi
   
   # Get project ID
   local vertex_project_id="${PROJECT_ID}"
   if [[ -z "$vertex_project_id" ]]; then
       echo -e "${RED}✗ Project ID is required${NC}"
       return 1
   fi
  
   echo -e "${GREEN}✓ Using Project: ${vertex_project_id}${NC}"
   echo -e "${GREEN}✓ Terraform Export: ${LAST_EXPORT_DIR}${NC}"
   echo ""
  
   # Check Python3 is installed
   if ! command -v python3 &> /dev/null; then
       echo -e "${RED}✗ Python3 is required but not installed${NC}"
       return 1
   fi
  
   # Check if the modern scanner exists
   if [[ ! -f "gemini_security_scanner.py" ]]; then
       echo -e "${RED}✗ Modern Gemini security scanner not found${NC}"
       echo -e "${YELLOW}Please ensure gemini_security_scanner.py is in the project directory${NC}"
       return 1
   fi
  
   # Launch the modern security scanner with virtual environment
   echo -e "${YELLOW}Starting Modern Gemini Security Scanner...${NC}"
   
   # Run with virtual environment if available
   if [[ -d "llama_env" ]]; then
       echo -e "${BLUE}Activating LlamaIndex virtual environment...${NC}"
       source llama_env/bin/activate && python3 "gemini_security_scanner.py" "$vertex_project_id" "$LAST_EXPORT_DIR" "$gemini_api_key"
   else
       echo -e "${YELLOW}⚠ Virtual environment not found, using system Python${NC}"
       python3 "gemini_security_scanner.py" "$vertex_project_id" "$LAST_EXPORT_DIR" "$gemini_api_key"
   fi
   local scanner_exit_code=$?

   if [[ $scanner_exit_code -eq 0 ]]; then
       echo -e "${GREEN}✓ Gemini Security scan completed successfully!${NC}"
       
       # Find and save the gemini analysis file path (check enhanced first)
       GEMINI_ANALYSIS_FILE=$(ls -t enhanced_security_analysis_*.txt 2>/dev/null | head -1)
       if [[ -z "$GEMINI_ANALYSIS_FILE" ]]; then
           GEMINI_ANALYSIS_FILE=$(ls -t security_analysis_*.txt 2>/dev/null | head -1)
       fi
       
       if [[ -n "$GEMINI_ANALYSIS_FILE" ]]; then
           echo -e "${GREEN}Gemini analysis saved to: ${GEMINI_ANALYSIS_FILE}${NC}"
           # Export the variable so it's available to other functions
           export GEMINI_ANALYSIS_FILE
       else
           echo -e "${YELLOW}⚠ Warning: Could not find Gemini analysis output file${NC}"
       fi
       echo ""
       
       # Launch Prowler scan after Gemini analysis (only if not already done)
       if [[ "$SKIP_PROWLER" != "true" ]]; then
           launch_prowler_scan "$PROJECT_ID"
       fi
       
       return 0
   else
       echo -e "${RED}✗ Gemini Security scan failed. Check error messages above.${NC}"
       return 1
   fi
}


#######################################
# Function: Post-export instructions (MODIFIED)
# Globals: CLOUD_PROVIDER, EXPORT_SUCCESS
# Arguments: None
# Outputs: Launch security scanner
# Returns: None
#######################################
function show_post_export_instructions() {
   if [[ "$EXPORT_SUCCESS" == true ]]; then
       echo ""
       echo -e "${GREEN}Export Completed Successfully!${NC}"
       echo -e "Exported to: ${BLUE}${LAST_EXPORT_DIR}/${LAST_EXPORT_FILE}${NC}"
      
       # Launch security scanner instead of showing upload instructions
       launch_gemini_security_scanner
   else
       echo ""
       echo -e "${RED}Export was not successful.${NC}"
       echo "Please review the errors and try again."
   fi
}


#######################################
# Function: Cleanup and exit
# Globals: None
# Arguments: Exit code
# Outputs: Goodbye message
# Returns: None
#######################################
function cleanup_and_exit() {
   local exit_code=${1:-0}
   echo ""
   echo -e "${BLUE}Thank you for using Cloud Security Assessment Tool!${NC}"
   echo -e "${BLUE}================================================${NC}"
   exit $exit_code
}


#######################################
# Function: Main execution flow
# Globals: All
# Arguments: None
# Outputs: Full program flow
# Returns: None
#######################################
function main() {
   # Display welcome
   display_welcome
  
   # Check authentication
   if ! check_authentication; then
       cleanup_and_exit 1
   fi
  
   # Select environment
   echo ""
   select_environment
  
   # Get provider-specific details and run export
   case $CLOUD_PROVIDER in
       "GCP")
           if get_gcp_project; then
               export_gcp_resources
           else
               echo -e "${RED}Failed to get valid GCP project.${NC}"
               cleanup_and_exit 1
           fi
           ;;
       "AZURE")
           if get_azure_resource_group; then
               export_azure_resources
           else
               echo -e "${RED}Failed to get valid Azure resource group.${NC}"
               cleanup_and_exit 1
           fi
           ;;
       *)
           echo -e "${RED}Invalid cloud provider selection.${NC}"
           cleanup_and_exit 1
           ;;
   esac
  
   # Show post-export instructions
   show_post_export_instructions
  
   # In headless mode, exit after completion
   if [[ "$HEADLESS_MODE" == "true" ]]; then
       cleanup_and_exit 0
   fi
   
   # Ask if user wants to run another export
   echo ""
   read -p "Would you like to export another environment? (Y/N): " another_export
   another_export=$(echo "$another_export" | tr '[:lower:]' '[:upper:]')
   if [[ "$another_export" == "Y" ]]; then
       main
   else
       cleanup_and_exit 0
   fi
}


# Trap to handle script interruption
trap 'echo -e "\n${RED}Script interrupted!${NC}"; cleanup_and_exit 130' INT TERM


# Check for required commands
function check_requirements() {
   local missing_tools=()
  
   # Check for gcloud
   if ! command -v gcloud &> /dev/null; then
       missing_tools+=("gcloud (Google Cloud SDK)")
   fi
  
   # Check for az
   if ! command -v az &> /dev/null; then
       missing_tools+=("az (Azure CLI)")
   fi
  
   # Check for jq (useful for JSON processing)
   if ! command -v jq &> /dev/null; then
       missing_tools+=("jq")
   fi
   
   # Check for gemini CLI (for consolidation analysis)
   if ! command -v gemini &> /dev/null; then
       missing_tools+=("gemini (Gemini CLI)")
   fi
   
   # Check for prowler (for security scanning)
   if ! command -v prowler &> /dev/null; then
       missing_tools+=("prowler")
   fi
  
   if [[ ${#missing_tools[@]} -gt 0 ]]; then
       echo -e "${YELLOW}Warning: The following tools are not installed:${NC}"
       for tool in "${missing_tools[@]}"; do
           echo "  - $tool"
       done
       echo ""
       echo "Some features may not work without these tools."
       
       # In headless mode, continue automatically if we have required tools for the provider
       if [[ "$HEADLESS_MODE" == "true" ]]; then
           echo -e "${GREEN}Continuing in headless mode...${NC}"
       else
           read -p "Continue anyway? (Y/N): " continue_anyway
           # Convert to uppercase in a portable way
           continue_anyway=$(echo "$continue_anyway" | tr '[:lower:]' '[:upper:]')
           if [[ "$continue_anyway" != "Y" ]]; then
               exit 1
           fi
       fi
   fi
}


# Function for headless export only (used by server)
function headless_export() {
   # Skip welcome screen in headless mode
   if ! check_authentication; then
       echo -e "${RED}Authentication failed${NC}"
       exit 1
   fi
   
   if ! select_environment; then
       echo -e "${RED}Environment selection failed${NC}"
       exit 1
   fi
   
   # Get provider-specific details and run export
   case $CLOUD_PROVIDER in
       "GCP")
           if get_gcp_project; then
               export_gcp_resources
           else
               echo -e "${RED}Failed to get valid GCP project.${NC}"
               exit 1
           fi
           ;;
       "AZURE")
           if get_azure_resource_group; then
               export_azure_resources
           else
               echo -e "${RED}Failed to get valid Azure resource group.${NC}"
               exit 1
           fi
           ;;
       *)
           echo -e "${RED}Invalid cloud provider selection.${NC}"
           exit 1
           ;;
   esac
   
   # Output results for server parsing
   if [[ "$EXPORT_SUCCESS" == true ]]; then
       echo "EXPORT_RESULT:SUCCESS:${LAST_EXPORT_DIR}:${LAST_EXPORT_FILE}"
   else
       echo "EXPORT_RESULT:FAILED:::"
   fi
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
   check_requirements
   
   # Run headless export if in headless mode
   if [[ "$HEADLESS_MODE" == "true" ]]; then
       headless_export
   else
       main
   fi
fi





