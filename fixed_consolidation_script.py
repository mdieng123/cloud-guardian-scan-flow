#!/usr/bin/env python3
"""
Simple LlamaIndex Consolidation - Direct File Reading (No RAG)
Reads Gemini analysis and Prowler findings directly and creates consolidation report
"""

import os
import sys
from datetime import datetime
from llama_index.llms.google_genai import GoogleGenAI

def main():
    if len(sys.argv) != 4:
        print("Usage: python3 script.py <gemini_file> <prowler_file> <output_file>")
        sys.exit(1)
    
    gemini_file = sys.argv[1]
    prowler_file = sys.argv[2]
    output_file = sys.argv[3]
    
    print("DEBUG: Starting simple consolidation analysis...")
    print(f"DEBUG: Gemini file: {gemini_file}")
    print(f"DEBUG: Prowler file: {prowler_file}")
    print(f"DEBUG: Output file: {output_file}")
    
    # Setup Gemini 2.5 Flash with reduced output tokens
    llm = GoogleGenAI(
        model="gemini-2.5-flash",
        max_tokens=8000,  # Reduced to avoid MAX_TOKENS error
        temperature=0.1
    )
    
    try:
        # Read both files directly
        print("DEBUG: Reading Gemini analysis file...")
        with open(gemini_file, 'r', encoding='utf-8') as f:
            gemini_content = f.read()
        
        print("DEBUG: Reading Prowler findings file...")
        with open(prowler_file, 'r', encoding='utf-8') as f:
            prowler_content = f.read()
        
        print(f"DEBUG: Gemini analysis length: {len(gemini_content)} characters")
        print(f"DEBUG: Prowler findings length: {len(prowler_content)} characters")
        
        # Create consolidation prompt with both contents
        consolidation_prompt = f"""
You are a senior cybersecurity consultant. Analyze the provided Gemini AI security analysis and Prowler vulnerability scan findings to create a concise executive-level security consolidation report.

GEMINI AI SECURITY ANALYSIS:
{gemini_content}

PROWLER VULNERABILITY FINDINGS:
{prowler_content}

Create a professional consolidation report with these sections:

## Executive Summary
- Overall security posture rating (CRITICAL/HIGH/MEDIUM/LOW)
- Total vulnerability count by severity
- Top 5 most critical issues requiring immediate attention
- Business impact assessment

## Critical Findings Correlation
- Issues confirmed by BOTH tools (highest confidence)
- Unique findings from each tool
- Priority vulnerabilities requiring immediate action

## Risk Prioritization
- CRITICAL (P0): Immediate remediation (0-24 hours)
- HIGH (P1): Priority remediation (1-7 days) 
- MEDIUM (P2): Planned remediation (1-30 days)
- LOW (P3): Strategic improvements (30+ days)

## Remediation Roadmap
- Step-by-step fixes for critical and high-risk issues
- Terraform code corrections where applicable
- Implementation timeline

Format as professional Markdown suitable for executive review. Keep concise but comprehensive.
"""
        
        print("DEBUG: Generating consolidation analysis...")
        
        # Generate the consolidation report
        response = llm.complete(consolidation_prompt)
        consolidation_report = response.text if hasattr(response, 'text') else str(response)
        
        print(f"DEBUG: Consolidation completed - response length: {len(consolidation_report)} characters")
        
        # Create final report with metadata
        final_report = f"""# Cloud Security Consolidation Analysis Report

**Project:** inbound-entity-461511-j4  
**Analysis Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  
**Analysis Method:** Direct File Analysis + LlamaIndex LLM  
**Report Classification:** CONFIDENTIAL - Internal Security Assessment  

---

{consolidation_report}

---

## Technical Analysis Details

**Analysis Framework:** Direct file reading with LlamaIndex LLM  
**Model:** Gemini 2.5 Flash  
**Temperature:** 0.1 (focused analysis)  
**Source Files:** Gemini AI security analysis + Prowler vulnerability scan  

*This report consolidates findings from automated security analysis tools and should be reviewed by qualified security professionals.*
"""
        
        # Write to output file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(final_report)
        
        print(f"✅ Consolidation analysis completed successfully!")
        print(f"📁 Report saved to: {output_file}")
        print(f"📊 Report size: {len(final_report):,} characters")
        
    except Exception as e:
        print(f"❌ ERROR: Consolidation analysis failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()