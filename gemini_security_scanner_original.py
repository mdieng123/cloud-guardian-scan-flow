#!/usr/bin/env python3
"""
Modern Gemini Security Scanner with LlamaIndex RAG Pipeline
Uses non-deprecated LlamaIndex APIs (2025) and API key from UI
"""

import os
import sys
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import List, Optional

# Modern LlamaIndex imports (non-deprecated)
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, Settings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.response_synthesizers.type import ResponseMode
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding


class ModernGeminiSecurityScanner:
    """
    Modern security scanner using LlamaIndex RAG pipeline with GoogleGenAI
    """
    
    def __init__(self, project_id: str, terraform_dir: str, api_key: str):
        self.project_id = project_id
        self.terraform_dir = Path(terraform_dir)
        self.api_key = api_key
        self.output_file = f"security_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        # Store configuration for later initialization
        self.llm_config = {
            "model": "gemini-2.0-flash",
            "api_key": self.api_key,
            "max_tokens": 32000,
            "temperature": 0.1
        }
        
        self.embed_config = {
            "model_name": "text-embedding-004",
            "api_key": self.api_key,
            "embed_batch_size": 10
        }
        
        # Configure node parser for better chunking
        Settings.node_parser = SentenceSplitter(
            chunk_size=1024,
            chunk_overlap=200
        )
    
    def load_terraform_documents(self) -> List:
        """Load and parse Terraform documents"""
        print("🔍 Loading Terraform documents...")
        
        if not self.terraform_dir.exists():
            raise FileNotFoundError(f"Terraform directory not found: {self.terraform_dir}")
        
        # Load documents with proper extensions
        reader = SimpleDirectoryReader(
            input_dir=str(self.terraform_dir),
            required_exts=[".txt", ".tf"],
            recursive=True
        )
        
        documents = reader.load_data()
        
        if not documents:
            raise ValueError(f"No Terraform documents found in {self.terraform_dir}")
        
        print(f"📄 Loaded {len(documents)} documents")
        return documents
    
    def create_security_rag_pipeline(self, documents: List) -> RetrieverQueryEngine:
        """Create modern RAG pipeline for security analysis"""
        print("🔧 Building RAG pipeline...")
        
        # Initialize LlamaIndex settings now (when actually needed)
        Settings.llm = GoogleGenAI(**self.llm_config)
        Settings.embed_model = GoogleGenAIEmbedding(**self.embed_config)
        
        # Create vector index
        index = VectorStoreIndex.from_documents(documents)
        
        # Configure retriever with similarity search
        retriever = VectorIndexRetriever(
            index=index,
            similarity_top_k=10
        )
        
        # Configure response synthesizer for security analysis
        response_synthesizer = get_response_synthesizer(
            response_mode=ResponseMode.TREE_SUMMARIZE,
            streaming=False
        )
        
        # Create query engine
        query_engine = RetrieverQueryEngine(
            retriever=retriever,
            response_synthesizer=response_synthesizer
        )
        
        print("✅ RAG pipeline ready")
        return query_engine
    
    def generate_security_analysis_prompt(self) -> str:
        """Generate comprehensive security analysis prompt"""
        return """You are a senior cybersecurity expert specializing in cloud infrastructure security analysis. 

Analyze the provided Terraform configurations for security vulnerabilities and provide a comprehensive security assessment report.

**CRITICAL INSTRUCTIONS:**
1. Focus on identifying ACTUAL security vulnerabilities, not just listing configurations
2. Provide specific severity ratings (CRITICAL, HIGH, MEDIUM, LOW)
3. Include configuration evidence for each finding
4. Provide actionable remediation steps with code examples

**ANALYSIS FOCUS AREAS:**
- Overly permissive firewall/security group rules (0.0.0.0/0 access)
- Missing encryption configurations (at-rest and in-transit)
- Inadequate IAM permissions and service account configurations
- Public resource exposure (storage buckets, databases)
- Weak access controls and authentication
- Missing logging and monitoring configurations
- Default/weak network security configurations
- Credential management issues

**REQUIRED REPORT STRUCTURE:**

## Executive Summary
- Overall security posture rating (CRITICAL/HIGH/MEDIUM/LOW)
- Total number of findings by severity
- Critical issues requiring immediate action
- Business impact assessment

## Critical Vulnerabilities (CRITICAL)
For each critical finding:
- **Vulnerability:** Brief title
- **Severity:** CRITICAL
- **Description:** Detailed explanation
- **Evidence:** Specific configuration snippets
- **Impact:** Potential business/security impact
- **Remediation:** Step-by-step fix with code

## High-Risk Issues (HIGH)
[Same format as critical]

## Medium-Risk Issues (MEDIUM)
[Same format as critical]

## Low-Risk Issues (LOW)
[Same format as critical]

## Compliance & Best Practices
- Industry standard compliance gaps
- Security best practice recommendations
- Long-term security improvements

## Implementation Roadmap
- Priority order for fixes (P0: 0-24hrs, P1: 1-7days, P2: 1-30days)
- Resource requirements
- Implementation timeline

Provide a thorough, professional security assessment suitable for executive review."""

    async def run_security_analysis(self) -> str:
        """Run comprehensive security analysis using RAG pipeline"""
        try:
            print("🚀 Starting Gemini security analysis...")
            print(f"📂 Project: {self.project_id}")
            print(f"📁 Terraform directory: {self.terraform_dir}")
            
            # Load documents
            documents = self.load_terraform_documents()
            
            # Create RAG pipeline
            query_engine = self.create_security_rag_pipeline(documents)
            
            # Generate security analysis
            print("🔍 Running security vulnerability analysis...")
            security_prompt = self.generate_security_analysis_prompt()
            
            response = query_engine.query(security_prompt)
            
            # Create comprehensive report
            report = f"""# Terraform Security Analysis Report

**Project:** {self.project_id}
**Analysis Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Analysis Method:** LlamaIndex RAG Pipeline + Gemini AI
**Model:** Gemini 2.0 Flash
**Report Classification:** CONFIDENTIAL - Security Assessment

---

{response.response}

---

## Technical Analysis Details

**Framework:** LlamaIndex RAG Pipeline (2025)
**Embedding Model:** text-embedding-004
**LLM:** Gemini 2.0 Flash
**Temperature:** 0.1 (focused analysis)
**Documents Analyzed:** {len(documents)} Terraform configuration files
**Vector Index:** Built with {len(documents)} document chunks

*This report was generated using advanced AI security analysis. All findings should be validated by qualified security professionals before implementation.*
"""
            
            # Save report
            with open(self.output_file, 'w', encoding='utf-8') as f:
                f.write(report)
            
            print(f"✅ Security analysis completed successfully!")
            print(f"📄 Report saved to: {self.output_file}")
            print(f"📊 Report size: {len(report):,} characters")
            
            return self.output_file
            
        except Exception as e:
            print(f"❌ Security analysis failed: {e}")
            import traceback
            traceback.print_exc()
            raise


