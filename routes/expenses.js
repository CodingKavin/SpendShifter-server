import express from "express";
import sql from "../utils/postgres.js";
import { authenticateJWT } from "../utils/authMiddleware.js";
import {
  validateExpense,
  validateExpenseUpdate,
} from "../utils/expenseValidation.js";

const router = express.Router();

router.use(authenticateJWT);

router.get("/summary", async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    const monthNum = Number(month);
    const yearNum = Number(year);

    if (!month || !year || isNaN(monthNum) || isNaN(yearNum)) {
      return res.status(400).json({ error: "Month and Year must be valid" });
    }

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0);

    // Get all expenses for this user that started before the end of the requested month
    const expenses = await sql`
      SELECT id, category, amount, date, recurrence
      FROM expenses
      WHERE user_id = ${userId} AND date <= ${endDate}
    `;

    let total = 0;
    const categoryTotals = {};

    for (const expense of expenses) {
      const expenseDate = new Date(expense.date);
      let occurrences = 0;

      // One-time expenses
      if (!expense.recurrence || expense.recurrence === "none") {
        if (expenseDate >= startDate && expenseDate <= endDate) occurrences = 1;
      }

      // Monthly recurring expenses
      if (expense.recurrence === "monthly") {
        const expenseMonthCount =
          (yearNum - expenseDate.getFullYear()) * 12 +
          (monthNum - 1 - expenseDate.getMonth());
        if (expenseMonthCount >= 0) occurrences = 1;
      }

      // Weekly recurring expenses
      if (expense.recurrence === "weekly") {
        const firstOccurrence =
          expenseDate > startDate ? expenseDate : startDate;
        if (firstOccurrence <= endDate) {
          const diffDays = Math.floor(
            (endDate - firstOccurrence) / (1000 * 60 * 60 * 24),
          );
          occurrences = Math.floor(diffDays / 7) + 1;
        }
      }

      const subtotal = occurrences * Number(expense.amount);

      if (subtotal > 0) {
        total += subtotal;
        categoryTotals[expense.category] =
          (categoryTotals[expense.category] || 0) + subtotal;
      }
    }

    const byCategory = Object.entries(categoryTotals).map(
      ([category, total]) => ({
        category,
        total,
      }),
    );

    res.json({
      month: monthNum,
      year: yearNum,
      total,
      byCategory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error occurred on server" });
  }
});

router
  .route("/")
  .get(async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;

      const expenses =
        await sql`SELECT id, category, amount, date, description, recurrence FROM expenses 
            WHERE user_id = ${req.user.id} 
            ORDER BY date DESC
            LIMIT ${limit} OFFSET ${offset}`;

      const [countResult] = await sql`
            SELECT COUNT(*) AS total
            FROM expenses
            WHERE user_id = ${req.user.id}`;

      const total = parseInt(countResult.total);

      res.json({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        expenses: expenses,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error Occurred on server");
    }
  })
  .post(async (req, res) => {
    try {
      const errors = validateExpense(req.body);
      if (errors) {
        return res.status(400).json({ errors });
      }
      const { category, amount, date, description, recurrence } = req.body;
      const [newExpense] =
        await sql`INSERT INTO expenses(user_id, category, amount, date, description, recurrence, created_at, updated_at)
            VALUES(${req.user.id}, ${category}, ${amount}, ${date}, ${description}, ${recurrence}, NOW(), NOW()) RETURNING *`;
      res.status(201).json(newExpense);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error Occurred on server" });
    }
  });

router
  .route("/:id")
  .get(async (req, res) => {
    try {
      const expenseId = req.params.id;
      const [expense] =
        await sql`SELECT * FROM expenses WHERE id = ${expenseId} AND user_id = ${req.user.id}`;

      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      res.json(expense);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error Occurred on server" });
    }
  })
  .delete(async (req, res) => {
    try {
      const expenseId = req.params.id;
      const result =
        await sql`DELETE FROM expenses WHERE id = ${expenseId} AND user_id = ${req.user.id} RETURNING *`;
      if (result.length === 0) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.status(200).json({ deleted: result[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error Occurred on server" });
    }
  })
  .patch(async (req, res) => {
    try {
      const expenseId = req.params.id;
      const fields = req.body || {};

      const keys = Object.keys(fields);
      if (keys.length === 0) {
        return res
          .status(400)
          .json({ message: "No fields provided for update" });
      }

      const errors = validateExpenseUpdate(fields);
      if (errors) {
        return res.status(400).json({ errors });
      }

      const allowedFields = [
        "category",
        "amount",
        "date",
        "description",
        "recurrence",
      ];

      const validEntries = Object.entries(fields).filter(([key]) =>
        allowedFields.includes(key),
      );

      if (validEntries.length === 0) {
        return res.status(400).json({ message: "No valid fields provided" });
      }

      // Build SET clause safely
      const setParts = validEntries.map(([key], index) => {
        return `"${key}" = $${index + 1}`;
      });

      const values = validEntries.map(([, value]) => value);

      const query = `
            UPDATE expenses
            SET ${setParts.join(", ")}, updated_at = NOW()
            WHERE id = $${values.length + 1}
            AND user_id = $${values.length + 2}
            RETURNING *;
        `;

      const result = await sql.unsafe(query, [
        ...values,
        expenseId,
        req.user.id,
      ]);

      if (result.length === 0) {
        return res.status(404).json({ message: "Expense not found" });
      }

      res.json(result[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error occurred on server" });
    }
  });

export default router;
