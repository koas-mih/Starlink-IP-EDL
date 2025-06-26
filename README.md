# Starlink IPv4 CIDR Extractor

A React application that automatically extracts and formats IPv4 CIDR blocks from Starlink's GeoIP database for use in Palo Alto firewalls.

## Project Structure

```
src/
├── components/         # React components
│   ├── features/      # Feature-related components
│   ├── ip/           # IP address handling components
│   ├── tutorial/     # Tutorial and help components
│   ├── ui/           # Reusable UI components
│   └── views/        # Main view components
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
└── utils/            # Utility functions

config/               # Configuration files
docs/                 # Documentation
tests/                # Test files
```

## Features

- Automatically extracts IPv4 CIDR blocks from Starlink's GeoIP database
- Updates data every 24 hours
- Provides CSV download functionality
- Supports offline access with cached data
- Multiple CORS proxy support for reliable data access
- Clean, user-friendly interface with dark mode
- Responsive design for all screen sizes

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License