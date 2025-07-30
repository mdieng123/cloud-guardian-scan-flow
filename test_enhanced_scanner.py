#!/usr/bin/env python3
"""
Test Enhanced Gemini Security Scanner
Demonstrates vulnerability detection capabilities on the gcpgoat main.tf file
"""

import re
from pathlib import Path
from enhanced_gemini_security_scanner import EnhancedGeminiSecurityScanner

def analyze_terraform_vulnerabilities(terraform_file: str):
    """Analyze Terraform file for known vulnerability patterns"""
    
    print("🔍 Enhanced Security Scanner - Vulnerability Detection Demo")
    print("=" * 60)
    
    # Initialize scanner to get security knowledge base
    scanner = EnhancedGeminiSecurityScanner("gcpgoat-demo", ".", "demo_key")
    
    # Read the Terraform file
    with open(terraform_file, 'r') as f:
        terraform_content = f.read()
    
    print(f"📄 Analyzing: {terraform_file}")
    print(f"📊 File size: {len(terraform_content):,} characters")
    print(f"📚 Security patterns: {len(scanner.security_knowledge)} vulnerability types")
    print()
    
    findings = []
    
    # Check each security pattern against the Terraform content
    for pattern_info in scanner.security_knowledge:
        pattern = pattern_info['pattern']
        category = pattern_info['category']
        severity = pattern_info['severity']
        vulnerability = pattern_info['vulnerability']
        
        # Use regex to find matches
        try:
            matches = re.findall(pattern, terraform_content, re.IGNORECASE | re.MULTILINE)
            if matches:
                # Find line numbers for context
                lines = terraform_content.split('\n')
                line_matches = []
                for i, line in enumerate(lines, 1):
                    if re.search(pattern, line, re.IGNORECASE):
                        line_matches.append((i, line.strip()))
                
                findings.append({
                    'category': category,
                    'severity': severity,
                    'vulnerability': vulnerability,
                    'pattern': pattern,
                    'matches': matches,
                    'line_matches': line_matches,
                    'remediation': pattern_info['remediation']
                })
        except re.error:
            # Handle complex regex patterns
            continue
    
    # Display findings by severity
    severity_order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
    
    for severity in severity_order:
        severity_findings = [f for f in findings if f['severity'] == severity]
        if severity_findings:
            print(f"\n🚨 {severity} VULNERABILITIES ({len(severity_findings)} found)")
            print("-" * 50)
            
            for i, finding in enumerate(severity_findings, 1):
                print(f"\n[{severity}-{i:02d}] {finding['category']}")
                print(f"Vulnerability: {finding['vulnerability']}")
                print(f"Pattern: {finding['pattern']}")
                
                if finding['line_matches']:
                    print("Evidence found at:")
                    for line_num, line_content in finding['line_matches'][:3]:  # Show first 3 matches
                        print(f"  Line {line_num}: {line_content}")
                    if len(finding['line_matches']) > 3:
                        print(f"  ... and {len(finding['line_matches'])-3} more occurrences")
                
                print(f"Remediation: {finding['remediation']}")
    
    # Summary statistics
    total_findings = len(findings)
    critical_count = len([f for f in findings if f['severity'] == 'CRITICAL'])
    high_count = len([f for f in findings if f['severity'] == 'HIGH'])
    
    print(f"\n📊 SECURITY ANALYSIS SUMMARY")
    print("=" * 40)
    print(f"Total Vulnerabilities: {total_findings}")
    print(f"Critical Issues: {critical_count}")
    print(f"High-Risk Issues: {high_count}")
    
    if critical_count > 0:
        print(f"\n🚨 IMMEDIATE ACTION REQUIRED: {critical_count} critical vulnerabilities detected!")
        print("This infrastructure configuration poses significant security risks.")
    
    return findings

def demonstrate_chromadb_advantages():
    """Explain the advantages of ChromaDB integration"""
    print("\n🧠 CHROMADB ENHANCED CAPABILITIES")
    print("=" * 45)
    print("The enhanced scanner with ChromaDB provides:")
    print("✅ Semantic similarity search - finds vulnerabilities by meaning, not just exact patterns")
    print("✅ Persistent security knowledge base - learns from previous analyses") 
    print("✅ Context-aware retrieval - understands relationships between configurations")
    print("✅ Advanced vector embeddings - captures nuanced security implications")
    print("✅ Metadata filtering - precisely targets specific resource types")
    print("✅ Continuous learning - knowledge base grows with new vulnerability patterns")
    
    print("\n🎯 DETECTION IMPROVEMENTS:")
    print("• Finds variations of vulnerable patterns (e.g., different ways to grant public access)")
    print("• Understands context (e.g., public access on storage vs compute resources)")
    print("• Correlates related vulnerabilities (e.g., public access + missing encryption)")
    print("• Provides similarity scoring for risk prioritization")

if __name__ == "__main__":
    terraform_file = "main.tf"
    
    if not Path(terraform_file).exists():
        print(f"❌ Error: {terraform_file} not found in current directory")
        exit(1)
    
    # Run vulnerability analysis
    findings = analyze_terraform_vulnerabilities(terraform_file)
    
    # Demonstrate ChromaDB advantages
    demonstrate_chromadb_advantages()
    
    print(f"\n🏁 Analysis complete! Found {len(findings)} security issues.")
    print("Run the full enhanced scanner with a valid Gemini API key for detailed remediation guidance.")