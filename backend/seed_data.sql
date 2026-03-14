-- ============================================================
-- SEED DATA FOR DEV MERCHANT
-- Merchant ID: a0000000-0000-0000-0000-000000000001
-- ============================================================

-- -------------------------------------------------------
-- 1. CONTACTS (5 beneficiaries)
-- -------------------------------------------------------
INSERT INTO contacts (id, merchant_id, name, phone, upi_id, bank_account, ifsc, is_verified) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Ramesh Sharma', '9811012345', 'ramesh.sharma@oksbi', '10012345678', 'SBIN0001234', true),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Sunita Devi', '9899876543', 'sunita.devi@paytm', '20034567890', 'PUNB0012300', true),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Arjun Patel', '9723456789', 'arjun.patel@okicici', '30045678901', 'ICIC0000456', true),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Lakshmi Iyer', '9445678901', 'lakshmi.iyer@okaxis', NULL, NULL, false),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Mohammed Farooq', '9556789012', 'farooq.md@ybl', '40056789012', 'HDFC0002345', true);

-- -------------------------------------------------------
-- 2. PRODUCTS (8 kirana store items)
-- -------------------------------------------------------
INSERT INTO products (id, merchant_id, name, description, price, stock, sku, is_active) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Basmati Rice 5kg', 'Premium aged basmati rice', 425.00, 50, 'RICE-BAS-5K', true),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Toor Dal 1kg', 'Unpolished toor dal', 165.00, 80, 'DAL-TOOR-1K', true),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Saffola Gold Oil 1L', 'Refined cooking oil blend', 189.00, 40, 'OIL-SAF-1L', true),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Sugar 1kg', 'Sulphurless white sugar', 48.00, 100, 'SUG-WHT-1K', true),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Aashirvaad Atta 10kg', 'Whole wheat flour', 520.00, 35, 'ATTA-ASH-10K', true),
  ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Amul Butter 500g', 'Pasteurised butter', 285.00, 25, 'DAIRY-BUT-500', true),
  ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Red Label Tea 500g', 'Brooke Bond premium tea', 265.00, 60, 'TEA-RL-500', true),
  ('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Maggi Noodles Pack (12)', 'Instant noodles family pack', 168.00, 45, 'SNACK-MAG-12', true);

-- -------------------------------------------------------
-- 3. EMPLOYEES (4 employees)
-- -------------------------------------------------------
INSERT INTO employees (id, merchant_id, name, phone, upi_id, bank_account, ifsc, salary, pay_day, department, designation, joining_date, is_active) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Vikram Singh', '9876001001', 'vikram.singh@oksbi', '50012345678', 'SBIN0005678', 18000.00, 1, 'Operations', 'Store Manager', '2024-06-15', true),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Priya Kumari', '9876001002', 'priya.kumari@paytm', '50023456789', 'PUNB0009876', 12000.00, 1, 'Sales', 'Counter Staff', '2025-01-10', true),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Raju Yadav', '9876001003', 'raju.yadav@ybl', '50034567890', 'HDFC0003456', 10000.00, 1, 'Delivery', 'Delivery Boy', '2025-04-01', true),
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Deepa Nair', '9876001004', 'deepa.nair@okaxis', '50045678901', 'UTIB0004567', 15000.00, 1, 'Accounts', 'Accountant', '2024-11-20', true);