def main():
    """Main entry point"""
    if len(sys.argv) != 4:
        print("Usage: python3 gemini_security_scanner.py <project_id> <terraform_dir> <api_key>")
        sys.exit(1)
    
    project_id = sys.argv[1]
    terraform_dir = sys.argv[2] 
    api_key = sys.argv[3]
    
    # Validate inputs
    if not project_id.strip():
        print("ERROR: Project ID cannot be empty")
        sys.exit(1)
    
    if not os.path.exists(terraform_dir):
        print(f"ERROR: Terraform directory not found: {terraform_dir}")
        sys.exit(1)
    
    if not api_key.strip():
        print("ERROR: API key cannot be empty")
        sys.exit(1)
    
    # Check for Terraform files
    terraform_files = list(Path(terraform_dir).glob("*.txt")) + list(Path(terraform_dir).glob("*.tf"))
    if not terraform_files:
        print(f"ERROR: No Terraform files (.txt or .tf) found in: {terraform_dir}")
        sys.exit(1)
    
    print(f"Found {len(terraform_files)} Terraform files to analyze")
    
    # Run security analysis
    scanner = ModernGeminiSecurityScanner(project_id, terraform_dir, api_key)
    
    try:
        output_file = asyncio.run(scanner.run_security_analysis())
        print(f"SUCCESS: Analysis completed - {output_file}")
    except Exception as e:
        print(f"FAILURE: Analysis failed - {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()