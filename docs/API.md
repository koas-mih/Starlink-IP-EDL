# API Documentation

## Data Source

The application fetches data from the Starlink GeoIP database:

```
https://geoip.starlinkisp.net/feed.csv
```

## CORS Proxies

The application uses multiple CORS proxies to ensure reliable data access:

1. corsproxy.io
2. proxy.cors.sh
3. api.allorigins.win
4. cors-proxy.htmldriven.com

## Data Format

### Input Format
CSV file containing IP addresses in CIDR notation:
```
network,geoname_id,registered_country_geoname_id,represented_country_geoname_id,is_anonymous_proxy,is_satellite_provider
14.1.64.0/24,2077456,2077456,,0,1
```

### Output Format
Clean list of IPv4 CIDR blocks:
```
14.1.64.0/24
14.1.65.0/24
14.1.66.0/24
```

## Local Storage

The application stores the following data in localStorage:

- `ipAddresses`: Array of extracted IP addresses
- `lastUpdated`: Timestamp of last update
- `csvData`: Raw CSV data
- `formattedCsv`: Formatted IP list
- `autoUpdateEnabled`: Auto-update preference

## Update Intervals

- Full Update: Every 24 hours
- Status Check: Every 15 minutes
- Background Sync: Every 6 hours

## Error Handling

The application implements a robust error handling system:

1. Network Errors
   - Automatic retry with different proxies
   - Fallback to cached data
   - User notification

2. Data Validation
   - CSV format verification
   - IP address validation
   - Empty data detection

## Type Definitions

```typescript
interface IPAddress {
  address: string;
  cidr: number;
}

interface StarlinkData {
  ipAddresses: string[];
  isLoading: boolean;
  error: string;
  lastUpdated: string | null;
  csvData: string | null;
  autoUpdateEnabled: boolean;
}
```