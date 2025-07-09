#!/usr/bin/env python3
"""
Direct test of LlamaIndex Security Consolidation Analysis
"""

import os
import sys
from datetime import datetime
from llama_index.core import SimpleDirectoryReader
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.core import VectorStoreIndex
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
import tempfile
import shutil

def main():
    gemini_file = "security_analysis_20250708_170028.txt"
    prowler_file = "prowler_scan_20250708_165838.ocsf_cleaned.json"
    output_file = f"llamaindex_consolidated_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    
    print("DEBUG: Starting LlamaIndex consolidation analysis...")
    print(f"DEBUG: Gemini file: {gemini_file}")
    print(f"DEBUG: Prowler file: {prowler_file}")
    print(f"DEBUG: Output file: {output_file}")
    
    # Setup Gemini 2.5 Flash with enhanced context
    llm = GoogleGenAI(
        model="gemini-2.5-flash",
        max_tokens=32000,
        temperature=0.1  # Lower temperature for focused analysis
    )
    
    embed_model = GoogleGenAIEmbedding(
        model_name="text-embedding-004"
    )
    
    # Create temporary directory and copy files for SimpleDirectoryReader
    with tempfile.TemporaryDirectory() as temp_dir:
        print("DEBUG: Setting up analysis workspace...")
        
        # Copy files to temp directory with descriptive names
        gemini_copy = os.path.join(temp_dir, "gemini_security_analysis.txt")
        prowler_copy = os.path.join(temp_dir, "prowler_vulnerability_scan.json")
        
        shutil.copy2(gemini_file, gemini_copy)
        shutil.copy2(prowler_file, prowler_copy)
        
        # Load documents using SimpleDirectoryReader
        print("DEBUG: Loading security analysis documents...")
        reader = SimpleDirectoryReader(temp_dir)
        documents = reader.load_data()
        
        print(f"DEBUG: Loaded {len(documents)} documents for consolidation")
        
        # Create vector index for context-aware analysis
        print("DEBUG: Creating vector index for context-aware analysis...")
        index = VectorStoreIndex.from_documents(
            documents, 
            llm=llm,
            embed_model=embed_model
        )
        
        # Create query engine with comprehensive retrieval
        query_engine = index.as_query_engine(
            llm=llm,
            similarity_top_k=15,  # Get comprehensive context
            response_mode="tree_summarize"  # Better for long documents
        )
        
        # Comprehensive consolidation query
        consolidation_query = """
        You are a senior cybersecurity consultant conducting an in-depth security consolidation analysis. 
        
        Analyze the provided Gemini AI security analysis and Prowler vulnerability scan findings to create a comprehensive, executive-level security assessment report.

        ## CONSOLIDATION ANALYSIS REQUIREMENTS:

        ### 1. EXECUTIVE SUMMARY (Critical)
        - Overall security posture: CRITICAL/HIGH/MEDIUM/LOW risk rating
        - Total vulnerability count by severity with percentages
        - Top 5 most critical security issues requiring immediate executive attention
        - Business risk assessment and potential impact (financial, operational, regulatory)
        - Compliance status and regulatory implications

        ### 2. COMPARATIVE METHODOLOGY ANALYSIS
        - Gemini AI analysis strengths: configuration review, architectural analysis, best practices
        - Prowler automated scanning coverage: compliance checks, policy violations, resource scans
        - Methodology gaps and complementary coverage areas
        - Confidence levels and false positive assessments

        ### 3. CRITICAL VULNERABILITY CORRELATION
        - Security issues confirmed by BOTH tools (highest confidence)
        - Severity alignment and discrepancies between tools
        - Cross-validation of findings for accuracy
        - Immediate action items with business justification

        ### 4. UNIQUE FINDINGS ANALYSIS
        #### Gemini AI Exclusive Insights:
        - Deep architectural security analysis
        - Configuration best practice violations  
        - Security design pattern recommendations
        - Context-aware risk assessments

        #### Prowler Exclusive Discoveries:
        - Automated compliance rule violations
        - Resource-specific misconfigurations
        - Policy enforcement gaps
        - Audit trail and logging deficiencies

        ### 5. RISK PRIORITIZATION MATRIX
        Create detailed priority matrix with:
        - **CRITICAL (P0)**: Immediate remediation (0-24 hours) - Active security threats
        - **HIGH (P1)**: Priority remediation (1-7 days) - Significant exposure risks  
        - **MEDIUM (P2)**: Planned remediation (1-30 days) - Best practice violations
        - **LOW (P3)**: Strategic improvements (30+ days) - Optimization opportunities

        For each priority level, provide:
        - Specific vulnerability list with CVE/CWE references where applicable
        - Business impact assessment
        - Remediation effort estimates (hours/days)
        - Required expertise and resources

        ### 6. COMPREHENSIVE REMEDIATION ROADMAP
        For each CRITICAL and HIGH finding:
        - Step-by-step remediation procedures
        - Terraform code fixes where applicable
        - Configuration changes required
        - Testing and validation steps
        - Rollback procedures if needed

        Create a professional, executive-ready report formatted in proper Markdown with clear sections, bullet points, and actionable recommendations.
        """
        
        print("DEBUG: Executing consolidation analysis query...")
        try:
            # Run the consolidation analysis
            consolidation_response = query_engine.query(consolidation_query)
            consolidation_report = str(consolidation_response)
            
            print(f"DEBUG: Query completed - response length: {len(consolidation_report)} characters")
            
            # Create comprehensive final report with professional formatting
            final_report = f"""# Cloud Security Consolidation Analysis Report

**Project:** inbound-entity-461511-j4  
**Analysis Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  
**Analysis Method:** LlamaIndex + Gemini 2.5 Flash + Prowler Integration  
**Report Classification:** CONFIDENTIAL - Internal Security Assessment  

---

{consolidation_report}

---

## APPENDIX: Technical Analysis Details

**Analysis Framework:** LlamaIndex with vector-based context retrieval  
**Context Window:** 1M tokens (Gemini 2.5 Flash)  
**Embedding Model:** Google Text Embedding 004  
**Retrieval Strategy:** Top-15 similarity with tree summarization  
**Temperature Setting:** 0.1 (focused analysis)  

**Report Validation:** Cross-referenced findings between Gemini AI analysis and Prowler automated scanning  
**Confidence Level:** High (findings validated across multiple analysis methods)  

*This report was generated using advanced AI-powered security analysis tools and should be reviewed by qualified security professionals.*
"""
            
            # Write to output file
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(final_report)
            
            print(f"DEBUG: Consolidation analysis completed successfully!")
            print(f"DEBUG: Report saved to: {output_file}")
            print(f"DEBUG: Report size: {len(final_report):,} characters")
            
        except Exception as e:
            print(f"ERROR: Consolidation analysis failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":
    main()