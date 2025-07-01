
'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import type { Notification } from '@/types';
import { P_NOTIFICATIONS } from '@/lib/placeholder-data';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BellRing, Check, Mail, Trash2, Loader2 } from 'lucide-react';
import { format, parseISO, isToday, isFuture, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

function NotificationCard({ notification, onToggleRead, onDelete }: { 
    notification: Notification, 
    onToggleRead: (id: string) => void,
    onDelete: (id: string) => void 
}) {
    return (
        <Card className={cn('transition-colors', !notification.read && 'bg-primary/5 border-primary/20')}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 p-4">
                <div className="flex items-start gap-4">
                    <div className={cn("mt-1", !notification.read ? 'text-primary' : 'text-muted-foreground')}><BellRing className="h-5 w-5" /></div>
                    <div><CardTitle className="text-base">{notification.title}</CardTitle><CardDescription>{format(parseISO(notification.date), 'PPP')}</CardDescription></div>
                </div>
                <div className="flex items-center flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleRead(notification.id)}>{notification.read ? <Mail className="h-4 w-4 text-muted-foreground" /> : <Check className="h-4 w-4 text-primary" />}<span className="sr-only">Mark as {notification.read ? 'unread' : 'read'}</span></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(notification.id)}><Trash2 className="h-4 w-4" /><span className="sr-only">Delete reminder</span></Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 pl-14"><p className="text-sm text-foreground/80">{notification.message}</p></CardContent>
        </Card>
    );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const notificationsDocRef = doc(db, 'users', user.uid, 'data', 'notifications');
    const unsubscribe = onSnapshot(notificationsDocRef, async (docSnap) => {
        if (docSnap.exists()) {
            setNotifications((docSnap.data() as { items: Notification[] }).items || []);
        } else {
            const initialData = P_NOTIFICATIONS;
            await setDoc(notificationsDocRef, { items: initialData });
            setNotifications(initialData);
        }
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const saveNotifications = async (updatedNotifications: Notification[]) => {
      if (!user) return;
      await setDoc(doc(db, 'users', user.uid, 'data', 'notifications'), { items: updatedNotifications });
  };

  const toggleReadStatus = (id: string) => {
    const updated = notifications.map(n => (n.id === id ? { ...n, read: !n.read } : n));
    setNotifications(updated);
    saveNotifications(updated);
  };
  
  const markAllAsRead = () => {
    const updated = notifications.map(n => ({...n, read: true}));
    setNotifications(updated);
    saveNotifications(updated);
  }

  const handleDeleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated);
  };

  const { todays, future, past } = useMemo(() => {
    const sorted = [...notifications].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    const data: { todays: Notification[], future: Notification[], past: Notification[] } = { todays: [], future: [], past: [] };
    sorted.forEach(n => {
        try {
            const date = parseISO(n.date);
            if (isToday(date)) data.todays.push(n);
            else if (isFuture(date)) data.future.push(n);
            else if (isPast(date)) data.past.push(n);
        } catch (e) { console.error("Invalid notification date:", n); }
    });
    data.future.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    return data;
  }, [notifications]);

  if (isLoading) {
      return (
          <AppLayout>
              <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading notifications...</p></div>
          </AppLayout>
      );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <header className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold font-headline">Notifications</h1><p className="text-muted-foreground">Your reminders and alerts.</p></div>
          <Button onClick={markAllAsRead} variant="outline" size="sm"><Check className="mr-2 h-4 w-4" />Mark all as read</Button>
        </header>
        
        <div className="space-y-6">
            <section>
                <h2 className="text-lg font-semibold font-headline mb-2">Today's Reminders</h2>
                <div className="space-y-4">
                    {todays.length > 0 ? (
                        todays.map(notification => <NotificationCard key={notification.id} notification={notification} onToggleRead={toggleReadStatus} onDelete={handleDeleteNotification} />)
                    ) : ( <Card className="text-center py-8 text-muted-foreground border-dashed"><p>You have no reminders for today.</p></Card> )}
                </div>
            </section>
            
            {future.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold font-headline mb-2 mt-6">Upcoming Reminders</h2>
                    <div className="space-y-4">{future.map(notification => <NotificationCard key={notification.id} notification={notification} onToggleRead={toggleReadStatus} onDelete={handleDeleteNotification} />)}</div>
                </section>
            )}

            {past.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold font-headline mb-2 mt-6">Past Reminders</h2>
                    <div className="space-y-4">{past.map(notification => <NotificationCard key={notification.id} notification={notification} onToggleRead={toggleReadStatus} onDelete={handleDeleteNotification} />)}</div>
                </section>
            )}

            {notifications.length === 0 && (
                <div className="text-center py-16 text-muted-foreground border rounded-lg bg-muted/40">
                  <p>You have no notifications.</p><p className="text-sm">Set reminders from the calendar in the header.</p>
                </div>
            )}
        </div>
      </div>
    </AppLayout>
  );
}
