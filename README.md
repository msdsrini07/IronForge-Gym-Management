
# IronForge — Gym Management System

A full-stack gym management web application that helps administrators manage gym members, memberships, trainers, workout plans, and class bookings. Customers can view their membership details and manage their workout bookings through a dedicated dashboard.

## Features

### Admin Dashboard
- View and manage customer bookings.
- Confirm and cancel bookings.
- View and manage member accounts.
- Assign membership plans to customers.
- Prevent duplicate active membership assignments.
- Renew memberships while preserving membership history.
- Manage trainers and membership plans.
- View membership status and expiry information.

### Customer Dashboard
- View profile information.
- View current membership details and expiry dates.
- Browse available trainers.
- Book workout classes.
- View existing bookings and their status.
- Cancel eligible bookings.
- Log out securely from the dashboard.

### Membership Management
- Validate membership and plan details.
- Prevent renewal of cancelled memberships.
- Prevent duplicate active memberships during renewal.
- Preserve previous membership records.
- Use MongoDB transactions to keep renewal changes consistent.

## Technology Stack

**Frontend**
- HTML5
- CSS3
- JavaScript

**Backend**
- Node.js
- Express.js
- REST APIs
- JWT-based authentication and role-based authorization

**Database**
- MongoDB Atlas
- Mongoose

## Project Structure

```text
pro-gym/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env
├── disicipline.html
├── README.md
└── Other frontend files
```

*Update this structure if your actual folder and file names are different.*

## Setup and Installation

### 1. Install prerequisites

- Install Node.js.
- Create or configure a MongoDB Atlas database.
- Open the project in Visual Studio Code.

### 2. Install backend dependencies

Open a terminal inside the backend folder and run:

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend` folder.

Add your own MongoDB connection string and a strong JWT secret:

```env
MONGO_URI=YOUR_MONGODB_CONNECTION_STRING
PORT=5000
JWT_SECRET=YOUR_PRIVATE_RANDOM_SECRET
```

Replace the placeholders with your own values. Never commit `.env` to a public repository or share database credentials.

### 4. Start the backend

From the backend folder, run:

```bash
npm start
```

The backend should connect to MongoDB and start on:

```text
http://localhost:5000
```

### 5. Open the frontend

Open the project's main frontend page, `disicipline.html`, using your configured local development server.

Ensure the frontend API URL matches the backend address.

## Testing

The following flows have been manually checked during development:

- Admin booking confirmation and customer-side status synchronization.
- Customer booking cancellation and admin-side status synchronization.
- Membership details consistency between admin and customer dashboards.
- Duplicate membership assignment prevention.
- Membership renewal and previous-record preservation.
- Admin and customer logout navigation.
- Responsive dashboard layout.

## Security Notes

- Keep database credentials and JWT secrets private.
- Store private environment variables in `.env`.
- Use role-based authorization for administrative endpoints.
- Do not commit passwords, private keys, access tokens, or other secrets.

## Future Improvements

- Automated backend and integration tests.
- Deployment with secure production environment variables.
- Improved monitoring and error logging.
- Additional customer membership and payment workflows.

## Author

**Srinivasan V**  
B.Tech Information Technology

---

*IronForge — Train Hard. Stay Strong.*
