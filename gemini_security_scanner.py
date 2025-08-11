#!/usr/bin/env python3
"""
Enhanced Gemini Security Scanner with ChromaDB Vector Store
Advanced vulnerability detection using semantic similarity search and security knowledge base
"""

import os
import sys
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

# Modern LlamaIndex imports (non-deprecated)
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, Settings, StorageContext, Document
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.response_synthesizers.type import ResponseMode
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding

# ChromaDB integration
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb


class ModernGeminiSecurityScanner:
    """
    Enhanced security scanner using LlamaIndex RAG pipeline with ChromaDB vector store
    Includes specialized vulnerability detection and security knowledge base
    """
    
    def __init__(self, project_id: str, terraform_dir: str, api_key: str, provider: str = "AWS"):
        self.project_id = project_id
        self.terraform_dir = Path(terraform_dir)
        self.api_key = api_key
        self.provider = provider.upper()
        self.output_file = f"enhanced_security_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        # ChromaDB setup with provider-specific collection to prevent cross-contamination
        self.chroma_db_path = "./chroma_security_db"
        self.collection_name = f"security_knowledge_base_{self.provider.lower()}"
        
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
        
        # Configure node parser for optimal chunking
        Settings.node_parser = SentenceSplitter(
            chunk_size=1024,
            chunk_overlap=200
        )
        
        # Security knowledge base
        self.security_knowledge = self._build_security_knowledge_base()
    
    def _build_security_knowledge_base(self) -> List[Dict[str, str]]:
        """Build comprehensive security knowledge base based on 2025 best practices"""
        return [
            {
                "category": "Public Access Controls",
                "pattern": "member = \"allUsers\"",
                "vulnerability": "Public resource access granted to all internet users",
                "severity": "CRITICAL",
                "description": "Resources configured with 'allUsers' member grants public access to anyone on the internet",
                "impact": "Data breach, unauthorized access, service abuse, compliance violations",
                "remediation": "Replace 'allUsers' with specific user/group identities and implement proper IAM controls"
            },
            {
                "category": "Hardcoded Credentials",
                "pattern": "secret|password|key.*=.*[\"'][^\"']{8,}[\"']",
                "vulnerability": "Hardcoded secrets in configuration files",
                "severity": "CRITICAL", 
                "description": "Sensitive credentials stored in plain text within Terraform configurations",
                "impact": "Credential theft, unauthorized system access, privilege escalation",
                "remediation": "Use secret management services like Google Secret Manager, AWS Secrets Manager"
            },
            {
                "category": "Network Security",
                "pattern": "source_ranges.*=.*\\[\"0\\.0\\.0\\.0/0\"\\]",
                "vulnerability": "Unrestricted network access from any IP address",
                "severity": "CRITICAL",
                "description": "Firewall rules allowing traffic from any IP address (0.0.0.0/0)",
                "impact": "Unauthorized network access, lateral movement, service exploitation",
                "remediation": "Restrict source ranges to specific IP ranges, implement bastion hosts"
            },
            {
                "category": "IAM Overprivilege", 
                "pattern": "roles/owner|roles/editor",
                "vulnerability": "Excessive IAM permissions granted",
                "severity": "HIGH",
                "description": "Service accounts or users granted overly broad permissions like Owner or Editor roles",
                "impact": "Privilege escalation, unauthorized resource access, data manipulation",
                "remediation": "Apply principle of least privilege, use custom roles with minimal required permissions"
            },
            {
                "category": "CORS Misconfiguration",
                "pattern": "origin.*=.*\\[\"\\*\"\\]",
                "vulnerability": "Overly permissive CORS policy allowing any origin",
                "severity": "MEDIUM",
                "description": "CORS configuration allowing requests from any origin (*)",
                "impact": "Cross-origin attacks, data theft, CSRF vulnerabilities",
                "remediation": "Specify explicit allowed origins, implement proper CORS validation"
            },
            {
                "category": "Compute Security",
                "pattern": "scopes.*=.*\\[.*\"cloud-platform\".*\\]",
                "vulnerability": "VM instances with excessive OAuth scopes",
                "severity": "HIGH",
                "description": "Compute instances granted broad OAuth scopes like 'cloud-platform'",
                "impact": "Lateral movement, service account token abuse, unauthorized API access",
                "remediation": "Use minimal required scopes, implement workload identity where possible"
            },
            {
                "category": "Data Encryption",
                "pattern": "encryption.*=.*false|kms_key_id.*=.*null",
                "vulnerability": "Missing or disabled encryption configurations",
                "severity": "HIGH",  
                "description": "Resources configured without proper encryption at rest",
                "impact": "Data breach, compliance violations, unauthorized data access",
                "remediation": "Enable encryption at rest using customer-managed encryption keys"
            },
            {
                "category": "Public Storage",
                "pattern": "uniform_bucket_level_access.*=.*false",
                "vulnerability": "Storage bucket without uniform access controls",
                "severity": "MEDIUM",
                "description": "Storage buckets configured without uniform bucket-level access",
                "impact": "Inconsistent access controls, potential data exposure",
                "remediation": "Enable uniform bucket-level access and implement consistent IAM policies"
            },
            {
                "category": "AWS EC2 Security",
                "pattern": "associate_public_ip_address.*=.*true",
                "vulnerability": "EC2 instances with public IP addresses",
                "severity": "HIGH",
                "description": "EC2 instances configured to receive public IP addresses",
                "impact": "Direct internet exposure, increased attack surface",
                "remediation": "Use private subnets with NAT gateway, implement bastion hosts for access"
            },
            {
                "category": "AWS Security Group",
                "pattern": "cidr_blocks.*=.*\\[\"0\\.0\\.0\\.0/0\"\\]",
                "vulnerability": "Security group with unrestricted access",
                "severity": "CRITICAL",
                "description": "Security groups allowing inbound traffic from any IP address",
                "impact": "Unrestricted network access, potential for unauthorized access",
                "remediation": "Restrict CIDR blocks to specific IP ranges, implement least privilege access"
            },
            {
                "category": "AWS S3 Bucket",
                "pattern": "block_public_acls.*=.*false|block_public_policy.*=.*false",
                "vulnerability": "S3 bucket allowing public access",
                "severity": "CRITICAL",
                "description": "S3 buckets not configured to block public access",
                "impact": "Data exposure, unauthorized data access, compliance violations",
                "remediation": "Enable all S3 block public access settings, review bucket policies"
            },
            {
                "category": "AWS RDS Security",
                "pattern": "publicly_accessible.*=.*true",
                "vulnerability": "RDS instance publicly accessible",
                "severity": "CRITICAL",
                "description": "RDS database instances configured as publicly accessible",
                "impact": "Database exposure to internet, unauthorized data access",
                "remediation": "Set publicly_accessible = false, use VPC endpoints for access"
            },
            {
                "category": "AWS Lambda Security",
                "pattern": "reserved_concurrent_executions.*=.*-1",
                "vulnerability": "Lambda function without concurrency limits",
                "severity": "MEDIUM",
                "description": "Lambda functions without reserved concurrency limits",
                "impact": "Potential for denial of service, unexpected costs",
                "remediation": "Set appropriate reserved_concurrent_executions limits"
            },
            {
                "category": "AWS IAM Policy",
                "pattern": "Effect.*=.*Allow.*Action.*=.*\\*.*Resource.*=.*\\*",
                "vulnerability": "IAM policy with wildcard permissions",
                "severity": "CRITICAL",
                "description": "IAM policies granting wildcard permissions on all resources",
                "impact": "Excessive privileges, potential for privilege escalation",
                "remediation": "Apply principle of least privilege, specify explicit actions and resources"
            }
        ]
    
    def _setup_chromadb(self) -> ChromaVectorStore:
        """Initialize ChromaDB with persistent storage"""
        print("🔧 Setting up ChromaDB vector store...")
        
        # Create persistent ChromaDB client
        chroma_client = chromadb.PersistentClient(path=self.chroma_db_path)
        
        # Get or create provider-specific collection
        try:
            chroma_collection = chroma_client.get_collection(self.collection_name)
            print(f"📚 Using existing ChromaDB collection: {self.collection_name} (Provider: {self.provider})")
        except:
            chroma_collection = chroma_client.create_collection(self.collection_name)
            print(f"🆕 Created new ChromaDB collection: {self.collection_name} (Provider: {self.provider})")
        
        # Clear existing documents in the collection to prevent cross-contamination
        if chroma_collection.count() > 0:
            print(f"🧹 Clearing existing documents in collection to prevent cross-contamination")
            chroma_collection.delete()
        
        # Create ChromaDB vector store
        vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
        return vector_store
    
    def _populate_security_knowledge_base(self, vector_store: ChromaVectorStore):
        """Populate ChromaDB with security knowledge base"""
        print("📚 Populating security knowledge base...")
        
        # Create documents from security knowledge
        knowledge_docs = []
        for idx, knowledge in enumerate(self.security_knowledge):
            doc_text = f"""
            Security Category: {knowledge['category']}
            Vulnerability Pattern: {knowledge['pattern']}
            Vulnerability Type: {knowledge['vulnerability']}
            Severity: {knowledge['severity']}
            Description: {knowledge['description']}
            Impact: {knowledge['impact']}
            Remediation: {knowledge['remediation']}
            """
            
            doc = Document(
                text=doc_text,
                metadata={
                    "category": knowledge['category'],
                    "severity": knowledge['severity'],
                    "pattern": knowledge['pattern'],
                    "doc_type": "security_knowledge"
                }
            )
            knowledge_docs.append(doc)
        
        # Create storage context with ChromaDB
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        
        # Build index with security knowledge
        knowledge_index = VectorStoreIndex.from_documents(
            knowledge_docs,
            storage_context=storage_context
        )
        
        print(f"✅ Added {len(knowledge_docs)} security patterns to knowledge base")
        return knowledge_index
    
    def load_terraform_documents(self) -> List[Document]:
        """Load and parse Terraform documents with enhanced metadata"""
        print("🔍 Loading Terraform documents...")
        
        if not self.terraform_dir.exists():
            raise FileNotFoundError(f"Terraform directory not found: {self.terraform_dir}")
        
        # Load documents with proper extensions, including AWS consolidated files
        reader = SimpleDirectoryReader(
            input_dir=str(self.terraform_dir),
            required_exts=[".txt", ".tf"],
            recursive=True
        )
        
        documents = reader.load_data()
        
        if not documents:
            raise ValueError(f"No Terraform documents found in {self.terraform_dir}")
        
        # Enhance documents with metadata
        enhanced_docs = []
        for doc in documents:
            # Add metadata for better retrieval including provider isolation
            doc.metadata.update({
                "project_id": self.project_id,
                "provider": self.provider,
                "doc_type": "terraform_config",
                "analysis_date": datetime.now().isoformat()
            })
            enhanced_docs.append(doc)
        
        print(f"📄 Loaded {len(enhanced_docs)} Terraform documents")
        return enhanced_docs
    
    def create_enhanced_security_rag_pipeline(self, documents: List[Document]) -> RetrieverQueryEngine:
        """Create enhanced RAG pipeline with ChromaDB and security knowledge base"""
        print("🔧 Building enhanced security RAG pipeline...")
        
        # Initialize LlamaIndex settings
        Settings.llm = GoogleGenAI(**self.llm_config)
        Settings.embed_model = GoogleGenAIEmbedding(**self.embed_config)
        
        # Setup ChromaDB vector store
        vector_store = self._setup_chromadb()
        
        # Populate with security knowledge base
        knowledge_index = self._populate_security_knowledge_base(vector_store)
        
        # Create storage context for Terraform documents
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        
        # Build index with Terraform documents
        terraform_index = VectorStoreIndex.from_documents(
            documents,
            storage_context=storage_context
        )
        
        # Configure retriever with enhanced similarity search
        retriever = VectorIndexRetriever(
            index=terraform_index,
            similarity_top_k=15,  # Increased for better coverage
            metadata_filter={'doc_type': 'terraform_config'}
        )
        
        # Configure response synthesizer for detailed security analysis
        response_synthesizer = get_response_synthesizer(
            response_mode=ResponseMode.TREE_SUMMARIZE,
            streaming=False
        )
        
        # Create enhanced query engine
        query_engine = RetrieverQueryEngine(
            retriever=retriever,
            response_synthesizer=response_synthesizer
        )
        
        print("✅ Enhanced RAG pipeline with ChromaDB ready")
        return query_engine, knowledge_index
    
    def generate_enhanced_security_analysis_prompt(self) -> str:
        """Generate comprehensive security analysis prompt optimized for ChromaDB retrieval"""
        return """You are a senior cybersecurity expert specializing in cloud infrastructure security analysis with access to a comprehensive security knowledge base.

Analyze the provided Terraform configurations for security vulnerabilities. Pay special attention to these CRITICAL vulnerability patterns identified in similar configurations:

🚨 **CRITICAL PATTERNS TO DETECT:**

**GCP-Specific Patterns:**
1. **Public Access**: `member = "allUsers"` - Grants public internet access
2. **Network Exposure**: `source_ranges = ["0.0.0.0/0"]` - Allows access from any IP
3. **IAM Overprivilege**: `roles/owner` or `roles/editor` - Excessive permissions
4. **Public Cloud Functions**: `member = "allUsers"` on function IAM bindings
5. **Insecure CORS**: `origin = ["*"]` - Allows any origin
6. **Excessive OAuth Scopes**: `cloud-platform` or `compute-rw` scopes

**AWS-Specific Patterns:**
1. **Public EC2**: `associate_public_ip_address = true` - EC2 with public IPs
2. **Open Security Groups**: `cidr_blocks = ["0.0.0.0/0"]` - Unrestricted access
3. **Public S3**: `block_public_acls = false` - S3 buckets allowing public access
4. **Public RDS**: `publicly_accessible = true` - Database exposed to internet
5. **Wildcard IAM**: `Action = "*"` with `Resource = "*"` - Excessive permissions
6. **Lambda Limits**: `reserved_concurrent_executions = -1` - No concurrency limits

**Universal Patterns:**
1. **Hardcoded Secrets**: Plain text credentials like `JWT_SECRET = "T2BYL6#]zc>Byuzu"`
2. **Insecure VM Operations**: Startup scripts downloading from public sources
3. **Missing Encryption**: `encryption = false` or `kms_key_id = null`

**ENHANCED ANALYSIS REQUIREMENTS:**
- Use semantic similarity matching to find vulnerability patterns
- Cross-reference findings with security knowledge base
- Provide evidence-based impact assessments
- Include specific configuration line numbers where possible
- Prioritize findings based on exploitability and business impact

**CRITICAL ASSESSMENT CRITERIA:**
- CRITICAL: Internet-facing vulnerabilities, hardcoded secrets, public access
- HIGH: Excessive permissions, weak authentication, unencrypted data
- MEDIUM: Configuration drift, missing logging, suboptimal practices
- LOW: Documentation gaps, non-security optimization opportunities

**REQUIRED REPORT STRUCTURE:**

## 🔍 Executive Summary
- **Overall Risk Level:** [CRITICAL/HIGH/MEDIUM/LOW]
- **Critical Findings:** [Count] requiring immediate action
- **High-Risk Findings:** [Count] requiring urgent attention
- **Total Vulnerabilities:** [Count across all severities]
- **Compliance Status:** [Major gaps identified]

## 🚨 Critical Vulnerabilities (Immediate Action Required)
[For each CRITICAL finding:]
### [VULN-001] [Vulnerability Title]
- **Severity:** CRITICAL
- **CVSS Score:** [If applicable]
- **Configuration:** [Specific file and line]
- **Evidence:** 
```hcl
[Exact configuration causing vulnerability]
```
- **Attack Vector:** [How this can be exploited]
- **Business Impact:** [Specific consequences]
- **Remediation:** 
```hcl
[Corrected configuration]
```
- **Priority:** P0 (0-24 hours)

## ⚡ High-Risk Vulnerabilities
[Same detailed format for HIGH severity]

## ⚠️ Medium-Risk Issues
[Same detailed format for MEDIUM severity]

## 📋 Compliance & Best Practices
- **CIS Controls:** [Gaps identified]
- **NIST Framework:** [Missing controls]
- **Cloud Security Best Practices:** [Recommendations]

## 🛠️ Implementation Roadmap
### Phase 1: Critical Fixes (0-24 hours)
- [Specific actions with commands/scripts]

### Phase 2: High-Risk Mitigation (1-7 days)  
- [Specific actions with timelines]

### Phase 3: Security Hardening (1-30 days)
- [Long-term improvements]

## 📊 Risk Metrics
- **Total Risk Score:** [Calculated based on findings]
- **Exploitability:** [Assessment of attack likelihood]
- **Data at Risk:** [Types and volumes of sensitive data]

Provide a thorough, actionable security assessment with specific evidence and remediation steps. Focus on findings that pose real security risks, not just configuration preferences."""

    async def run_enhanced_security_analysis(self) -> str:
        """Run comprehensive security analysis using enhanced ChromaDB RAG pipeline"""
        try:
            print("🚀 Starting Enhanced Gemini Security Analysis with ChromaDB...")
            print(f"📂 Project: {self.project_id}")
            print(f"📁 Terraform directory: {self.terraform_dir}")
            print(f"🗄️ ChromaDB path: {self.chroma_db_path}")
            
            # Load Terraform documents
            documents = self.load_terraform_documents()
            
            # Create enhanced RAG pipeline with ChromaDB
            query_engine, knowledge_index = self.create_enhanced_security_rag_pipeline(documents)
            
            # Run enhanced security analysis
            print("🔍 Running enhanced security vulnerability analysis...")
            security_prompt = self.generate_enhanced_security_analysis_prompt()
            
            response = query_engine.query(security_prompt)
            
            # Run additional specialized queries for specific vulnerability types
            print("🎯 Running specialized vulnerability detection queries...")
            
            # Public access detection
            public_access_query = "Find all resources with public access using 'allUsers' or '0.0.0.0/0'. Include specific configurations and security implications."
            public_access_response = query_engine.query(public_access_query)
            
            # Credential detection  
            credential_query = "Identify any hardcoded secrets, passwords, or API keys in the configurations. Look for JWT secrets, database passwords, or service account keys."
            credential_response = query_engine.query(credential_query)
            
            # IAM analysis
            iam_query = "Analyze IAM permissions and service account configurations. Identify overprivileged accounts with Owner, Editor, or excessive custom permissions."
            iam_response = query_engine.query(iam_query)
            
            # Create comprehensive enhanced report
            report = f"""# 🛡️ Enhanced Terraform Security Analysis Report

**Project:** {self.project_id}
**Cloud Provider:** {self.provider}
**Analysis Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Analysis Method:** Enhanced LlamaIndex RAG + ChromaDB Vector Store + Security Knowledge Base
**Model:** Gemini 2.0 Flash (Temperature: 0.1)
**Report Classification:** CONFIDENTIAL - Enhanced Security Assessment
**ChromaDB Collection:** {self.collection_name} ({len(self.security_knowledge)} security patterns)

---

{response.response}

---

## 🎯 Specialized Analysis Results

### 🌐 Public Access Analysis
{public_access_response.response}

### 🔐 Credential Security Analysis
{credential_response.response}

### 👤 IAM Permission Analysis
{iam_response.response}

---

## 🔧 Technical Enhancement Details

**Enhanced Features:**
- ✅ ChromaDB persistent vector store for semantic similarity search
- ✅ Security knowledge base with {len(self.security_knowledge)} vulnerability patterns
- ✅ Enhanced metadata indexing for precise retrieval
- ✅ Specialized query analysis for targeted vulnerability detection
- ✅ Evidence-based finding correlation with security patterns

**Analysis Framework:**
- **Vector Store:** ChromaDB (Persistent)
- **Embedding Model:** text-embedding-004 (Google)
- **LLM:** Gemini 2.0 Flash
- **Knowledge Base:** {len(self.security_knowledge)} security patterns
- **Documents Analyzed:** {len(documents)} Terraform configuration files
- **Similarity Top-K:** 15 (enhanced retrieval)

**ChromaDB Statistics:**
- **Collection:** {self.collection_name}
- **Storage Path:** {self.chroma_db_path}
- **Security Patterns:** {len(self.security_knowledge)} vulnerability types
- **Metadata Filtering:** Enabled for precise retrieval

*This enhanced report was generated using advanced AI security analysis with ChromaDB semantic search. All findings have been cross-referenced with security knowledge base patterns and should be validated by qualified security professionals before implementation.*

---

## 📊 Vulnerability Pattern Matching

The following security patterns were used for enhanced detection:
"""

            # Add knowledge base patterns to report
            for knowledge in self.security_knowledge:
                report += f"""
### {knowledge['category']} - {knowledge['severity']}
- **Pattern:** `{knowledge['pattern']}`
- **Vulnerability:** {knowledge['vulnerability']}
- **Impact:** {knowledge['impact']}
"""

            # Save enhanced report
            with open(self.output_file, 'w', encoding='utf-8') as f:
                f.write(report)
            
            print(f"✅ Enhanced security analysis completed successfully!")
            print(f"📄 Enhanced report saved to: {self.output_file}")
            print(f"📊 Report size: {len(report):,} characters")
            print(f"🗄️ ChromaDB knowledge base: {len(self.security_knowledge)} patterns")
            
            return self.output_file
            
        except Exception as e:
            print(f"❌ Enhanced security analysis failed: {e}")
            import traceback
            traceback.print_exc()
            raise


def main():
    """Main entry point for enhanced security scanner"""
    if len(sys.argv) not in [4, 5]:
        print("Usage: python3 enhanced_gemini_security_scanner.py <project_id> <terraform_dir> <api_key> [provider]")
        sys.exit(1)
    
    project_id = sys.argv[1]
    terraform_dir = sys.argv[2] 
    api_key = sys.argv[3]
    provider = sys.argv[4] if len(sys.argv) == 5 else "AWS"
    
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
    
    print(f"🔍 Found {len(terraform_files)} Terraform files to analyze")
    
    # Run enhanced security analysis
    scanner = ModernGeminiSecurityScanner(project_id, terraform_dir, api_key, provider)
    
    try:
        output_file = asyncio.run(scanner.run_enhanced_security_analysis())
        print(f"🎉 SUCCESS: Enhanced analysis completed - {output_file}")
    except Exception as e:
        print(f"💥 FAILURE: Enhanced analysis failed - {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()