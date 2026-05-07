# UCash Backend — MySQL Edition

Node.js + Express + MySQL (mysql2) + JWT + bcrypt

---

## Project Structure

```
ucash-mysql/
├── package.json
├── .env.example
└── src/
    ├── server.js                        ← Entry point (helmet, rate-limit, routes)
    ├── api.js                           ← Copy to frontend/src/
    ├── config/
    │   ├── db.js                        ← mysql2 pool + startup validation
    │   ├── migrate.js                   ← Creates all tables
    │   └── seed.js                      ← Inserts demo data
    ├── middleware/
    │   └── auth.middleware.js           ← protect() + authorize()
    ├── controllers/
    │   ├── auth.controller.js           ← register (student-only), login, me, change-password
    │   ├── wallet.controller.js         ← balance, topup, withdraw, pay fee
    │   ├── transaction.controller.js    ← list, detail, receipt, verify, reject
    │   ├── admin.controller.js          ← stats, student CRUD
    │   └── paymentMethod.controller.js  ← link/remove/set-primary
    └── routes/
        ├── auth.routes.js
        ├── user.routes.js
        ├── wallet.routes.js
        ├── transaction.routes.js
        ├── paymentMethod.routes.js
        └── admin.routes.js
```

---

## Setup (4 steps)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` with your MySQL credentials:
```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ucash
JWT_SECRET=some_long_random_string_at_least_32_chars
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

### 3. Create database + tables
First create the database in MySQL:
```sql
CREATE DATABASE ucash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Then run migrations:
```bash
npm run migrate
```

### 4. Seed demo data (optional)
```bash
npm run seed
```

### 5. Start the server
```bash
npm run dev     # development (nodemon)
npm start       # production
```
Server runs at: `http://localhost:5000`

---

## Demo Credentials (after seeding)

| Role    | Email               | Password   |
|---------|---------------------|------------|
| Student | juan@uc.edu.ph      | student123 |
| Student | maria@uc.edu.ph     | student123 |
| Admin   | admin@uc.edu.ph     | admin123   |

---

## MySQL Schema

```sql
-- users
id, name, email (UNIQUE), phone, password (hashed),
role ENUM('student','admin'), student_id (UNIQUE),
course, year, status ENUM('active','suspended'),
created_at, updated_at

-- wallets
id, user_id (FK → users, CASCADE DELETE), balance DECIMAL(12,2)

-- transactions
id, transaction_code (UNIQUE), user_id (FK),
amount, type ENUM('payment','topup','withdrawal'),
category ENUM('tuition','lab','library','misc','gcash','maya','paymaya','bdo','metrobank','other'),
description, status ENUM('pending','verified','rejected'),
rejection_reason, reference_number,
verified_by (FK → users), verified_at, created_at

-- fees
id, user_id (FK), type ENUM('tuition','lab','library','misc'),
label, total_amount, paid_amount, semester, due_date, created_at

-- payment_methods
id, user_id (FK), type ENUM('gcash','maya','paymaya','bdo','metrobank'),
account_number, account_name, is_primary,
UNIQUE KEY (user_id, type)
```

---

## API Reference

### Auth
| Method | Endpoint                      | Auth     | Notes                       |
|--------|-------------------------------|----------|-----------------------------|
| POST   | `/api/auth/register`          | Public   | Students only, no role field |
| POST   | `/api/auth/login`             | Public   | Rate-limited (20/15min)     |
| GET    | `/api/auth/me`                | Required | Returns user + balance      |
| PUT    | `/api/auth/change-password`   | Required |                             |

### Wallet (Student)
| Method | Endpoint              | Body                                  |
|--------|-----------------------|---------------------------------------|
| GET    | `/api/wallet/balance` | —                                     |
| POST   | `/api/wallet/topup`   | `amount, category, referenceNumber`   |
| POST   | `/api/wallet/withdraw`| `amount, category`                    |
| POST   | `/api/wallet/pay`     | `feeId, amount`                       |

### Transactions
| Method | Endpoint                          | Access  |
|--------|-----------------------------------|---------|
| GET    | `/api/transactions/my`            | Student |
| GET    | `/api/transactions/:id`           | Student |
| GET    | `/api/transactions/receipt/:id`   | Student |
| GET    | `/api/transactions/admin/all`     | Admin   |
| PUT    | `/api/transactions/:id/verify`    | Admin   |
| PUT    | `/api/transactions/:id/reject`    | Admin   |

### Admin
| Method | Endpoint                             | Body                  |
|--------|--------------------------------------|-----------------------|
| GET    | `/api/admin/stats`                   | —                     |
| GET    | `/api/admin/students`                | `?search&status&sortBy&page&limit` |
| POST   | `/api/admin/students`                | `name, email, phone, password, course, year` |
| PUT    | `/api/admin/students/:id`            | fields to update      |
| PUT    | `/api/admin/students/:id/suspend`    | —                     |
| DELETE | `/api/admin/students/:id`            | —                     |

---

## Security Fixes Applied

| # | Issue (original MongoDB version) | Fix |
|---|----------------------------------|-----|
| 1 | `role` accepted from request body — anyone could self-register as admin | Role **hardcoded to `'student'`** in register controller, never read from body |
| 2 | Raw `error.message` returned in every 500 response | Generic messages to client; real errors only logged server-side |
| 3 | No JWT secret validation at startup | Server **exits** if `JWT_SECRET` is missing or under 32 characters |
| 4 | No input validation on register | Email format, min password (6 chars), min name (2 chars) all enforced |
| 5 | Email enumeration (different message for wrong user vs wrong password) | Both cases return identical `"Invalid email or password."` |
| 6 | Unclamped `page`/`limit` params — could request huge result sets | `page ≥ 1`, `limit` clamped to max 100 |
| 7 | Search values concatenated into query strings (SQL injection risk) | All values use **parameterised placeholders** (`?`) via mysql2 |
| 8 | Sort column interpolated directly into SQL | **Whitelisted** via a `sortMap` object — unknown values fall back safely |
| 9 | Race condition on wallet balance (double-spend on concurrent requests) | `SELECT ... FOR UPDATE` row-lock inside `beginTransaction` on all balance mutations |
| 10 | No security headers | `helmet` added to every response |
| 11 | No brute-force protection on login | `express-rate-limit`: 20 attempts per 15 min on `/auth/login` and `/auth/register` |
| 12 | No request body size limit | `express.json({ limit: "10kb" })` rejects oversized payloads |
| 13 | FK cleanup on delete done manually (error-prone) | MySQL `ON DELETE CASCADE` handles cleanup automatically |
| 14 | bcrypt cost factor was 10 | Increased to **12** for stronger hashing |

---

## Connecting the Frontend

1. Copy `src/api.js` into your React project's `src/` folder
2. Add to your frontend `.env`:
```
VITE_API_URL=http://localhost:5000/api
```
3. After login, the token is stored in `localStorage` and sent automatically on every request

```js
// Example usage in a component
import { authAPI, walletAPI } from "./api";

// Login
const { token, user } = await authAPI.login(email, password);
localStorage.setItem("ucash_token", token);

// Get balance
const { balance } = await walletAPI.getBalance();
```
