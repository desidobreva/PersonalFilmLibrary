# Personal Film Library (PFL)

A web-based movie library application where users can browse movies, create personal watchlists, mark movies as watched, and share comments with other users.

## Features

### User Authentication
- **User Registration**: Create a new account with email and password
- **Login**: Secure login with persistent session management
- **Logout**: Clear session and return to catalog
- **Protected Pages**: Favorites and Watched lists are only accessible to logged-in users

### Movie Catalog
- **Browse Base Catalog**: Explore a collection of pre-loaded movies
- **Movie Details**: View detailed information including title, genre, runtime, release date, and plot
- **Search**: Find movies by title within the catalog
- **Posters**: Display movie posters from OMDb database or fallback placeholder

### Personal Collections
- **Favorites List**: Mark movies as favorites
- **Watched List**: Track movies you've already watched
- **Add Custom Movies**: Add your own movies with OMDb integration
- **Remove from Collections**: Easily remove movies from favorites or watched lists

### Comments & Interaction
- **Movie Comments**: Leave comments on any movie
- **Cross-User Sharing**: Comments on base movies are visible to all users
- **User-Specific Content**: Comments on custom user movies are unique to each user
- **Comment Management**: Delete your own comments

### Search & Organization
- **Search Filtering**: Filter movies by title in any list
- **Sorting**: Movies are sorted alphabetically by title
- **Clear Lists**: Option to clear all items from Favorites or Watched lists

## Project Structure

```
personal_movie_library/
├── index.html              # Home page
├── catalog.html            # Movie catalog page
├── favorites.html          # Favorites list page
├── watched.html            # Watched list page
├── movie.html              # Movie details page
├── login.html              # User login page
├── register.html           # User registration page
│
├── assets/
│   ├── css/
│   │   └── styles.css      # Main stylesheet
│   ├── data/
│   │   └── movies.json     # Base movie catalog data
│   └── img/
│       └── posters/        # Movie poster images
│
└── js/
    ├── auth-guard.js       # Navigation and page initialization
    ├── catalog.js          # Catalog page logic
    ├── favorites.js        # Favorites page logic
    ├── watched.js          # Watched list page logic
    ├── movie.js            # Movie details page logic
    ├── add-movie.js        # Add custom movie functionality
    ├── header.js           # Header & navigation management
    ├── storage.js          # User authentication & localStorage
    ├── movies.js           # Movie data management (base + user movies)
    ├── notify.js           # Toast notification system
    ├── comments.js         # Comment management
    ├── omdb.js             # OMDb API integration
    ├── utils.js            # Utility functions
    ├── ui-helpers.js       # UI helper functions
    └── login.js            # Login page functionality
    └── register.js         # Registration page functionality
```

## Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Responsive design with CSS Grid and Flexbox
- **JavaScript ES6+**: Modular code with import/export
- **localStorage**: Persistent data storage
- **OMDb API**: Movie data and poster retrieval
- **Fetch API**: Asynchronous HTTP requests

## Data Storage

### localStorage Structure
```javascript
{
  "ft:users": [{ id, email, password }],
  "ft:userMovies": { userId: [movie objects] },
  "ft:favorites": { userId: [movie IDs] },
  "ft:watched": { userId: [movie IDs] },
  "ft:comments": { movieKey: [comment objects] },
  "ft:omdbPoster": { cacheKey: poster URL },
  "ft:omdbDetails": { cacheKey: details }
}
```

### Comment Keys
- **Base Movies**: Using movie ID (shared across all users)
- **User Movies**: Using "title:year" format (unique per movie instance)

## Getting Started

### Prerequisites
- Modern web browser with JavaScript enabled
- (Optional) OMDb API key for enhanced movie data

### Installation
1. Clone or download this repository
2. Open `index.html` in your web browser
3. Create an account or use existing credentials

### Usage

#### First Time
1. Open the application in your browser
2. Click "Account" in the top-right to go to registration
3. Create a new account with email and password
4. Log in with your credentials

#### Browse Movies
1. Visit the **Catalog** page to see available movies
2. Search for movies by title
3. Click "More info" on any movie for details

#### Manage Collections
1. Click "Add to Favorites" to mark a movie as favorite
2. Click "Mark as Watched" to track viewing progress
3. Visit **Favorites** or **Watched** pages to see your collections
4. Remove items with the "Remove" button

#### Add Custom Movies
1. Go to the **Catalog** page
2. Scroll to "Add Your Own Movie" section
3. Enter movie title and year
4. The app will fetch data from OMDb
5. Confirm to add to your library

#### Leave Comments
1. View a movie's details page
2. Scroll to the comments section
3. Type your comment and click "Add Comment"
4. Delete comments with the trash button

## API Integration

### OMDb Database
- **Purpose**: Fetch additional movie data and posters
- **Data Cached**: Poster URLs and movie details
- **Configuration**: Update `OMDB_API_KEY` in `omdb.js` if using API key

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Notes

- **Passwords**: Stored in localStorage (Note: For production, use secure backend authentication)
- **Sessions**: Stored in sessionStorage, cleared on logout
- **Data**: All user data persists in browser's localStorage

## Future Enhancements

- User accounts with backend authentication
- Movie ratings and reviews
- Social sharing features
- Advanced filtering and sorting options
- Movie recommendations based on favorites
- Export/import user data
- Dark mode theme

## Troubleshooting

### Favorites/Watched not showing
- Ensure you're logged in (check header for email display)
- Clear browser cache and refresh page
- Check browser console for errors

### Comments not appearing
- Refresh the page
- Ensure you're viewing the same movie
- Check that comment was successfully added

### OMDb posters not loading
- Verify internet connection
- Check if OMDb API limit reached
- Posters fall back to placeholder

## License

This project is for educational purposes.

## Support

For issues or questions, check the browser console for error messages and ensure:
- JavaScript is enabled
- localStorage is available
- You have an active internet connection
