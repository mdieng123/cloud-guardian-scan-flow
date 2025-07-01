
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cloud, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CloudProviderSelectorProps {
  onComplete: (data: { provider: 'GCP' | 'AZURE' }) => void;
}

const CloudProviderSelector: React.FC<CloudProviderSelectorProps> = ({ onComplete }) => {
  const [selectedProvider, setSelectedProvider] = useState<'GCP' | 'AZURE' | null>(null);
  const { toast } = useToast();

  const handleProviderSelect = (provider: 'GCP' | 'AZURE') => {
    setSelectedProvider(provider);
  };

  const handleContinue = () => {
    if (selectedProvider) {
      toast({
        title: "Cloud Provider Selected",
        description: `Proceeding with ${selectedProvider === 'GCP' ? 'Google Cloud Platform' : 'Microsoft Azure'}.`,
      });
      onComplete({ provider: selectedProvider });
    } else {
      toast({
        title: "Selection Required",
        description: "Please select a cloud provider to continue.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Cloud className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Cloud Environment</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Choose your cloud platform for Terraform resource export and security assessment.
        </p>
      </div>

      <div className="grid gap-4 max-w-2xl mx-auto">
        {/* GCP Option */}
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedProvider === 'GCP' 
              ? 'ring-2 ring-blue-500 bg-blue-50' 
              : 'hover:bg-gray-50'
          }`}
          onClick={() => handleProviderSelect('GCP')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">G</span>
                </div>
                <div>
                  <CardTitle className="text-lg">Google Cloud Platform</CardTitle>
                  <CardDescription>Export GCP resources using Cloud Asset API</CardDescription>
                </div>
              </div>
              {selectedProvider === 'GCP' && (
                <CheckCircle className="h-6 w-6 text-blue-600" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>✓ Terraform export via Cloud Asset API</p>
              <p>✓ Comprehensive resource discovery</p>
              <p>✓ Project-based organization</p>
              <p>✓ Integration with Vertex AI for analysis</p>
            </div>
          </CardContent>
        </Card>

        {/* Azure Option */}
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedProvider === 'AZURE' 
              ? 'ring-2 ring-blue-500 bg-blue-50' 
              : 'hover:bg-gray-50'
          }`}
          onClick={() => handleProviderSelect('AZURE')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">Az</span>
                </div>
                <div>
                  <CardTitle className="text-lg">Microsoft Azure</CardTitle>
                  <CardDescription>Export Azure resources using aztfexport</CardDescription>
                </div>
              </div>
              {selectedProvider === 'AZURE' && (
                <CheckCircle className="h-6 w-6 text-blue-600" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>✓ Terraform export via aztfexport</p>
              <p>✓ Resource group-based export</p>
              <p>✓ Complete infrastructure mapping</p>
              <p>✓ Non-interactive batch processing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pt-4">
        <Button 
          onClick={handleContinue}
          disabled={!selectedProvider}
          className="bg-blue-600 hover:bg-blue-700 px-8"
        >
          Continue to Resource Export
        </Button>
      </div>
    </div>
  );
};

export default CloudProviderSelector;
