import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Switch } from './ui/switch';
import { Check } from 'lucide-react';

export function ScanSettings() {
  const [testConnection, setTestConnection] = useState(false);
  const [scanCategories, setScanCategories] = useState({
    s3Buckets: true,
    iamPolicies: false,
    securityGroups: false,
    secretsManager: false,
  });
  const [enableMfa, setEnableMfa] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(false);

  const handleTestConnection = () => {
    setTestConnection(true);
  };

  return (
    <div className="p-8">
      <h1 className="text-[#2c4564] text-2xl font-semibold mb-6">Scan Settings</h1>

      <div className="bg-white rounded-lg p-8 max-w-[850px]">
        <h2 className="text-[#2c4564] text-lg font-semibold mb-6">AWS Configuration</h2>

        <div className="space-y-6">
          {/* AWS Access Key ID */}
          <div className="flex items-center gap-6">
            <label className="text-[#4a5d7a] text-sm w-[200px] flex-shrink-0">
              AWS Access Key ID
            </label>
            <Input
              type="password"
              value="••••••••••••••••"
              className="flex-1 bg-[#f5f7fa] border-gray-300"
              readOnly
            />
          </div>

          {/* AWS Secret Access Key */}
          <div className="flex items-center gap-6">
            <label className="text-[#4a5d7a] text-sm w-[200px] flex-shrink-0">
              AWS Secret Access Key
            </label>
            <Input
              type="password"
              value="••••••••••••••"
              className="flex-1 bg-[#f5f7fa] border-gray-300"
              readOnly
            />
            <Button
              onClick={handleTestConnection}
              className="bg-[#3d5a7e] hover:bg-[#2c4564] text-white px-6"
            >
              Test Connection
            </Button>
          </div>

          {/* AWS Region */}
          <div className="flex items-center gap-6">
            <label className="text-[#4a5d7a] text-sm w-[200px] flex-shrink-0">
              AWS Region
            </label>
            <Select defaultValue="us-east-1">
              <SelectTrigger className="w-[280px] bg-[#f5f7fa] border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us-east-1">us-east-1- (N. Virginia)</SelectItem>
                <SelectItem value="us-east-2">us-east-2- (Ohio)</SelectItem>
                <SelectItem value="us-west-1">us-west-1- (N. California)</SelectItem>
                <SelectItem value="us-west-2">us-west-2- (Oregon)</SelectItem>
                <SelectItem value="eu-west-1">eu-west-1- (Ireland)</SelectItem>
              </SelectContent>
            </Select>

            {/* Test Connection Result */}
            {testConnection && (
              <div className="flex items-center gap-2 ml-auto">
                <div className="bg-[#4a7bbd] rounded-md p-2">
                  <Check className="text-white" size={20} />
                </div>
                <span className="text-[#4a5d7a] text-sm">Connection Successful</span>
              </div>
            )}
          </div>

          {/* Enable MFA */}
          <div className="flex items-center gap-6">
            <label className="text-[#4a5d7a] text-sm w-[200px] flex-shrink-0">
              Enable MFA
            </label>
            <Switch
              checked={enableMfa}
              onCheckedChange={setEnableMfa}
              className="data-[state=checked]:bg-[#4a7bbd]"
            />
          </div>

          {/* Scan Level */}
          <div className="flex items-center gap-6">
            <label className="text-[#4a5d7a] text-sm w-[200px] flex-shrink-0">
              Scan Level
            </label>
            <Select defaultValue="standard">
              <SelectTrigger className="w-[280px] bg-[#f5f7fa] border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Scan</SelectItem>
                <SelectItem value="quick">Quick Scan</SelectItem>
                <SelectItem value="deep">Deep Scan</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="advanced">
              <SelectTrigger className="flex-1 bg-[#f5f7fa] border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="advanced">Advanced Scan</SelectItem>
                <SelectItem value="basic">Basic Scan</SelectItem>
                <SelectItem value="custom">Custom Scan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scan Categories */}
          <div className="flex items-start gap-6">
            <label className="text-[#4a5d7a] text-sm w-[200px] flex-shrink-0 pt-2">
              Scan Categories
            </label>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 flex-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="s3-buckets"
                  checked={scanCategories.s3Buckets}
                  onCheckedChange={(checked) =>
                    setScanCategories({ ...scanCategories, s3Buckets: !!checked })
                  }
                  className="data-[state=checked]:bg-[#4a7bbd] data-[state=checked]:border-[#4a7bbd]"
                />
                <label
                  htmlFor="s3-buckets"
                  className="text-[#4a5d7a] text-sm cursor-pointer"
                >
                  S3 Buckets
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="security-groups"
                  checked={scanCategories.securityGroups}
                  onCheckedChange={(checked) =>
                    setScanCategories({ ...scanCategories, securityGroups: !!checked })
                  }
                  className="data-[state=checked]:bg-[#4a7bbd] data-[state=checked]:border-[#4a7bbd]"
                />
                <label
                  htmlFor="security-groups"
                  className="text-gray-400 text-sm cursor-pointer"
                >
                  Security Groups
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="iam-policies"
                  checked={scanCategories.iamPolicies}
                  onCheckedChange={(checked) =>
                    setScanCategories({ ...scanCategories, iamPolicies: !!checked })
                  }
                  className="data-[state=checked]:bg-[#4a7bbd] data-[state=checked]:border-[#4a7bbd]"
                />
                <label
                  htmlFor="iam-policies"
                  className="text-gray-400 text-sm cursor-pointer"
                >
                  IAM Policies
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="secrets-manager"
                  checked={scanCategories.secretsManager}
                  onCheckedChange={(checked) =>
                    setScanCategories({ ...scanCategories, secretsManager: !!checked })
                  }
                  className="data-[state=checked]:bg-[#4a7bbd] data-[state=checked]:border-[#4a7bbd]"
                />
                <label
                  htmlFor="secrets-manager"
                  className="text-gray-400 text-sm cursor-pointer"
                >
                  Secrets Manager
                </label>
              </div>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="flex items-center gap-6 pt-4">
            <div className="w-[200px]"></div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={(checked) => setEmailNotifications(!!checked)}
                className="data-[state=checked]:bg-[#4a7bbd] data-[state=checked]:border-[#4a7bbd]"
              />
              <label
                htmlFor="email-notifications"
                className="text-[#4a5d7a] text-sm cursor-pointer"
              >
                Enable Email Notifications
              </label>
            </div>
          </div>

          {/* Save Settings Button */}
          <div className="flex items-center gap-6 pt-4">
            <div className="w-[200px]"></div>
            <Button className="bg-[#5fa75f] hover:bg-[#4e8f4e] text-white px-8 py-2.5 w-[280px]">
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
