# Architecture Documentation

## Overview

The Starlink IPv4 CIDR Extractor is built using React, TypeScript, and Tailwind CSS. It follows a component-based architecture with clear separation of concerns.

## Core Components

### Data Layer

- `useStarlinkData` Hook
  - Manages data fetching and caching
  - Handles CORS proxy rotation
  - Implements auto-update functionality
  - Provides data persistence

### UI Components

#### Views
- `MainView`: Primary application interface
- `CSVView`: Plain text view for IP addresses

#### IP Components
- `IPAddressGrid`: Displays IP addresses in a paginated grid
- `IPAddressItem`: Individual IP address display

#### UI Components
- `Tooltip`: Reusable tooltip component
- `PaginationButton`: Pagination controls

#### Feature Components
- `FeatureGrid`: Displays application features
- `TutorialModal`: Help and documentation

## Data Flow

1. Data Fetching
   ```
   useStarlinkData Hook
   ├── Direct Fetch Attempt
   ├── CORS Proxy Rotation
   └── Local Storage Cache
   ```

2. Data Processing
   ```
   CSV Data
   ├── Parse CSV
   ├── Extract IPv4 CIDR
   └── Format & Validate
   ```

3. UI Updates
   ```
   State Changes
   ├── Component Updates
   ├── Animation Triggers
   └── User Feedback
   ```

## State Management

- React's useState for component-level state
- Custom hooks for complex state logic
- Local Storage for persistence
- Prop drilling minimized through component composition

## Error Handling

1. Network Errors
   - Multiple CORS proxy attempts
   - Fallback to cached data
   - User-friendly error messages

2. Data Validation
   - CSV format validation
   - IP address format checking
   - Empty data handling

## Performance Optimizations

1. Data Loading
   - Automatic background updates
   - Efficient data caching
   - Progressive loading

2. UI Performance
   - Virtualized lists for large datasets
   - Optimized animations
   - Lazy loading components

## Security Considerations

1. Data Safety
   - No sensitive data storage
   - Client-side only processing
   - Secure CORS handling

2. User Input
   - Input sanitization
   - Rate limiting
   - Error boundaries

## Future Improvements

1. Technical Enhancements
   - Service Worker implementation
   - WebSocket updates
   - PWA support

2. Feature Additions
   - Additional firewall support
   - Custom IP filtering
   - Advanced search options