
'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash, Loader2, Info } from 'lucide-react';
import type { PlannerItem } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const LOCAL_STORAGE_KEY = 'lifeos_weeklySchedule';
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const getCurrentDayName = () => {
    const today = new Date();
    const dayIndex = today.getDay(); // Sunday: 0, Monday: 1, ...
    return daysOfWeek[dayIndex === 0 ? 6 : dayIndex - 1];
};

export default function PlannerPage() {
    const { toast } = useToast();
    const [weeklySchedule, setWeeklySchedule] = useState<Record<string, PlannerItem[]>>({});
    const [selectedDay, setSelectedDay] = useState(getCurrentDayName());
    const [isLoading, setIsLoading] = useState(true);

    // Form state for ad-hoc items
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemStartTime, setNewItemStartTime] = useState('09:00');
    const [newItemEndTime, setNewItemEndTime] = useState('10:00');
    const [newItemTag, setNewItemTag] = useState('');
    const [newItemAddToAllWeek, setNewItemAddToAllWeek] = useState(false);

    useEffect(() => {
        try {
            const storedSchedule = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedSchedule) {
                setWeeklySchedule(JSON.parse(storedSchedule));
            } else {
                const initialSchedule: Record<string, PlannerItem[]> = {};
                daysOfWeek.forEach(day => { initialSchedule[day] = [] });
                setWeeklySchedule(initialSchedule);
            }
        } catch (error) {
            console.error("Failed to load schedule from localStorage", error);
            toast({ title: "Error", description: "Could not load schedule.", variant: "destructive" });
        }
        setIsLoading(false);
    }, [toast]);
    
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(weeklySchedule));
        }
    }, [weeklySchedule, isLoading]);
    
    const handleAddAdhocItem = () => {
        if (!newItemTitle.trim()) {
            toast({ title: "Missing Info", description: "Please provide a title for the item.", variant: "destructive" });
            return;
        }

        if (newItemStartTime >= newItemEndTime) {
            toast({ title: "Invalid Time", description: "End time must be after start time.", variant: "destructive" });
            return;
        }

        const daysToUpdate = newItemAddToAllWeek ? daysOfWeek : [selectedDay];
        const newSchedule = { ...weeklySchedule };

        daysToUpdate.forEach(day => {
            const newItem: PlannerItem = {
                id: `${day.toLowerCase()}-${Date.now()}`,
                startTime: newItemStartTime,
                endTime: newItemEndTime,
                title: newItemTitle.trim(),
                tag: newItemTag.trim() || undefined,
            };
            newSchedule[day] = [...(newSchedule[day] || []), newItem].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });

        setWeeklySchedule(newSchedule);
        
        toast({ title: "Item Added", description: `"${newItemTitle}" was added to ${newItemAddToAllWeek ? 'all days this week' : selectedDay}.`});
        
        setNewItemTitle('');
        setNewItemStartTime('09:00');
        setNewItemEndTime('10:00');
        setNewItemTag('');
        setNewItemAddToAllWeek(false);
    };

    const handleDeleteAdhocItem = (day: string, itemId: string) => {
        const newSchedule = { ...weeklySchedule };
        newSchedule[day] = (newSchedule[day] || []).filter(item => item.id !== itemId);
        setWeeklySchedule(newSchedule);
        toast({ title: "Item Deleted", variant: "destructive", description: "Item removed from schedule." });
    };

    const daySchedule = weeklySchedule[selectedDay] || [];

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="ml-2">Loading schedule...</p>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <TooltipProvider>
                <div className="h-full flex flex-col">
                    <header className="mb-2">
                        <h1 className="text-lg font-semibold font-headline">Daily Planner</h1>
                    </header>

                    <Card className="w-full flex-grow flex flex-col">
                        <CardHeader className="p-3 flex-row items-center justify-between">
                            <CardTitle className="text-base font-semibold">Schedule for {selectedDay}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 pt-0 flex-grow flex flex-col overflow-hidden">
                            <div className="space-y-2 flex-grow flex flex-col min-h-0">
                                <div className="space-y-1">
                                    <Label htmlFor="day-select" className="text-xs">Select a day to view/add to:</Label>
                                    <Select value={selectedDay} onValueChange={setSelectedDay}>
                                        <SelectTrigger id="day-select">
                                            <SelectValue placeholder="Select a day" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {daysOfWeek.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <ScrollArea className="pr-2 border rounded-md p-1.5 flex-grow">
                                    {daySchedule.length > 0 ? (
                                        <div className="space-y-1.5">
                                            {daySchedule.map(item => (
                                                <div key={item.id} className="flex items-center justify-between p-1.5 rounded-md bg-muted/50 text-xs">
                                                    <div>
                                                        <span className="font-semibold">{item.startTime} - {item.endTime}</span>: {item.title}
                                                        {item.tag && <span className="ml-2 text-xs bg-primary/20 text-primary-foreground px-1.5 py-0.5 rounded-full">{item.tag}</span>}
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteAdhocItem(selectedDay, item.id)}>
                                                        <Trash className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <p className="text-muted-foreground text-sm">No items scheduled for {selectedDay}.</p>
                                        </div>
                                    )}
                                </ScrollArea>

                                <div className="pt-2 border-t">
                                    <h3 className="font-semibold text-base mb-2">Add Ad-hoc Item</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="sm:col-span-2 space-y-1">
                                            <Label htmlFor="new-item-title" className="text-xs">Title</Label>
                                            <Input id="new-item-title" value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} placeholder="e.g., Study Session, Meeting" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="new-item-start-time" className="text-xs">Start Time</Label>
                                            <Input id="new-item-start-time" type="time" value={newItemStartTime} onChange={e => setNewItemStartTime(e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="new-item-end-time" className="text-xs">End Time</Label>
                                            <Input id="new-item-end-time" type="time" value={newItemEndTime} onChange={e => setNewItemEndTime(e.target.value)} />
                                        </div>
                                        <div className="sm:col-span-2 space-y-1">
                                            <Label htmlFor="new-item-tag" className="text-xs">Tag (Optional)</Label>
                                            <Input id="new-item-tag" value={newItemTag} onChange={e => setNewItemTag(e.target.value)} placeholder="e.g., Work, Personal, College" />
                                        </div>
                                        <div className="sm:col-span-2 flex items-center space-x-2">
                                            <Checkbox id="new-item-add-to-all-week" checked={newItemAddToAllWeek} onCheckedChange={(checked) => setNewItemAddToAllWeek(!!checked)} />
                                            <Label htmlFor="new-item-add-to-all-week" className="flex items-center gap-1.5 text-xs">
                                                Add to all days this week
                                                <Tooltip delayDuration={0}>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-3 w-3 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Adds the item to Mon-Sun of the current week.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </Label>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <Button onClick={handleAddAdhocItem} className="w-full sm:w-auto">
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TooltipProvider>
        </AppLayout>
    );
}
