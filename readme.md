# Skriblerne

Skriblerne is a Norwegian drawing game where players get a new word to draw every day. 

## Project Architecture

The project is split into two main repositories:
1. Main Repository (This repo) - Frontend and Backend Server
2. [Skriblerne-API](https://github.com/henrycmeen/skriblerne-api) - Deployed on Vercel

### Frontend (GitHub Pages)
- Static files hosted on GitHub Pages
- Built with vanilla HTML/CSS/JavaScript using ES6 modules
- Communicates with the backend API via fetch requests
- Features:
  - Daily word challenges
  - Random word generator
  - Admin interface for word management

### Backend (Vercel)
- Node.js/Express server
- MongoDB Atlas integration for data persistence
- RESTful API endpoints:
  - GET /api/word/today - Fetches today's word
  - GET /api/word/random - Gets a random word
  - GET /api/words - Lists all words
  - POST /api/word - Adds a new word

### Database (MongoDB Atlas)
- Cloud-hosted MongoDB database
- Collections:
  - words: Stores the game words with their scheduled dates
- Connection managed through environment variables

## Environment Setup

### Required Environment Variables
```
MONGODB_URI=your_mongodb_connection_string
PORT=3001 (or your preferred port)
```

## Local Development Setup

1. Clone the repository
```bash
git clone https://github.com/henrycmeen/Skriblerne.git
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
- Create a .env file in the root directory
- Add the required environment variables

4. Start the development server
```bash
npm run dev
```

5. For frontend development:
- Use a local server (like Live Server in VS Code)
- Update js/config.js with the appropriate API URL

## Project Structure
```
Skriblerne/
├── index.html          # Main game page
├── admin.html          # Admin interface
├── styles.css          # Global styles
├── server.js           # Express server setup
├── models/
│   └── Word.js         # MongoDB word model
├── scripts/
│   └── initDb.js       # Database initialization
└── js/
    ├── main.js         # Main game logic
    ├── admin.js        # Admin panel logic
    ├── config.js       # Configuration
    └── wordService.js  # API communication
```

## Deployment

### Frontend
- Automatically deploys to GitHub Pages when changes are pushed to the main branch
- Configuration in .github/workflows/

### Backend
- Deployed on Vercel
- Automatically deploys when changes are pushed to the main branch
- Connected to MongoDB Atlas for data persistence

## API Integration

The frontend communicates with the backend through the API endpoints defined in js/config.js. The base URL is configured to point to the Vercel-hosted API in production.

## Database Management

To initialize or reset the database:
```bash
npm run init-db
```

This will populate the database with initial words from ordbank.json.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
