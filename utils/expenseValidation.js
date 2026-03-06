import { z } from "zod";

const expenseSchema = z.object({
    category: z.enum(["Housing", "Food", "Transportation", "Entertainment", "Other", "Lifestyle"]),
    amount: z.number().positive(),
    date: z.string().refine(d => !isNaN(Date.parse(d)), "Invalid date"),
    description: z.string().min(1),
    recurrence: z.enum(["none", "weekly", "monthly"]).optional(),
});

const budgetSchema = z.object({
    user_id: z.string().min(1),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000),
    amount: z.number().nonnegative()
})

const expenseUpdateSchema = expenseSchema.partial();

export function validateExpense(data) {
    const parsed = expenseSchema.safeParse(data);
    if (!parsed.success) {
        return parsed.error.errors;
    }
    return null;
}

export function validateExpenseUpdate(data) {
    const parsed = expenseUpdateSchema.safeParse(data);
    if (!parsed.success) return parsed.error.errors;
    return null;
}

export function validateBudget(data) {
    const parsed = budgetSchema.safeParse(data);
    if (!parsed.success) return parsed.error.errors;
    return null;
}