import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Download, RefreshCw, CheckCircle, AlertCircle, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api, CloudSecurityWebSocket } from '@/lib/api';

// Helper function to extract project ID from export output
const extractProjectIdFromOutput = (output: string): string | undefined => {
  // Look for "Project ID: xxx" in the output
  const match = output.match(/Project ID:\s*([a-zA-Z0-9-]+)/);
  return match ? match[1] : undefined;
};
import type { CloudProvider } from '@/pages/Index';

interface ResourceExporterProps {
  provider: CloudProvider;
  onComplete: (data: any) => void;
}

const ResourceExporter: React.FC<ResourceExporterProps> = ({ provider, onComplete }) => {
  const { toast } = useToast();
  
  const [projectId, setProjectId] = useState('');
  const [resourceGroup, setResourceGroup] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [awsResources, setAwsResources] = useState('vpc,subnet,ec2_instance,security_group');
  const [vpcIds, setVpcIds] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [exportResults, setExportResults] = useState<any>(null);
  const [exportOutput, setExportOutput] = useState<string>('');
  const [latestExport, setLatestExport] = useState<any>(null);
  const [isCheckingLatest, setIsCheckingLatest] = useState(false);
  const [ws] = useState(() => new CloudSecurityWebSocket());

  // Check for latest export when component mounts
  useEffect(() => {
    const checkLatestExport = async () => {
      // AWS is now supported
      // if (provider === 'AWS') {
      //   setIsCheckingLatest(false);
      //   return;
      // }
      
      try {
        setIsCheckingLatest(true);
        const result = await api.checkLatestExport(provider);
        if (result.hasExport) {
          setLatestExport(result.export);
        }
      } catch (error) {
        console.error('Failed to check latest export:', error);
      } finally {
        setIsCheckingLatest(false);
      }
    };

    checkLatestExport();
  }, [provider]);

  useEffect(() => {
    ws.connect();
    
    ws.on('export_start', (data) => {
      setIsExporting(true);
      setExportStatus('running');
      setExportProgress(0);
      setExportOutput('Starting export for ' + (data?.provider || provider) + '...\n');
    });
    
    ws.on('export_progress', (data) => {
      const text = data?.data || data || '';
      setExportOutput(prev => prev + text);
      // Simulate progress based on output
      setExportProgress(prev => Math.min(prev + Math.random() * 10, 90));
    });
    
    ws.on('export_complete', (data) => {
      setExportProgress(100);
      setIsExporting(false);
      
      if (data.success) {
        setExportStatus('success');
        
        // Extract project ID from the actual export results, not just state
        const actualProjectId = provider === 'GCP' 
          ? (projectId || extractProjectIdFromOutput(data.output))
          : undefined;
        
        setExportResults({
          provider,
          projectId: actualProjectId,
          resourceGroup: provider === 'AZURE' ? resourceGroup : undefined,
          exportPath: data.exportDir,
          fileName: provider === 'GCP' ? 'gcp_resources.txt' : 
                   provider === 'AZURE' ? 'azure_resources.txt' : 
                   'generated/aws_consolidated.txt',
          fileSize: 'Unknown',
          lineCount: 'Unknown',
          resources: 'Unknown',
          timestamp: new Date().toISOString(),
          output: data.output,
          success: true
        });
        
        toast({
          title: "Export Completed",
          description: `Successfully exported ${provider} resources.`,
        });
      } else {
        setExportStatus('error');
        toast({
          title: "Export Failed",
          description: "Failed to export resources. Check the output for details.",
          variant: "destructive"
        });
      }
    });
    
    ws.on('export_error', (data) => {
      setIsExporting(false);
      setExportStatus('error');
      const errorText = data?.data || data || 'Unknown error';
      setExportOutput(prev => prev + 'ERROR: ' + errorText + '\n');
      
      toast({
        title: "Export Error",
        description: "An error occurred during export.",
        variant: "destructive"
      });
    });
    
    return () => ws.disconnect();
  }, [provider, projectId, resourceGroup, toast]);

  const handleExport = async () => {
    if (provider === 'GCP' && !projectId.trim()) {
      toast({
        title: "Project ID Required",
        description: "Please enter a valid GCP Project ID.",
        variant: "destructive"
      });
      return;
    }

    if (provider === 'AZURE' && !resourceGroup.trim()) {
      toast({
        title: "Resource Group Required",
        description: "Please enter a valid Azure Resource Group name.",
        variant: "destructive"
      });
      return;
    }

    if (provider === 'AWS' && !awsRegion.trim()) {
      toast({
        title: "AWS Region Required", 
        description: "Please select a valid AWS region.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExporting(true);
      setExportStatus('running');
      setExportProgress(0);
      setExportOutput('');

      await api.exportResources({
        provider: provider!,
        projectId: provider === 'GCP' ? projectId : undefined,
        resourceGroup: provider === 'AZURE' ? resourceGroup : undefined,
        awsRegion: provider === 'AWS' ? awsRegion : undefined,
        awsResources: provider === 'AWS' ? awsResources : undefined,
        vpcIds: provider === 'AWS' ? vpcIds : undefined
      });
    } catch (error) {
      setIsExporting(false);
      setExportStatus('error');
      toast({
        title: "Export Failed",
        description: "Failed to start export. Make sure the backend server is running.",
        variant: "destructive"
      });
    }
  };

  const handleContinue = () => {
    if (exportResults) {
      onComplete(exportResults);
    }
  };

  const handleUseLatestExport = () => {
    if (latestExport) {
      const results = {
        provider: latestExport.provider,
        projectId: latestExport.projectId,
        resourceGroup: latestExport.resourceGroup,
        exportPath: latestExport.exportPath,
        fileName: latestExport.fileName,
        fileSize: latestExport.fileSize,
        timestamp: latestExport.timestamp,
        success: true,
        output: `Using existing export from ${latestExport.age}`
      };

      setExportResults(results);
      setExportStatus('success');
      
      toast({
        title: "Using Latest Export",
        description: `Proceeding with export from ${latestExport.age}`,
      });
      
      onComplete(results);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {provider === 'GCP' ? 'GCP' : provider === 'AZURE' ? 'Azure' : 'AWS'} Resource Export
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Export your cloud resources to Terraform format for security analysis.
          {provider === 'AWS' && ' Using Terraformer to import existing AWS infrastructure.'}
        </p>
      </div>

      {/* Latest Export Available */}
      {latestExport && exportStatus === 'idle' && (
        <Card className="max-w-md mx-auto border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-700">
              <Clock className="h-5 w-5" />
              <span>Latest Export Available</span>
            </CardTitle>
            <CardDescription className="text-blue-600">
              Found existing export from {latestExport.age} - use it to skip the 10-minute export process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Provider:</span>
                <span className="ml-2 font-medium">{latestExport.provider}</span>
              </div>
              <div>
                <span className="text-gray-600">Size:</span>
                <span className="ml-2 font-medium">{latestExport.fileSize}</span>
              </div>
              {latestExport.projectId && (
                <div className="col-span-2">
                  <span className="text-gray-600">Project ID:</span>
                  <span className="ml-2 font-medium">{latestExport.projectId}</span>
                </div>
              )}
              {latestExport.resourceGroup && (
                <div className="col-span-2">
                  <span className="text-gray-600">Resource Group:</span>
                  <span className="ml-2 font-medium">{latestExport.resourceGroup}</span>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleUseLatestExport}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Use This Export
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Or create a new export below
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Form */}
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              provider === 'GCP' ? 'bg-blue-600' : 
              provider === 'AZURE' ? 'bg-blue-500' : 'bg-orange-500'
            }`}>
              <span className="text-white text-sm font-bold">
                {provider === 'GCP' ? 'G' : 
                 provider === 'AZURE' ? 'Az' : 'AWS'}
              </span>
            </div>
            <span>
              {provider === 'GCP' ? 'GCP Configuration' : 
               provider === 'AZURE' ? 'Azure Configuration' : 'AWS Configuration'}
            </span>
          </CardTitle>
          <CardDescription>
            {provider === 'GCP' 
              ? 'Enter your GCP Project ID to export resources'
              : provider === 'AZURE'
              ? 'Enter your Azure Resource Group name to export resources'
              : 'Select your AWS region to export resources'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {provider === 'GCP' ? (
            <div className="space-y-2">
              <Label htmlFor="projectId">Project ID</Label>
              <Input
                id="projectId"
                placeholder="my-gcp-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={isExporting}
              />
              <p className="text-xs text-gray-500">
                The GCP project ID containing resources to export
              </p>
            </div>
          ) : provider === 'AZURE' ? (
            <div className="space-y-2">
              <Label htmlFor="resourceGroup">Resource Group</Label>
              <Input
                id="resourceGroup"
                placeholder="my-resource-group"
                value={resourceGroup}
                onChange={(e) => setResourceGroup(e.target.value)}
                disabled={isExporting}
              />
              <p className="text-xs text-gray-500">
                The Azure resource group containing resources to export
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="awsRegion">AWS Region</Label>
                <Input
                  id="awsRegion"
                  placeholder="us-east-1"
                  value={awsRegion}
                  onChange={(e) => setAwsRegion(e.target.value)}
                  disabled={isExporting}
                />
                <p className="text-xs text-gray-500">
                  The AWS region containing resources to export
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="awsResources">Resources to Import</Label>
                <Input
                  id="awsResources"
                  placeholder="vpc,subnet,ec2_instance,security_group"
                  value={awsResources}
                  onChange={(e) => setAwsResources(e.target.value)}
                  disabled={isExporting}
                />
                <p className="text-xs text-gray-500">
                  Comma-separated list of AWS resources (vpc, subnet, ec2_instance, security_group, iam_role, s3_bucket, rds_instance, lambda_function)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vpcIds">VPC IDs (Optional)</Label>
                <Input
                  id="vpcIds"
                  placeholder="vpc-12345,vpc-67890"
                  value={vpcIds}
                  onChange={(e) => setVpcIds(e.target.value)}
                  disabled={isExporting}
                />
                <p className="text-xs text-gray-500">
                  Optional: Comma-separated VPC IDs to filter resources. Leave empty to import all resources.
                </p>
              </div>
            </div>
          )}

          <Button 
            onClick={handleExport}
            disabled={isExporting || (!projectId.trim() && provider === 'GCP') || (!resourceGroup.trim() && provider === 'AZURE')}
            className="w-full"
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Exporting Resources...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Start Export
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Export Progress */}
      {exportStatus === 'running' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Export in Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={exportProgress} className="w-full" />
              <p className="text-sm text-gray-600 text-center">
                {exportProgress < 30 ? 'Initializing export...' :
                 exportProgress < 60 ? 'Discovering resources...' :
                 exportProgress < 90 ? 'Generating Terraform configuration...' :
                 'Finalizing export...'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Output */}
      {exportOutput && (
        <Card>
          <CardHeader>
            <CardTitle>Export Output</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={exportOutput}
              readOnly
              className="h-32 font-mono text-sm bg-gray-50"
              placeholder="Export output will appear here..."
            />
          </CardContent>
        </Card>
      )}

      {/* Export Results */}
      {exportStatus === 'success' && exportResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Export Completed Successfully</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Provider:</span>
                <span className="ml-2 font-medium">{exportResults.provider}</span>
              </div>
              <div>
                <span className="text-gray-600">Export Path:</span>
                <span className="ml-2 font-medium text-blue-600">{exportResults.exportPath}</span>
              </div>
              {exportResults.projectId && (
                <div>
                  <span className="text-gray-600">Project ID:</span>
                  <span className="ml-2 font-medium">{exportResults.projectId}</span>
                </div>
              )}
              {exportResults.resourceGroup && (
                <div>
                  <span className="text-gray-600">Resource Group:</span>
                  <span className="ml-2 font-medium">{exportResults.resourceGroup}</span>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <Button onClick={handleContinue} className="w-full bg-blue-600 hover:bg-blue-700">
                Continue to Security Scan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Error */}
      {exportStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Export failed. Please check the output above for error details and try again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ResourceExporter;
