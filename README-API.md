# Skriblerne-API

Backend API service for the Skriblerne Norwegian word game application. This API handles word management, daily word challenges, and provides endpoints for the main application.

## API Architecture

### Tech Stack
- Node.js/Express server
- MongoDB Atlas for data persistence
- Deployed on Vercel
- RESTful API design

### API Endpoints

```
GET /api/word/today
- Returns the word scheduled for today
- Response: { word: string, date: string }

GET /api/word/random
- Returns a random word from the database
- Response: { word: string }

GET /api/words
- Lists all words in the database
- Response: [{ word: string, date: string }]

POST /api/word
- Adds a new word to the database
- Request body: { word: string, date: string }
- Response: { message: string, word: object }
```

## Database Schema

### Word Collection
```javascript
{
  word: String,     // The Norwegian word
  date: Date,       // Scheduled date for the word
  createdAt: Date,  // Timestamp of creation
  updatedAt: Date   // Timestamp of last update
}
```

## Environment Setup

### Required Environment Variables
```
MONGODB_URI=your_mongodb_connection_string
PORT=3001 (or your preferred port)
```

## Local Development

1. Clone the repository
```bash
git clone https://github.com/henrycmeen/skriblerne-api.git
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

## Project Structure
```
skriblerne-api/
├── src/
│   ├── controllers/     # Request handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   └── utils/           # Helper functions
├── config/             # Configuration files
├── tests/              # API tests
└── server.js           # Main application file
```

## API Testing

Run the test suite:
```bash
npm test
```

## Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically with each push to main branch

### Manual Deployment
```bash
vercel deploy
```

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 400: Bad Request
- 404: Not Found
- 500: Server Error

Error response format:
```javascript
{
  error: string,
  message: string,
  stack: string (development only)
}
```

## Security

- CORS enabled for the main application domain
- Rate limiting implemented
- Request validation middleware
- Environment variables for sensitive data

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.