-- Add category column to transactions table for expense categorization
-- NULL for pemasukan, required for pengeluaran
ALTER TABLE transactions ADD COLUMN category TEXT DEFAULT NULL;
