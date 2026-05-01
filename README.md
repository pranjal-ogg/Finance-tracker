# FinTrack - Personal Finance Tracker

FinTrack is a full-stack, mobile-friendly personal finance management application. It allows users to track their income and expenses, set monthly budgets, upload receipts, and visualize their financial health through interactive charts.

## 🚀 Features

-   **Interactive Dashboard**: Real-time summary of total income, expenses, and net savings with visual doughnut charts and spending trends.
*   **Transaction Management**: Full CRUD operations for transactions. Supports category-based filtering, date ranges, and pagination.
*   **Receipt Uploads**: Attach image or PDF receipts to any transaction for better record-keeping.
*   **Budgeting System**: Set monthly limits for different expense categories. Features dynamic progress bars that change color as you approach or exceed your limits.
*   **Detailed Reporting**: Generate monthly and annual reports with category-wise breakdowns and budget vs. actual variance analysis.
*   **Multi-Currency Support**: Record transactions in multiple currencies (USD, EUR, INR, etc.) with automatic conversion to your preferred currency (Defaults to **INR**).
*   **Authentication**: Secure Login/Register system using JWT and **Google OAuth 2.0** integration.
*   **Category Management**: Customize your finance tracking with user-defined income and expense categories.

## 🛠️ Technology Stack

-   **Frontend**: Vanilla HTML5, CSS3 (Modern design system), JavaScript (ES6+), Chart.js.
-   **Backend**: Node.js, Express.js.
-   **Database**: PostgreSQL.
-   **Auth**: Passport.js (Google Strategy), JSON Web Tokens (JWT), BcryptJS.
-   **Storage**: Multer for local file uploads (Receipts).
-   **Email**: Nodemailer for welcome emails and budget alerts.

## 📋 Prerequisites

-   [Node.js](https://nodejs.org/) (v16 or higher)
-   [PostgreSQL](https://www.postgresql.org/)
-   A Google Cloud Project (for Google OAuth)

## ⚙️ Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/pranjal-ogg/Finance-tracker.git
    cd Finance-tracker
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Setup the Database**:
    -   Create a new PostgreSQL database.
    -   Run the SQL commands provided in `schema.sql` to create the necessary tables and indexes.

4.  **Configure Environment Variables**:
    Create a `.env` file in the root directory and add the following:
    ```env
    PORT=5001
    DB_USER=your_postgres_user
    DB_PASSWORD=your_postgres_password
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=your_db_name
    JWT_SECRET=your_secret_key
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    FRONTEND_URL=http://localhost:5001/pages/login.html
    ```

5.  **Run the application**:
    ```bash
    # For development (with nodemon)
    npm run dev

    # For production
    npm start
    ```

6.  **Access the app**:
    Open `http://localhost:5001` in your browser.

## 📂 Project Structure

```text
├── config/             # Database and Passport configurations
├── controllers/        # Route controllers (Business logic)
├── middleware/         # Auth and File Upload middlewares
├── public/             # Frontend static files
│   ├── css/            # Stylesheets
│   ├── js/             # Vanilla JS modules
│   └── pages/          # HTML pages
├── routes/             # API route definitions
├── uploads/            # Local storage for receipts
├── utils/              # Helper functions (Currency, Emails, Defaults)
├── schema.sql          # Database schema
└── server.js           # Entry point
```

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---
Developed with ❤️ by [pranjal-ogg](https://github.com/pranjal-ogg)