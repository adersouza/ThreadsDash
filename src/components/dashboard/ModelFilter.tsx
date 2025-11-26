import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Grid3x3, Folder, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useModelStore } from '@/store/modelStore';
import { useAccountStore } from '@/store/accountStore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createModel, updateModel, deleteModel } from '@/services/modelService';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Model } from '@/types';

export const ModelFilter = () => {
  const { models, selectedModelId, setSelectedModelId } = useModelStore();
  const { accounts } = useAccountStore();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Count accounts in each model
  const getAccountCount = (modelId: string | null) => {
    if (modelId === null) {
      return accounts.length;
    }
    return accounts.filter((acc) => acc.modelIds?.includes(modelId)).length;
  };

  const handleCreateModel = async () => {
    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      await createModel(currentUser.uid, modelName, modelDescription);
      toast({
        title: 'Model created',
        description: `"${modelName}" has been created successfully.`,
      });
      setCreateDialogOpen(false);
      setModelName('');
      setModelDescription('');
    } catch (error) {
      console.error('Error creating model:', error);
      toast({
        title: 'Error',
        description: 'Failed to create model. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditModel = (model: Model) => {
    setEditingModel(model);
    setModelName(model.name);
    setModelDescription(model.description || '');
    setEditDialogOpen(true);
  };

  const handleUpdateModel = async () => {
    if (!currentUser || !editingModel) return;

    setIsSubmitting(true);
    try {
      await updateModel(currentUser.uid, editingModel.id, {
        name: modelName,
        description: modelDescription,
      });
      toast({
        title: 'Model updated',
        description: `"${modelName}" has been updated successfully.`,
      });
      setEditDialogOpen(false);
      setEditingModel(null);
      setModelName('');
      setModelDescription('');
    } catch (error) {
      console.error('Error updating model:', error);
      toast({
        title: 'Error',
        description: 'Failed to update model. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteModel = async (model: Model) => {
    if (!currentUser) return;

    if (!confirm(`Are you sure you want to delete "${model.name}"? Accounts will not be deleted.`)) {
      return;
    }

    try {
      await deleteModel(currentUser.uid, model.id);
      toast({
        title: 'Model deleted',
        description: `"${model.name}" has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting model:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete model. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="w-64 flex-shrink-0">
      <Card className="p-4">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground">MODELS</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* All Accounts */}
          <button
            onClick={() => setSelectedModelId(null)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
              selectedModelId === null
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              <span>All Accounts</span>
            </div>
            <span className="text-xs">{getAccountCount(null)}</span>
          </button>

          {/* Model List */}
          <div className="space-y-1">
            {models.map((model) => (
              <div
                key={model.id}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors group',
                  selectedModelId === model.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                <button
                  onClick={() => setSelectedModelId(model.id)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <Folder className="h-4 w-4" style={{ color: model.color }} />
                  <span className="truncate">{model.name}</span>
                </button>
                <div className="flex items-center gap-1">
                  <span className="text-xs">{getAccountCount(model.id)}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditModel(model)}>
                        <Pencil className="h-3 w-3 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteModel(model)}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {models.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No models yet</p>
              <p className="text-xs mt-1">Create one to organize your accounts</p>
            </div>
          )}
        </div>
      </Card>

      {/* Create Model Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Model</DialogTitle>
            <DialogDescription>
              Create a new model to organize your accounts. You can assign multiple accounts to a
              model.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modelName">Model Name</Label>
              <Input
                id="modelName"
                placeholder="e.g., Personal, Business, Clients"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelDescription">Description (Optional)</Label>
              <Input
                id="modelDescription"
                placeholder="Brief description of this model"
                value={modelDescription}
                onChange={(e) => setModelDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateModel} disabled={!modelName.trim() || isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Model'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Model Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Model</DialogTitle>
            <DialogDescription>Update the model name and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editModelName">Model Name</Label>
              <Input
                id="editModelName"
                placeholder="e.g., Personal, Business, Clients"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editModelDescription">Description (Optional)</Label>
              <Input
                id="editModelDescription"
                placeholder="Brief description of this model"
                value={modelDescription}
                onChange={(e) => setModelDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdateModel} disabled={!modelName.trim() || isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Model'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