-- -------------------------------------------------------
-- 4. TRANSACTIONS (18 regular + 3 salary payout = 21 total)
-- -------------------------------------------------------
INSERT INTO transactions (id, merchant_id, type, amount, status, reference_id, counterparty_name, counterparty_upi, counterparty_phone, description, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'payment_received', 1250.00, 'completed', 'TXN20260304001', 'Rajesh Kumar', 'rajesh.k@okhdfc', '9810001001', 'Monthly grocery bill', NOW() - INTERVAL '7 days' + INTERVAL '10 hours'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'payout', 8500.00, 'completed', 'TXN20260304002', 'Metro Wholesale', 'metrowholesale@oksbi', '9810002002', 'Stock purchase - rice and dal', NOW() - INTERVAL '7 days' + INTERVAL '14 hours'),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'payment_received', 780.00, 'completed', 'TXN20260305001', 'Meera Reddy', 'meera.r@paytm', '9810003003', 'Atta, oil and sugar', NOW() - INTERVAL '6 days' + INTERVAL '9 hours'),
  ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'payment_received', 345.00, 'completed', 'TXN20260305002', 'Amit Verma', 'amit.verma@ybl', '9810004004', 'Tea and biscuits', NOW() - INTERVAL '6 days' + INTERVAL '11 hours'),
  ('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'payout', 2200.00, 'completed', 'TXN20260305003', 'Hindustan Traders', 'htraders@oksbi', '9810005005', 'Maggi and snacks restock', NOW() - INTERVAL '6 days' + INTERVAL '16 hours'),
  ('f0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'payment_received', 2100.00, 'completed', 'TXN20260306001', 'Sanjay Gupta', 'sanjay.g@okicici', '9810006006', 'Bulk rice order', NOW() - INTERVAL '5 days' + INTERVAL '10 hours'),
  ('f0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'payment_received', 456.00, 'completed', 'TXN20260306002', 'Kavita Joshi', 'kavita.j@paytm', '9810007007', 'Daily essentials', NOW() - INTERVAL '5 days' + INTERVAL '15 hours'),
  ('f0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'payment_received', 890.00, 'completed', 'TXN20260307001', 'Pooja Mehta', 'pooja.m@okaxis', '9810008008', 'Butter, tea and atta', NOW() - INTERVAL '4 days' + INTERVAL '9 hours'),
  ('f0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'payout', 5400.00, 'completed', 'TXN20260307002', 'Aggarwal Distributors', 'aggarwal.dist@oksbi', '9810009009', 'Weekly stock purchase', NOW() - INTERVAL '4 days' + INTERVAL '12 hours'),
  ('f0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'payment_received', 1680.00, 'completed', 'TXN20260307003', 'Neeraj Pandey', 'neeraj.p@ybl', '9810010010', 'Party supplies order', NOW() - INTERVAL '4 days' + INTERVAL '17 hours'),
  ('f0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'payment_received', 520.00, 'completed', 'TXN20260308001', 'Ananya Singh', 'ananya.s@okhdfc', '9810011011', 'Dal and rice', NOW() - INTERVAL '3 days' + INTERVAL '10 hours'),
  ('f0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'payment_received', 235.00, 'completed', 'TXN20260308002', 'Rohit Sharma', 'rohit.sh@paytm', '9810012012', 'Maggi and butter', NOW() - INTERVAL '3 days' + INTERVAL '14 hours'),
  ('f0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'payment_received', 3200.00, 'completed', 'TXN20260309001', 'Suresh Babu', 'suresh.b@oksbi', '9810013013', 'Monthly stock for hostel', NOW() - INTERVAL '2 days' + INTERVAL '8 hours'),
  ('f0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'payout', 1800.00, 'completed', 'TXN20260309002', 'Sharma Packers', 'sharma.pack@ybl', '9810014014', 'Packaging materials', NOW() - INTERVAL '2 days' + INTERVAL '13 hours'),
  ('f0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'payment_received', 675.00, 'completed', 'TXN20260309003', 'Fatima Begum', 'fatima.b@okicici', '9810015015', 'Oil and sugar', NOW() - INTERVAL '2 days' + INTERVAL '16 hours'),
  ('f0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001', 'payment_received', 1450.00, 'completed', 'TXN20260310001', 'Dinesh Choudhary', 'dinesh.c@paytm', '9810016016', 'Atta, rice, dal, tea', NOW() - INTERVAL '1 day' + INTERVAL '10 hours'),
  ('f0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000001', 'payment_received', 920.00, 'completed', 'TXN20260310002', 'Geeta Rani', 'geeta.r@ybl', '9810017017', 'Weekly groceries', NOW() - INTERVAL '1 day' + INTERVAL '15 hours'),
  ('f0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000001', 'payment_received', 560.00, 'pending', 'TXN20260311001', 'Kiran Bala', 'kiran.b@okaxis', '9810018018', 'Cooking oil and noodles', NOW() - INTERVAL '1 hour');

-- Salary payout transactions (needed for salary_payments FK)
INSERT INTO transactions (id, merchant_id, type, amount, status, reference_id, counterparty_name, counterparty_upi, description, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000001', 'payout', 18000.00, 'completed', 'SAL202602-001', 'Vikram Singh', 'vikram.singh@oksbi', 'Salary - Feb 2026', NOW() - INTERVAL '10 days'),
  ('f0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001', 'payout', 12000.00, 'completed', 'SAL202602-002', 'Priya Kumari', 'priya.kumari@paytm', 'Salary - Feb 2026', NOW() - INTERVAL '10 days'),
  ('f0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000001', 'payout', 10000.00, 'completed', 'SAL202602-003', 'Raju Yadav', 'raju.yadav@ybl', 'Salary - Feb 2026', NOW() - INTERVAL '10 days');

-- -------------------------------------------------------
-- 5. PAYMENT LINKS (4 links)
-- -------------------------------------------------------
INSERT INTO payment_links (id, merchant_id, amount, description, short_code, short_url, status, payment_count, total_collected, expires_at, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 500.00, 'Monthly maintenance - March', 'PAY-MTN-MAR26', 'https://nano.rzp.io/PAY-MTN-MAR26', 'active', 0, 0.00, NOW() + INTERVAL '15 days', NOW() - INTERVAL '2 days'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 1200.00, 'Bulk order - Rice 10kg x 2', 'PAY-BULK-R10', 'https://nano.rzp.io/PAY-BULK-R10', 'completed', 1, 1200.00, NOW() + INTERVAL '7 days', NOW() - INTERVAL '5 days'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', NULL, 'Donation / Tips', 'PAY-TIP-NANO', 'https://nano.rzp.io/PAY-TIP-NANO', 'active', 3, 350.00, NULL, NOW() - INTERVAL '14 days'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 2500.00, 'Catering order - Sharma family', 'PAY-CAT-SH01', 'https://nano.rzp.io/PAY-CAT-SH01', 'expired', 0, 0.00, NOW() - INTERVAL '1 day', NOW() - INTERVAL '8 days');

-- -------------------------------------------------------
-- 6. CREDIT ENTRIES (5 khaata/udhaar entries)
-- -------------------------------------------------------
INSERT INTO credit_entries (id, merchant_id, customer_name, customer_phone, amount, direction, description, item, is_settled, settled_at, source, created_at) VALUES
  (uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000001', 'Ramesh Sharma', '9811012345', 850.00, 'given', 'Monthly udhaar - groceries', 'Rice 5kg, Dal 2kg, Oil 1L', false, NULL, 'manual', NOW() - INTERVAL '6 days'),
  (uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000001', 'Kamla Bai', '9876112233', 320.00, 'given', 'Weekly essentials on credit', 'Sugar 2kg, Tea 500g', false, NULL, 'manual', NOW() - INTERVAL '4 days'),
  (uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000001', 'Suresh Yadav', '9876223344', 1500.00, 'given', 'Bulk purchase udhaar', 'Atta 10kg, Rice 5kg, Oil 2L', false, NULL, 'voice', NOW() - INTERVAL '3 days'),
  (uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000001', 'Geeta Rani', '9810017017', 450.00, 'given', 'Pending from last week', 'Butter, Maggi, Tea', true, NOW() - INTERVAL '1 day', 'manual', NOW() - INTERVAL '5 days'),
  (uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000001', 'Arjun Patel', '9723456789', 2000.00, 'taken', 'Borrowed from supplier Arjun', NULL, false, NULL, 'manual', NOW() - INTERVAL '2 days');

-- -------------------------------------------------------
-- 7. ORDERS (3 orders)
-- -------------------------------------------------------
INSERT INTO orders (id, merchant_id, customer_phone, customer_name, items, subtotal, tax, total, status, payment_status, notes, created_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '9810006006', 'Sanjay Gupta',
   '[{"name": "Basmati Rice 5kg", "qty": 2, "price": 425.00}, {"name": "Toor Dal 1kg", "qty": 3, "price": 165.00}, {"name": "Saffola Gold Oil 1L", "qty": 2, "price": 189.00}]',
   1723.00, 0.00, 1723.00, 'delivered', 'paid', 'Delivered to home address', NOW() - INTERVAL '5 days'),
  ('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '9810013013', 'Suresh Babu',
   '[{"name": "Aashirvaad Atta 10kg", "qty": 3, "price": 520.00}, {"name": "Sugar 1kg", "qty": 5, "price": 48.00}, {"name": "Red Label Tea 500g", "qty": 4, "price": 265.00}]',
   2860.00, 0.00, 2860.00, 'confirmed', 'paid', 'Hostel monthly supply', NOW() - INTERVAL '2 days'),
  ('a1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '9810018018', 'Kiran Bala',
   '[{"name": "Maggi Noodles Pack (12)", "qty": 2, "price": 168.00}, {"name": "Amul Butter 500g", "qty": 1, "price": 285.00}]',
   621.00, 0.00, 621.00, 'pending', 'unpaid', 'Waiting for payment confirmation', NOW() - INTERVAL '1 hour');

-- -------------------------------------------------------
-- 8. SALARY PAYMENTS (3 payments for Feb 2026)
-- -------------------------------------------------------
INSERT INTO salary_payments (employee_id, merchant_id, amount, month, year, status, transaction_id, paid_at, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 18000.00, 2, 2026, 'paid', 'f0000000-0000-0000-0000-000000000019', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 12000.00, 2, 2026, 'paid', 'f0000000-0000-0000-0000-000000000020', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 10000.00, 2, 2026, 'paid', 'f0000000-0000-0000-0000-000000000021', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days');
