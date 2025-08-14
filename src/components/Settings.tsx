
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, Users, Building, Save, Plus, Trash2 } from "lucide-react";

interface SeatingCombination {
  id: string;
  name: string;
  allowed_years: string[];
  allowed_sections: string[];
  mix_strategy: string;
  is_default: boolean;
}

const Settings = () => {
  const [seatingCombinations, setSeatingCombinations] = useState<SeatingCombination[]>([]);
  const [newCombination, setNewCombination] = useState({
    name: '',
    allowed_years: [] as string[],
    allowed_sections: [] as string[],
    mix_strategy: 'alternate',
    is_default: false
  });
  const [systemSettings, setSystemSettings] = useState({
    default_exam_duration: 3,
    default_students_per_bench: 2,
    allow_same_year_adjacent: false,
    auto_email_credentials: true,
    backup_frequency: 'daily'
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSeatingCombinations();
  }, []);

  const fetchSeatingCombinations = async () => {
    const { data } = await supabase
      .from('seating_combinations')
      .select('*')
      .order('name');
    
    if (data) setSeatingCombinations(data);
  };

  const saveSeatingCombination = async () => {
    if (!newCombination.name || newCombination.allowed_years.length === 0) {
      toast({
        title: "Invalid Input",
        description: "Please provide a name and select at least one year.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      // If this is set as default, unset others
      if (newCombination.is_default) {
        await supabase
          .from('seating_combinations')
          .update({ is_default: false })
          .eq('is_default', true);
      }

      const { error } = await supabase
        .from('seating_combinations')
        .insert([newCombination]);

      if (error) throw error;

      await fetchSeatingCombinations();
      
      // Reset form
      setNewCombination({
        name: '',
        allowed_years: [],
        allowed_sections: [],
        mix_strategy: 'alternate',
        is_default: false
      });

      toast({
        title: "Combination Saved",
        description: "New seating combination has been created successfully."
      });

    } catch (error) {
      console.error('Error saving combination:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save seating combination. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSeatingCombination = async (id: string) => {
    const { error } = await supabase
      .from('seating_combinations')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete seating combination.",
        variant: "destructive"
      });
      return;
    }

    await fetchSeatingCombinations();
    toast({
      title: "Combination Deleted",
      description: "Seating combination has been removed."
    });
  };

  const setDefaultCombination = async (id: string) => {
    try {
      // Unset all defaults
      await supabase
        .from('seating_combinations')
        .update({ is_default: false })
        .eq('is_default', true);

      // Set new default
      await supabase
        .from('seating_combinations')
        .update({ is_default: true })
        .eq('id', id);

      await fetchSeatingCombinations();
      
      toast({
        title: "Default Updated",
        description: "Default seating combination has been updated."
      });

    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update default combination.",
        variant: "destructive"
      });
    }
  };

  const handleYearToggle = (year: string) => {
    setNewCombination(prev => ({
      ...prev,
      allowed_years: prev.allowed_years.includes(year)
        ? prev.allowed_years.filter(y => y !== year)
        : [...prev.allowed_years, year]
    }));
  };

  const handleSectionToggle = (section: string) => {
    setNewCombination(prev => ({
      ...prev,
      allowed_sections: prev.allowed_sections.includes(section)
        ? prev.allowed_sections.filter(s => s !== section)
        : [...prev.allowed_sections, section]
    }));
  };

  const years = ['II Year', 'III Year', 'IV Year'];
  const sections = ['A', 'B', 'C', 'D'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
          <p className="text-gray-600">Configure system preferences and seating arrangements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seating Combinations */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Create Seating Combination</span>
              </CardTitle>
              <CardDescription>
                Define new seating arrangement strategies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="combination-name">Combination Name</Label>
                <Input
                  id="combination-name"
                  value={newCombination.name}
                  onChange={(e) => setNewCombination(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., II & III Year Alternate"
                />
              </div>

              <div className="space-y-2">
                <Label>Allowed Years</Label>
                <div className="flex flex-wrap gap-2">
                  {years.map(year => (
                    <label key={year} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCombination.allowed_years.includes(year)}
                        onChange={() => handleYearToggle(year)}
                        className="rounded"
                      />
                      <span className="text-sm">{year}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Allowed Sections</Label>
                <div className="flex flex-wrap gap-2">
                  {sections.map(section => (
                    <label key={section} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCombination.allowed_sections.includes(section)}
                        onChange={() => handleSectionToggle(section)}
                        className="rounded"
                      />
                      <span className="text-sm">Section {section}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mix-strategy">Mixing Strategy</Label>
                <Select 
                  value={newCombination.mix_strategy} 
                  onValueChange={(value) => setNewCombination(prev => ({ ...prev, mix_strategy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alternate">Alternate (Year/Section rotation)</SelectItem>
                    <SelectItem value="block">Block (Group similar together)</SelectItem>
                    <SelectItem value="random">Random (Completely mixed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is-default"
                  checked={newCombination.is_default}
                  onCheckedChange={(checked) => setNewCombination(prev => ({ ...prev, is_default: checked }))}
                />
                <Label htmlFor="is-default">Set as default combination</Label>
              </div>

              <Button 
                onClick={saveSeatingCombination}
                disabled={isSaving}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Create Combination'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Combinations</CardTitle>
              <CardDescription>Manage your seating arrangement strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {seatingCombinations.map((combination) => (
                  <div key={combination.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{combination.name}</h4>
                        {combination.is_default && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Default</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {combination.allowed_years.join(', ')} • {combination.mix_strategy} mixing
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!combination.is_default && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDefaultCombination(combination.id)}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteSeatingCombination(combination.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5" />
                <span>System Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure default system behavior and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam-duration">Default Exam Duration (Hours)</Label>
                <Input
                  id="exam-duration"
                  type="number"
                  min="1"
                  max="8"
                  step="0.5"
                  value={systemSettings.default_exam_duration}
                  onChange={(e) => setSystemSettings(prev => ({ 
                    ...prev, 
                    default_exam_duration: parseFloat(e.target.value) 
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="students-per-bench">Default Students per Bench</Label>
                <Select 
                  value={systemSettings.default_students_per_bench.toString()}
                  onValueChange={(value) => setSystemSettings(prev => ({ 
                    ...prev, 
                    default_students_per_bench: parseInt(value) 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Student</SelectItem>
                    <SelectItem value="2">2 Students</SelectItem>
                    <SelectItem value="3">3 Students</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="same-year-adjacent"
                  checked={systemSettings.allow_same_year_adjacent}
                  onCheckedChange={(checked) => setSystemSettings(prev => ({ 
                    ...prev, 
                    allow_same_year_adjacent: checked 
                  }))}
                />
                <Label htmlFor="same-year-adjacent">Allow same year students to sit adjacent</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-email"
                  checked={systemSettings.auto_email_credentials}
                  onCheckedChange={(checked) => setSystemSettings(prev => ({ 
                    ...prev, 
                    auto_email_credentials: checked 
                  }))}
                />
                <Label htmlFor="auto-email">Auto-email student credentials</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="backup-frequency">Backup Frequency</Label>
                <Select 
                  value={systemSettings.backup_frequency}
                  onValueChange={(value) => setSystemSettings(prev => ({ 
                    ...prev, 
                    backup_frequency: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full mt-6">
                <Save className="h-4 w-4 mr-2" />
                Save System Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Database Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Database Connection</span>
                  <span className="text-green-600 text-sm font-medium">Connected</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Backup</span>
                  <span className="text-gray-900 text-sm">2 hours ago</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Storage Used</span>
                  <span className="text-gray-900 text-sm">245 MB</span>
                </div>
                <div className="pt-2">
                  <Button variant="outline" className="w-full">
                    Export Database Backup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
