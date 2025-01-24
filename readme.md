# Skriblerne

A Japanese word-of-the-day web application that displays random Japanese words for drawing practice.

## Overview
The frontend is hosted on GitHub Pages and communicates with a backend API hosted on Vercel. The application features:
- Daily word display
- Random word generator
- Admin interface for word management

## Tech Stack
- HTML/CSS/JavaScript
- GitHub Pages for hosting
- Communicates with Vercel API

## Setup
1. Clone the repository
```bash
git clone https://github.com/henrycmeen/Skriblerne.git
```
2. No build process required, can be served directly from any static file server
## Development
The project uses ES6 modules. To run locally:

1. Use a local server (like Live Server in VS Code)
2. Update config.js with appropriate API URL
## Deployment
The site automatically deploys to GitHub Pages when changes are pushed to the main branch.
Skriblerne/
├── index.html      # Main page
├── admin.html      # Admin interface
├── styles.css      # Global styles
└── js/
    ├── main.js     # Main application logic
    ├── admin.js    # Admin panel logic
    ├── config.js   # Configuration
    └── wordService.js  # Word fetching service
