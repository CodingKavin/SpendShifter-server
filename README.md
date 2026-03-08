# SpendShifter - Backend

This is the **backend** of the SpendShifter application. It handles user authentication, expense management, and email notifications.

# url: https://spendshifter.com

Built with **Node.js**, **Express**, **PostgreSQL**, and integrates with **Supabase/Resend** for emails.

## Features

- User authentication with JWT
- Expense CRUD operations
- Budget validation
- Recurring expense support
- CORS setup for frontend integration

## Tech Stack

- **Node.js** and **Express** for the server
- **PostgreSQL** for database
- **Supabase** or **Resend** for email services
- **JWT** for authentication

**Project Structure**

├── routes/ #expense and budgets routes
├── utils/ # validation, helpers
└── server.js # Main server file

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn
- PostgreSQL database

### Installation

```bash
git clone https://github.com/CodingKavin/SpendShifter-server.git
cd SpendShifter-server
npm install
```

### Related

- frontend repo: https://github.com/CodingKavin/SpendShifter-client.git
