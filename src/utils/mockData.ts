import { Expense, Budget } from "../types/expense";

export const mockExpenses: Expense[] = [
  {
    id: "1",
    amount: 45.67,
    description: "Whole Foods grocery shopping",
    category: "Groceries",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    id: "2",
    amount: 12.50,
    description: "Starbucks coffee",
    category: "Food & Dining",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
  {
    id: "3",
    amount: 89.99,
    description: "Nike running shoes",
    category: "Shopping",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  },
  {
    id: "4",
    amount: 25.00,
    description: "Uber ride to airport",
    category: "Transportation",
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
  },
  {
    id: "5",
    amount: 156.78,
    description: "Electric bill payment",
    category: "Bills & Utilities",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
  },
  {
    id: "6",
    amount: 32.45,
    description: "Movie tickets",
    category: "Entertainment",
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
  },
  {
    id: "7",
    amount: 67.89,
    description: "Gas station fill-up",
    category: "Transportation",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  },
  {
    id: "8",
    amount: 23.99,
    description: "Netflix subscription",
    category: "Entertainment",
    date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
  },
  {
    id: "9",
    amount: 78.50,
    description: "Dinner at Italian restaurant",
    category: "Food & Dining",
    date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), // 9 days ago
  },
  {
    id: "10",
    amount: 15.99,
    description: "Spotify Premium",
    category: "Entertainment",
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
  },
];

export const mockBudgets: Budget[] = [
  {
    category: "Groceries",
    limit: 400,
    spent: 0,
    period: "monthly",
  },
  {
    category: "Food & Dining",
    limit: 300,
    spent: 0,
    period: "monthly",
  },
  {
    category: "Transportation",
    limit: 200,
    spent: 0,
    period: "monthly",
  },
  {
    category: "Entertainment",
    limit: 150,
    spent: 0,
    period: "monthly",
  },
  {
    category: "Shopping",
    limit: 250,
    spent: 0,
    period: "monthly",
  },
];