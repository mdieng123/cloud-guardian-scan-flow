import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Search, Shield, Zap, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api, CloudSecurityWebSocket } from '@/lib/api';

interface SecurityScannerProps {
  exportData: any;
  provider: 'GCP' | 'AZURE' | null;
  onComplete: (data: any) => void;
}

const SecurityScanner: React.FC<SecurityScannerProps> = ({ exportData, provider, onComplete }) => {
  // Debug: Log the exportData to see what we're getting
  console.log('SecurityScanner - exportData:', exportData);
  console.log('SecurityScanner - provider:', provider);
  const [scanStatus, setScanStatus] = useState<'idle' | 'running' | 'waiting_vertex_id' | 'complete' | 'error'>('idle');
  const [currentPhase, setCurrentPhase] = useState<'prowler' | 'gemini' | 'consolidation' | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanOutput, setScanOutput] = useState<string>('');
  const [scanResults, setScanResults] = useState<any>(null);
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const { toast } = useToast();
  const [ws] = useState(() => new CloudSecurityWebSocket());

  useEffect(() => {
    ws.connect();
    
    ws.on('scan_start', () => {
      setScanStatus('running');
      setScanProgress(0);
      setScanOutput('Starting security assessment...\n');
      setCurrentPhase('prowler');
    });
    
    ws.on('scan_phase', (data) => {
      setCurrentPhase(data.phase);
      setScanOutput(prev => prev + `\n--- Starting ${data.phase} phase ---\n`);
    });
    
    ws.on('scan_progress', (data) => {
      setScanOutput(prev => prev + data.data);
      // Update progress based on phase
      if (currentPhase === 'prowler') {
        setScanProgress(prev => Math.min(prev + Math.random() * 5, 33));
      } else if (currentPhase === 'gemini') {
        setScanProgress(prev => Math.min(prev + Math.random() * 5, 66));
      } else if (currentPhase === 'consolidation') {
        setScanProgress(prev => Math.min(prev + Math.random() * 5, 90));
      }
    });
    
    ws.on('scan_complete', (data) => {
      setScanProgress(100);
      setScanStatus(data.success ? 'complete' : 'error');
      setCurrentPhase(null);
      
      if (data.success) {
        // Parse real scan results from the output
        const realResults = {
          summary: {
            totalFindings: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            geminiFindings: 0,
            prowlerFindings: 0,
            overlappingFindings: 0
          },
          findings: [],
          executiveSummary: `Security assessment completed for your ${provider} infrastructure.`,
          exportData,
          rawOutput: data.output,
          outputFiles: data.scanResults?.outputFiles || {}
        };
        
        // Try to parse findings from the output
        const output = data.output || '';
        
        // Count findings by parsing output patterns
        const criticalMatches = output.match(/CRITICAL/gi) || [];
        const highMatches = output.match(/HIGH/gi) || [];
        const mediumMatches = output.match(/MEDIUM/gi) || [];
        const lowMatches = output.match(/LOW/gi) || [];
        
        realResults.summary.critical = criticalMatches.length;
        realResults.summary.high = highMatches.length;
        realResults.summary.medium = mediumMatches.length;
        realResults.summary.low = lowMatches.length;
        realResults.summary.totalFindings = realResults.summary.critical + 
                                           realResults.summary.high + 
                                           realResults.summary.medium + 
                                           realResults.summary.low;
        
        // Extract specific findings from output if available
        const findingMatches = output.match(/(?:CRITICAL|HIGH|MEDIUM|LOW)[^\n]+/gi) || [];
        realResults.findings = findingMatches.slice(0, 10).map((finding, index) => ({
          id: index + 1,
          severity: finding.match(/(CRITICAL|HIGH|MEDIUM|LOW)/i)?.[1]?.toUpperCase() || 'UNKNOWN',
          title: finding.replace(/(CRITICAL|HIGH|MEDIUM|LOW)/i, '').trim().slice(0, 50) + '...',
          description: finding,
          source: 'analysis',
          affectedResources: ['detected-resource'],
          remediation: 'See detailed analysis report for remediation steps.'
        }));
        
        setScanResults(realResults);
        toast({
          title: "Security Scan Complete",
          description: "Consolidated security report is ready for review.",
        });
      } else {
        toast({
          title: "Security Scan Failed",
          description: "The security scan encountered errors. Check the output for details.",
          variant: "destructive"
        });
      }
    });
    
    ws.on('vertex_project_prompt', (data) => {
      setScanStatus('waiting_vertex_id');
      setScanProgress(50); // Prowler complete, halfway done
      setCurrentPhase(null); // Clear current phase
      setScanOutput(prev => prev + '\n✅ Prowler scan completed successfully!\n' + data.message + '\n');
      
      toast({
        title: "Prowler Complete - Gemini API Required",
        description: "Prowler found security issues. Please enter your Gemini API key for AI analysis.",
      });
    });
    
    ws.on('scan_error', (data) => {
      setScanStatus('error');
      const errorText = data?.data || data || 'Unknown error';
      setScanOutput(prev => prev + 'ERROR: ' + errorText + '\n');
      
      toast({
        title: "Scan Error",
        description: "An error occurred during the security scan.",
        variant: "destructive"
      });
    });
    
    return () => ws.disconnect();
  }, [currentPhase, provider, exportData, toast]);

  const startSecurityScan = async () => {
    try {
      setScanStatus('running');
      setScanProgress(0);
      setScanOutput('');
      setCurrentPhase('gemini');

      // Use exportData.projectId, or show error if missing
      const projectIdToUse = exportData.projectId;
      
      if (!projectIdToUse && provider === 'GCP') {
        setScanStatus('error');
        toast({
          title: "Missing Project ID",
          description: "No project ID found in export data. Please re-run the export step.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('Starting scan with projectId:', projectIdToUse);
      
      await api.runSecurityScan({
        exportDir: exportData.exportPath,
        provider: provider!,
        projectId: projectIdToUse
      });
    } catch (error) {
      setScanStatus('error');
      toast({
        title: "Scan Failed to Start",
        description: "Failed to start security scan. Make sure the backend server is running.",
        variant: "destructive"
      });
    }
  };

  const handleComplete = () => {
    if (scanResults) {
      onComplete(scanResults);
    }
  };

  const continueWithGeminiAPI = async () => {
    if (!geminiApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter a valid Gemini API key.",
        variant: "destructive"
      });
      return;
    }

    try {
      setScanStatus('running');
      setCurrentPhase('gemini');
      setScanOutput(prev => prev + `\nContinuing with Gemini API...\n`);

      // Use exportData.projectId, or show error if missing
      const projectIdToUse = exportData.projectId;
      
      if (!projectIdToUse && provider === 'GCP') {
        setScanStatus('error');
        toast({
          title: "Missing Project ID",
          description: "No project ID found in export data. Please re-run the export step.",
          variant: "destructive"
        });
        return;
      }
      
      await api.continueScan({
        exportDir: exportData.exportPath,
        provider: provider!,
        projectId: projectIdToUse,
        geminiApiKey: geminiApiKey
      });
    } catch (error) {
      setScanStatus('error');
      toast({
        title: "Failed to Continue Scan",
        description: "Failed to continue with Gemini analysis. Make sure the backend server is running.",
        variant: "destructive"
      });
    }
  };

  const rerunSecurityScan = async () => {
    try {
      setScanStatus('running');
      setScanProgress(50); // Skip Prowler, go straight to Gemini
      setScanOutput('Re-running security scan with existing export data...\n');
      setCurrentPhase('gemini');
      setScanResults(null);

      // Use the stored Gemini API key if available, otherwise prompt for it
      if (geminiApiKey.trim()) {
        const projectIdToUse = exportData.projectId || (provider === 'GCP' ? 'inbound-entity-461511-j4' : undefined);
        
        await api.continueScan({
          exportDir: exportData.exportPath,
          provider: provider!,
          projectId: projectIdToUse,
          geminiApiKey: geminiApiKey
        });
      } else {
        // Need to get Gemini API key first
        setScanStatus('waiting_vertex_id');
        setScanOutput(prev => prev + '\nGemini API key required for AI analysis...\n');
      }
    } catch (error) {
      setScanStatus('error');
      toast({
        title: "Scan Failed to Start",
        description: "Failed to restart security scan. Make sure the backend server is running.",
        variant: "destructive"
      });
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

  const getPhaseDescription = () => {
    switch (currentPhase) {
      case 'prowler': return 'Running Prowler vulnerability scan...';
      case 'gemini': return 'Running Gemini AI security analysis...';
      case 'consolidation': return 'Consolidating findings...';
      default: return 'Preparing security assessment...';
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
            Analyzing resources from {provider} export
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Provider:</span>
              <span className="ml-2 font-medium">{provider}</span>
            </div>
            <div>
              <span className="text-gray-600">Export Path:</span>
              <span className="ml-2 font-medium">{exportData?.exportPath || 'N/A'}</span>
            </div>
            {exportData?.projectId && (
              <div>
                <span className="text-gray-600">Project ID:</span>
                <span className="ml-2 font-medium">{exportData.projectId}</span>
              </div>
            )}
            {exportData?.resourceGroup && (
              <div>
                <span className="text-gray-600">Resource Group:</span>
                <span className="ml-2 font-medium">{exportData.resourceGroup}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scan Control */}
      {scanStatus === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle>Ready to Scan</CardTitle>
            <CardDescription>
              This will run Prowler security scan first, then Gemini AI analysis, and consolidate the results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button onClick={startSecurityScan} className="w-full bg-blue-600 hover:bg-blue-700">
                <Search className="h-4 w-4 mr-2" />
                Start Full Security Assessment
              </Button>
              <Button 
                onClick={rerunSecurityScan} 
                variant="outline" 
                className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <Zap className="h-4 w-4 mr-2" />
                Run Security Analysis Only
              </Button>
              <p className="text-xs text-gray-500 text-center">
                "Security Analysis Only" skips Prowler and runs Gemini AI analysis on existing export data
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gemini API Key Input */}
      {scanStatus === 'waiting_vertex_id' && (
        <Card>
          <CardHeader>
            <CardTitle>Gemini API Key Required</CardTitle>
            <CardDescription>
              Prowler scan completed! Now we need your Gemini API key to run AI security analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="geminiApiKey">Gemini API Key</Label>
                <Input
                  id="geminiApiKey"
                  type="password"
                  placeholder="AIza..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Get your free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>
                </p>
              </div>
              <Button 
                onClick={continueWithGeminiAPI}
                disabled={!geminiApiKey.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                Continue with Gemini Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan Progress */}
      {scanStatus === 'running' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Security Scan in Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={scanProgress} className="w-full" />
              <div className="text-center">
                <p className="text-sm text-gray-600">{getPhaseDescription()}</p>
                <p className="text-xs text-gray-500 mt-1">{Math.round(scanProgress)}% complete</p>
              </div>
              
              {/* Phase indicators */}
              <div className="flex justify-center space-x-6">
                <div className={`flex items-center space-x-2 ${currentPhase === 'prowler' ? 'text-blue-600' : currentPhase && ['gemini', 'consolidation'].includes(currentPhase) ? 'text-green-600' : 'text-gray-400'}`}>
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">Prowler</span>
                </div>
                <div className={`flex items-center space-x-2 ${currentPhase === 'gemini' ? 'text-blue-600' : currentPhase === 'consolidation' ? 'text-green-600' : 'text-gray-400'}`}>
                  <Zap className="h-4 w-4" />
                  <span className="text-sm">Gemini AI</span>
                </div>
                <div className={`flex items-center space-x-2 ${currentPhase === 'consolidation' ? 'text-blue-600' : currentPhase === null ? 'text-green-600' : 'text-gray-400'}`}>
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Consolidation</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan Output */}
      {scanOutput && (
        <Card>
          <CardHeader>
            <CardTitle>Scan Output</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={scanOutput}
              readOnly
              className="h-40 font-mono text-sm bg-gray-50"
              placeholder="Scan output will appear here..."
            />
          </CardContent>
        </Card>
      )}

      {/* Scan Results Summary */}
      {scanStatus === 'complete' && scanResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Security Assessment Complete</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{scanResults.summary.critical}</div>
                  <div className="text-sm text-red-600">Critical</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{scanResults.summary.high}</div>
                  <div className="text-sm text-orange-600">High</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{scanResults.summary.medium}</div>
                  <div className="text-sm text-yellow-600">Medium</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{scanResults.summary.low}</div>
                  <div className="text-sm text-blue-600">Low</div>
                </div>
              </div>
              
              <div className="pt-4 border-t space-y-3">
                <Button onClick={handleComplete} className="w-full bg-blue-600 hover:bg-blue-700">
                  View Detailed Results
                </Button>
                <Button 
                  onClick={rerunSecurityScan} 
                  variant="outline" 
                  className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-run Security Scan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan Error */}
      {scanStatus === 'error' && (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Security scan failed. Please check the output above for error details and try again.
            </AlertDescription>
          </Alert>
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={rerunSecurityScan} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-run Security Scan
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SecurityScanner;
