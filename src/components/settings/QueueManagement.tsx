import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountStore } from '@/store/accountStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useToast } from '@/hooks/use-toast';
import { Clock, Plus, Trash2, Power, Loader2 } from 'lucide-react';
import {
  createQueueSlot,
  getAccountQueueSlots,
  deleteQueueSlot,
  toggleQueueSlot,
} from '@/services/queueService';
import type { QueueSlot } from '@/types';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const QueueManagement = () => {
  const { currentUser } = useAuth();
  const { accounts, selectedAccount } = useAccountStore();
  const { toast } = useToast();

  const [slots, setSlots] = useState<QueueSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    selectedAccount?.id || accounts[0]?.id || ''
  );

  // Form state
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Monday
  const [timeSlot, setTimeSlot] = useState<string>('09:00');
  const [creating, setCreating] = useState(false);

  // Load slots when account changes
  useEffect(() => {
    if (!currentUser || !selectedAccountId) return;

    const loadSlots = async () => {
      setLoading(true);
      try {
        const accountSlots = await getAccountQueueSlots(currentUser.uid, selectedAccountId);
        setSlots(accountSlots);
      } catch (error) {
        console.error('Error loading queue slots:', error);
        toast({
          title: 'Error',
          description: 'Failed to load queue slots',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadSlots();
  }, [currentUser, selectedAccountId, toast]);

  const handleCreateSlot = async () => {
    if (!currentUser || !selectedAccountId) return;

    setCreating(true);
    try {
      await createQueueSlot(currentUser.uid, selectedAccountId, dayOfWeek, timeSlot);

      // Reload slots
      const accountSlots = await getAccountQueueSlots(currentUser.uid, selectedAccountId);
      setSlots(accountSlots);

      toast({
        title: 'Time slot created',
        description: `Added ${DAYS_OF_WEEK[dayOfWeek]} at ${timeSlot}`,
      });

      setDialogOpen(false);
      setDayOfWeek(1);
      setTimeSlot('09:00');
    } catch (error) {
      console.error('Error creating slot:', error);
      toast({
        title: 'Error',
        description: 'Failed to create time slot',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSlot = async (slotId: string, slotInfo: string) => {
    if (!currentUser) return;

    if (!confirm(`Delete time slot: ${slotInfo}?`)) return;

    try {
      await deleteQueueSlot(currentUser.uid, slotId);

      // Reload slots
      const accountSlots = await getAccountQueueSlots(currentUser.uid, selectedAccountId);
      setSlots(accountSlots);

      toast({
        title: 'Time slot deleted',
        description: 'The time slot has been removed',
      });
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete time slot',
        variant: 'destructive',
      });
    }
  };

  const handleToggleSlot = async (slotId: string, currentStatus: boolean) => {
    if (!currentUser) return;

    try {
      await toggleQueueSlot(currentUser.uid, slotId, !currentStatus);

      // Reload slots
      const accountSlots = await getAccountQueueSlots(currentUser.uid, selectedAccountId);
      setSlots(accountSlots);

      toast({
        title: currentStatus ? 'Time slot disabled' : 'Time slot enabled',
        description: currentStatus
          ? 'Posts will not be scheduled to this slot'
          : 'Posts can now be scheduled to this slot',
      });
    } catch (error) {
      console.error('Error toggling slot:', error);
      toast({
        title: 'Error',
        description: 'Failed to update time slot',
        variant: 'destructive',
      });
    }
  };

  // Group slots by day
  const slotsByDay = slots.reduce((acc, slot) => {
    if (!acc[slot.dayOfWeek]) {
      acc[slot.dayOfWeek] = [];
    }
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {} as Record<number, QueueSlot[]>);

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Queue Schedule</CardTitle>
              <CardDescription>No accounts connected</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add an account to set up automatic post scheduling.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Queue Schedule</CardTitle>
              <CardDescription>
                Set time slots for automatic post scheduling
              </CardDescription>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Time Slot
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Selector */}
        <div className="flex items-center gap-2">
          <Label>Account:</Label>
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  @{account.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Slots Display */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              No time slots configured for this account.
            </p>
            <Button onClick={() => setDialogOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Time Slot
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const daySlots = slotsByDay[day] || [];
              if (daySlots.length === 0) return null;

              return (
                <div key={day} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">{DAYS_OF_WEEK[day]}</h4>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{slot.timeSlot}</span>
                          {!slot.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleToggleSlot(slot.id, slot.isActive)}
                          >
                            <Power
                              className={`h-4 w-4 ${
                                slot.isActive ? 'text-green-600' : 'text-muted-foreground'
                              }`}
                            />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() =>
                              handleDeleteSlot(
                                slot.id,
                                `${DAYS_OF_WEEK[slot.dayOfWeek]} at ${slot.timeSlot}`
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <p className="text-muted-foreground">
            <strong>How it works:</strong> When you add a post to the queue, it will automatically be
            scheduled to the next available time slot. Time slots are checked in chronological order.
          </p>
        </div>
      </CardContent>

      {/* Add Slot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Time Slot</DialogTitle>
            <DialogDescription>
              Create a new time slot for automatic post scheduling
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={dayOfWeek.toString()} onValueChange={(val) => setDayOfWeek(Number(val))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSlot} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Slot
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
