# Search Functionality

## Overview

The search bar has been added to the header of the Tab Stasher dashboard, providing users with a powerful way to find their saved tabs quickly and efficiently.

## Features

### Search Bar Location
- Located in the header of the dashboard
- Responsive design that adapts to different screen sizes
- Maximum width of `lg` (large) to prevent it from taking too much space

### Search Capabilities
The search functionality searches across multiple fields:
- **Title**: Tab titles and page titles
- **Description**: Tab descriptions and page descriptions
- **URL**: Full URLs of saved tabs
- **Tags**: All custom and auto-generated tags
- **Categories**: Both primary and secondary categories

### User Experience Features

#### Keyboard Shortcuts
- **⌘K (Mac) / Ctrl+K (Windows/Linux)**: Focus the search bar
- **Escape**: Clear the search and blur the input

#### Visual Feedback
- **Loading State**: Shows a spinning loader icon while searching
- **Active State**: Search bar gets highlighted when there's a query
- **Clear Button**: X button appears when there's text to clear
- **Results Counter**: Shows how many tabs match the search query

#### Debounced Search
- 300ms debounce to prevent excessive API calls while typing
- Smooth performance even with fast typing

### Search Results

#### Grid View
- Shows filtered tabs in a grid layout
- Maintains the same card design as the main view
- "No results" message when no tabs match the query

#### Categories View
- Filters tabs within each category
- Only shows categories that have matching tabs
- Maintains category grouping and expansion state

#### Results Information
- Displays count of matching results
- Shows the search query that was used
- "Clear search" button to quickly reset the search

## Technical Implementation

### Components
- `SearchBar`: Main search input component with debouncing
- `TabList`: Updated to accept search query and filter results
- `CategoryTabList`: Updated to accept search query and filter results

### State Management
- Search query is managed in the dashboard component
- Results count is tracked and displayed
- Search state is preserved across view mode changes

### Performance
- Debounced search prevents excessive filtering
- Efficient filtering using JavaScript's `includes()` method
- No additional API calls - filtering happens client-side

## Usage

1. **Start Searching**: Click the search bar or press ⌘K/Ctrl+K
2. **Type Query**: Enter any text to search across all tab fields
3. **View Results**: Results update in real-time as you type
4. **Clear Search**: Click the X button or press Escape
5. **Switch Views**: Search works in both Grid and Categories views

## Future Enhancements

Potential improvements for future versions:
- Advanced search filters (date range, category, tags)
- Search history and suggestions
- Full-text search with better relevance scoring
- Search within tab content (if available)
- Export search results
- Saved searches 