
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Shield, Zap, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityScannerProps {
  exportData: any;
  provider: 'GCP' | 'AZURE' | null;
  onComplete: (data: any) => void;
}

const SecurityScanner: React.FC<SecurityScannerProps> = ({ exportData, provider, onComplete }) => {
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [prowlerStatus, setProwlerStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [consolidationStatus, setConsolidationStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [geminiProgress, setGeminiProgress] = useState(0);
  const [prowlerProgress, setProwlerProgress] = useState(0);
  const [consolidationProgress, setConsolidationProgress] = useState(0);
  const [scanResults, setScanResults] = useState<any>(null);
  const { toast } = useToast();

  const simulateProgress = (setter: React.Dispatch<React.SetStateAction<number>>, duration: number) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      setter(progress);
    }, duration / 10);
    return interval;
  };

  const runGeminiScan = async () => {
    setGeminiStatus('running');
    const interval = simulateProgress(setGeminiProgress, 8000);
    
    setTimeout(() => {
      clearInterval(interval);
      setGeminiProgress(100);
      setGeminiStatus('complete');
      toast({
        title: "Gemini Analysis Complete",
        description: "AI-powered security analysis finished successfully.",
      });
    }, 8000);
  };

  const runProwlerScan = async () => {
    setProwlerStatus('running');
    const interval = simulateProgress(setProwlerProgress, 12000);
    
    setTimeout(() => {
      clearInterval(interval);
      setProwlerProgress(100);
      setProwlerStatus('complete');
      toast({
        title: "Prowler Scan Complete",
        description: "Security vulnerability scan finished successfully.",
      });
    }, 12000);
  };

  const runConsolidation = async () => {
    setConsolidationStatus('running');
    const interval = simulateProgress(setConsolidationProgress, 5000);
    
    setTimeout(() => {
      clearInterval(interval);
      setConsolidationProgress(100);
      setConsolidationStatus('complete');
      
      // Mock consolidated results
      const mockResults = {
        summary: {
          totalFindings: 23,
          critical: 3,
          high: 8,
          medium: 9,
          low: 3,
          geminiFindings: 15,
          prowlerFindings: 18,
          overlappingFindings: 10
        },
        findings: [
          {
            id: 1,
            severity: 'CRITICAL',
            title: 'Public Storage Bucket with Sensitive Data',
            description: 'Storage bucket is publicly accessible and contains potential sensitive information.',
            source: 'both',
            affectedResources: ['storage-bucket-prod-data'],
            remediation: 'Set bucket ACL to private and enable IAM-based access control.'
          },
          {
            id: 2,
            severity: 'HIGH',
            title: 'Database Instance Without Encryption',
            description: 'Database instance does not have encryption at rest enabled.',
            source: 'prowler',
            affectedResources: ['mysql-prod-db'],
            remediation: 'Enable encryption at rest for database instances.'
          },
          {
            id: 3,
            severity: 'HIGH',
            title: 'Overly Permissive IAM Policies',
            description: 'IAM policies grant excessive permissions beyond principle of least privilege.',
            source: 'gemini',
            affectedResources: ['service-account-app', 'role-developer'],
            remediation: 'Review and restrict IAM policies to minimum required permissions.'
          }
        ],
        executiveSummary: `Security assessment identified 23 total findings across your ${provider} infrastructure. 
        3 CRITICAL issues require immediate attention, particularly the publicly accessible storage bucket. 
        Recommend addressing all CRITICAL and HIGH severity findings within 7 days.`,
        exportData
      };

      setScanResults(mockResults);
      toast({
        title: "Security Assessment Complete",
        description: "Consolidated security report is ready for review.",
      });
    }, 5000);
  };

  const startFullScan = async () => {
    await runGeminiScan();
    setTimeout(async () => {
      await runProwlerScan();
      setTimeout(async () => {
        await runConsolidation();
      }, 1000);
    }, 1000);
  };

  const handleComplete = () => {
    if (scanResults) {
      onComplete(scanResults);
    }
  };

  const getScanStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <RefreshCw className="h-5 w-5 animate-spin" />;
      case 'complete': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Search className="h-5 w-5 text-gray-400" />;
    }
  };

  const getScanStatusBadge = (status: string) => {
    switch (status) {
      case 'running': return <Badge variant="secondary">Running...</Badge>;
      case 'complete': return <Badge className="bg-green-100 text-green-800">Complete</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Assessment</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Running comprehensive security scans using Gemini AI and Prowler to identify vulnerabilities.
        </p>
      </div>

      {/* Scan Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Scan Configuration</CardTitle>
          <CardDescription>
            Analyzing {exportData?.resources || 0} resources from {provider} export
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Provider:</span>
              <span className="ml-2 font-medium">{provider}</span>
            </div>
            <div>
              <span className="text-gray-600">Resources:</span>
              <span className="ml-2 font-medium">{exportData?.resources || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">Export Size:</span>
              <span className="ml-2 font-medium">{exportData?.fileSize || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Export Path:</span>
              <span className="ml-2 font-medium text-xs">{exportData?.exportPath || 'N/A'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scanning Progress */}
      <div className="space-y-4">
        {/* Gemini AI Scan */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getScanStatusIcon(geminiStatus)}
                <div>
                  <CardTitle className="text-lg">Gemini AI Security Analysis</CardTitle>
                  <CardDescription>AI-powered vulnerability detection and analysis</CardDescription>
                </div>
              </div>
              {getScanStatusBadge(geminiStatus)}
            </div>
          </CardHeader>
          {geminiStatus === 'running' && (
            <CardContent>
              <Progress value={geminiProgress} className="w-full" />
              <p className="text-sm text-gray-600 mt-2">
                Analyzing Terraform configurations with Gemini AI...
              </p>
            </CardContent>
          )}
        </Card>

        {/* Prowler Scan */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getScanStatusIcon(prowlerStatus)}
                <div>
                  <CardTitle className="text-lg">Prowler Security Scan</CardTitle>
                  <CardDescription>Industry-standard security assessment tool</CardDescription>
                </div>
              </div>
              {getScanStatusBadge(prowlerStatus)}
            </div>
          </CardHeader>
          {prowlerStatus === 'running' && (
            <CardContent>
              <Progress value={prowlerProgress} className="w-full" />
              <p className="text-sm text-gray-600 mt-2">
                Running Prowler security checks...
              </p>
            </CardContent>
          )}
        </Card>

        {/* Consolidation */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getScanStatusIcon(consolidationStatus)}
                <div>
                  <CardTitle className="text-lg">Report Consolidation</CardTitle>
                  <CardDescription>Merging and prioritizing security findings</CardDescription>
                </div>
              </div>
              {getScanStatusBadge(consolidationStatus)}
            </div>
          </CardHeader>
          {consolidationStatus === 'running' && (
            <CardContent>
              <Progress value={consolidationProgress} className="w-full" />
              <p className="text-sm text-gray-600 mt-2">
                Consolidating findings and generating report...
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        {geminiStatus === 'idle' && prowlerStatus === 'idle' && (
          <Button onClick={startFullScan} className="bg-blue-600 hover:bg-blue-700">
            <Zap className="h-4 w-4 mr-2" />
            Start Security Assessment
          </Button>
        )}
        
        {consolidationStatus === 'complete' && scanResults && (
          <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            View Security Report
          </Button>
        )}
      </div>

      {/* Quick Results Preview */}
      {consolidationStatus === 'complete' && scanResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Scan Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Assessment Complete:</strong> Found {scanResults.summary.totalFindings} total findings 
                ({scanResults.summary.critical} Critical, {scanResults.summary.high} High severity)
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-center">
              <div>
                <div className="text-2xl font-bold text-red-600">{scanResults.summary.critical}</div>
                <div className="text-sm text-gray-600">Critical</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{scanResults.summary.high}</div>
                <div className="text-sm text-gray-600">High</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{scanResults.summary.medium}</div>
                <div className="text-sm text-gray-600">Medium</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{scanResults.summary.low}</div>
                <div className="text-sm text-gray-600">Low</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SecurityScanner;
