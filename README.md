# Production Schedule Application

A MERN stack application for managing and visualizing manufacturing production schedules.

## Features

- Generate production schedule directly from database
- Filter products by location/warehouse
- Search functionality

## Tech Stack

- **Frontend**: React, React Router, Axios
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (previously used JSON file)

## Installation

### Prerequisites

- Node.js (v14+)
- PostgreSQL

### Setup

1. Clone the repository
```
git clone [repository-url]
cd production_schedule
```

2. Install dependencies for both server and client
```
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

3. Set up environment variables:
```
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your PostgreSQL credentials
```

4. Start the development servers
```
# Start both server and client concurrently
npm run dev

# Or start them separately
npm run server
npm run client
```

## Database Setup

The application requires a PostgreSQL database with the schema defined in `db_schema.json`. You'll need to connect to your existing production database that contains MRP (Manufacturing Resource Planning) data.

## Project Structure

```
production_schedule/
│
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── context/         # React context
│   │   ├── utils/           # Utility functions
│   │   └── assets/          # Static assets
│   │
│   └── package.json
│
├── server/                 # Express backend
│   ├── config/             # Server configuration
│   ├── controllers/        # Route controllers 
│   ├── models/             # Database models and queries
│   ├── routes/             # API routes
│   ├── server.js           # Main server file
│   └── package.json
│
├── db_schema.json         # Database schema reference
├── backorder.json         # Example JSON data file
└── .env.example           # Example environment configuration
```

## API Endpoints

- `GET /api/production/schedule`: Fetches production schedule data based on the database query
- `GET /api/production/generate-file`: Generates a JSON file with the production schedule data
- `GET /api/production-data`: Legacy endpoint that serves the static backorder.json file

## Data Structure

The application generates a JSON with the following structure:

- First level: Workstations/Warehouses
- Second level: Products with properties (quantity, unit of measure, classifications)
- Inner levels: Sales orders with customer information, priorities, dates, etc.
- Additional levels for product attributes

## Query Structure

The main SQL query is located in `server/models/production_query.js` and follows these criteria:
- Includes only production orders with state NOT IN ('cancel', 'transfer', 'draft')
- Links manufacturing orders with sales orders through the intermediate relation table
- Formats data to match the structure in the example `backorder.json` file

## License

MIT