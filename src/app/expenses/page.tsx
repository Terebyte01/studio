
'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { P_TRANSACTIONS } from '@/lib/placeholder-data';
import type { Transaction } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { format, parseISO, formatISO, startOfMonth } from 'date-fns';
import { Label } from '@/components/ui/label';
import { PiggyBank, Loader2, TrendingUp, TrendingDown, Save, PlusCircle, Trash2, Plane, Shirt, UtensilsCrossed, ShoppingBag, Bolt, HeartPulse, Ticket, MoreHorizontal, Salad, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const TRANSACTION_CATEGORIES = ["Food", "Travel", "Shopping", "Utilities", "Health", "Entertainment", "Income", "Groceries", "Social", "Clothing", "Other"];
const categoryDetails: Record<string, { icon: React.ElementType, color: string }> = {
    'Travel': { icon: Plane, color: 'bg-yellow-100 text-yellow-800' }, 'Clothing': { icon: Shirt, color: 'bg-pink-100 text-pink-800' }, 'Food': { icon: UtensilsCrossed, color: 'bg-rose-100 text-rose-800' }, 'Shopping': { icon: ShoppingBag, color: 'bg-blue-100 text-blue-800' }, 'Utilities': { icon: Bolt, color: 'bg-orange-100 text-orange-800' }, 'Health': { icon: HeartPulse, color: 'bg-red-100 text-red-800' }, 'Entertainment': { icon: Ticket, color: 'bg-purple-100 text-purple-800' }, 'Income': { icon: TrendingUp, color: 'bg-green-100 text-green-800' }, 'Groceries': { icon: Salad, color: 'bg-lime-100 text-lime-800' }, 'Social': { icon: Users, color: 'bg-cyan-100 text-cyan-800' }, 'Other': { icon: MoreHorizontal, color: 'bg-gray-100 text-gray-800' }, 'Transport': { icon: Plane, color: 'bg-yellow-100 text-yellow-800' },
};
const formatCurrency = (amountInCents: number) => `${(amountInCents / 100).toFixed(2)}`;

async function getUserData<T>(userId: string, collection: string, placeholder: T): Promise<T> {
    const docRef = doc(db, 'users', userId, 'data', collection);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return (docSnap.data() as { items: T }).items;
    } else {
        await setUserData(userId, collection, placeholder);
        return placeholder;
    }
}
async function setUserData<T>(userId: string, collection: string, data: T) {
    const docRef = doc(db, 'users', userId, 'data', collection);
    await setDoc(docRef, { items: data });
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState(5000000);
  const [isLoading, setIsLoading] = useState(true);
  const [budgetInput, setBudgetInput] = useState('');

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    
    const unsubTransactions = onSnapshot(doc(db, 'users', user.uid, 'data', 'transactions'), (docSnap) => {
        if (docSnap.exists()) setTransactions((docSnap.data() as { items: Transaction[] }).items);
        else getUserData(user.uid, 'transactions', P_TRANSACTIONS).then(setTransactions);
    });

    const unsubBudget = onSnapshot(doc(db, 'users', user.uid, 'data', 'budget'), (docSnap) => {
        const budget = docSnap.exists() ? (docSnap.data() as { items: number }).items : 5000000;
        setMonthlyBudget(budget);
        setBudgetInput((budget / 100).toFixed(2));
    });
    
    setIsLoading(false);
    return () => { unsubTransactions(); unsubBudget(); };
  }, [user]);

  const { totalIncome, totalExpenses, remainingBudget, budgetProgress, monthlyExpenses } = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const startOfCurrentMonth = startOfMonth(new Date());
    const currentMonthExpenses = transactions.filter(t => t.type === 'expense' && parseISO(t.date) >= startOfCurrentMonth).reduce((sum, t) => sum + t.amount, 0);
    const remaining = monthlyBudget - currentMonthExpenses;
    const progress = monthlyBudget > 0 ? Math.max(0, Math.min(100, (currentMonthExpenses / monthlyBudget) * 100)) : 0;
    return { totalIncome: income, totalExpenses: expenses, remainingBudget: remaining, budgetProgress: progress, monthlyExpenses: currentMonthExpenses };
  }, [transactions, monthlyBudget]);
  
   const groupedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      .reduce((acc, txn) => {
        const dateKey = format(parseISO(txn.date), 'yyyy-MM-dd');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(txn);
        return acc;
      }, {} as Record<string, Transaction[]>);
  }, [transactions]);

  const handleSetBudget = () => {
    if (!user) return;
    const budgetValue = parseFloat(budgetInput);
    if (isNaN(budgetValue) || budgetValue < 0) return;
    const budgetInCents = Math.round(budgetValue * 100);
    setMonthlyBudget(budgetInCents);
    setUserData(user.uid, 'budget', budgetInCents);
  };
  
  const handleDeleteTransaction = (id: string) => {
    if (!user) return;
    const updatedTransactions = transactions.filter(t => t.id !== id);
    setTransactions(updatedTransactions);
    setUserData(user.uid, 'transactions', updatedTransactions);
  };
  
  const handleAddTransaction = (newTxn: Transaction) => {
    if (!user) return;
    const updatedTransactions = [newTxn, ...transactions];
    setTransactions(updatedTransactions);
    setUserData(user.uid, 'transactions', updatedTransactions);
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Loading financial data...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <StatCard title="Total Income" amount={totalIncome} icon={TrendingUp} variant="income" />
            <StatCard title="Total Spent" amount={totalExpenses} icon={TrendingDown} variant="expense" />
            <StatCard title="Monthly Budget" amount={monthlyBudget} icon={PiggyBank} />
            <StatCard title="Remaining" amount={remainingBudget} variant={remainingBudget >= 0 ? 'income' : 'expense'} />
        </div>

        <Card className="dark:bg-[hsl(var(--card-standard))]">
            <CardHeader className="p-3 sm:p-4"><CardTitle className="text-lg">Budget Progress</CardTitle><CardDescription>You've spent {formatCurrency(monthlyExpenses)} of your {formatCurrency(monthlyBudget)} budget.</CardDescription></CardHeader>
            <CardContent className="pt-0 sm:pt-0 pb-2 px-3 sm:px-4"><Progress value={budgetProgress} /><p className="text-right text-sm text-muted-foreground mt-1">{budgetProgress.toFixed(0)}%</p></CardContent>
            <CardFooter className="pt-0 sm:pt-0 p-3 sm:p-4">
                 <div className="w-full space-y-2">
                    <label htmlFor="monthly-budget-input" className="text-sm font-medium">Set Your Monthly Budget:</label>
                    <div className="flex gap-2"><Input id="monthly-budget-input" type="number" placeholder="e.g., 50000.00" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} /><Button onClick={handleSetBudget}><Save className="mr-2 h-4 w-4" />Set Budget</Button></div>
                </div>
            </CardFooter>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4">
                <CardTitle className="text-lg">Recent Transactions</CardTitle>
                <TransactionDialog onSave={handleAddTransaction}><Button><PlusCircle className="mr-2 h-4 w-4" />Add</Button></TransactionDialog>
            </CardHeader>
            <CardContent className="pt-0 sm:pt-0 p-0 sm:p-2">
                 {Object.keys(groupedTransactions).length > 0 ? (
                    <div className="space-y-4">
                        {Object.entries(groupedTransactions).map(([date, txns]) => {
                            const dailyTotal = txns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                            return (
                                <div key={date}>
                                    <div className="flex justify-between items-center text-sm font-medium text-muted-foreground px-2 py-1.5 border-b bg-muted/50 rounded-t-md"><span>{format(parseISO(date), 'dd MMM, EEEE')}</span><span>Expenses: {formatCurrency(dailyTotal)}</span></div>
                                    <ul className="divide-y border-x border-b rounded-b-md">
                                        {txns.map((txn) => {
                                            const { icon: Icon, color } = categoryDetails[txn.category] || categoryDetails['Other'];
                                            return (
                                                <li key={txn.id} className="flex items-center justify-between p-2 hover:bg-muted/50">
                                                    <div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-full flex items-center justify-center ${color}`}><Icon className="h-4 w-4" /></div><p className="font-semibold">{txn.description}</p></div>
                                                    <div className="flex items-center gap-1">
                                                        <span className={`font-bold text-base ${txn.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(txn.amount))}</span>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTransaction(txn.id)}><Trash2 className="h-4 w-4" /></Button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                ) : ( <div className="text-center text-muted-foreground h-24 flex items-center justify-center">No transactions yet.</div> )}
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, amount, icon: Icon, variant }: { title: string, amount: number, icon?: React.ElementType, variant?: 'income' | 'expense' }) {
    const amountColor = variant === 'income' ? 'text-green-600' : variant === 'expense' ? 'text-red-600' : '';
    return (
        <Card className="dark:bg-[hsl(var(--card-standard))]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 sm:p-4"><CardTitle className="text-sm font-medium">{title}</CardTitle>{Icon && <Icon className="h-4 w-4 text-muted-foreground" />}</CardHeader>
            <CardContent className="pt-0 px-3 sm:px-4"><div className={`text-2xl font-bold ${amountColor}`}>{formatCurrency(Math.abs(amount))}</div></CardContent>
        </Card>
    )
}

function TransactionDialog({ children, onSave }: { children: React.ReactNode, onSave: (transaction: Transaction) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [category, setCategory] = useState('Food');
    const [type, setType] = useState<'income' | 'expense'>('expense');

    const handleSave = () => {
        if (!description.trim() || !amount.trim()) return;
        const amountInCents = Math.round(parseFloat(amount) * 100);
        if (isNaN(amountInCents)) return;
        const newTransaction: Transaction = { id: `txn-${Date.now()}`, date: formatISO(new Date(date)), description, category, type, amount: Math.abs(amountInCents) };
        onSave(newTransaction);
        setDescription(''); setAmount(''); setDate(format(new Date(), 'yyyy-MM-dd')); setCategory('Food'); setType('expense'); setIsOpen(false);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="p-4">
                <DialogHeader><DialogTitle>Add New Transaction</DialogTitle><DialogDescription>Enter transaction details. Click save when done.</DialogDescription></DialogHeader>
                <div className="space-y-3 py-4">
                    <div className="space-y-2"><Label htmlFor="date">Date</Label><Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                     <div className="space-y-2"><Label htmlFor="description">Description</Label><Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Morning Coffee" /></div>
                     <div className="space-y-2"><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 150.00" /></div>
                     <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                            <SelectContent>{TRANSACTION_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                         <Select value={type} onValueChange={(value) => setType(value as 'income' | 'expense')}>
                            <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                            <SelectContent><SelectItem value="expense">Expense</SelectItem><SelectItem value="income">Income</SelectItem></SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save Transaction</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
