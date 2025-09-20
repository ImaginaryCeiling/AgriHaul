# AgriHaul REST API v1.0

A comprehensive REST API for the AgriHaul agricultural transportation marketplace. This API allows external services to integrate with the platform for user management, job postings, ratings, and analytics.

## 🚀 Quick Start

### Base URL
```
https://yourapp.com/api/v1
```

### Authentication
The API supports two authentication methods:

#### 1. API Key (Admin Access)
```bash
curl -H "x-api-key: YOUR_SERVICE_ROLE_KEY" \
     https://yourapp.com/api/v1/stats
```

#### 2. Bearer Token (User Access)
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://yourapp.com/api/v1/jobs
```

## 📊 API Overview

| Endpoint | Description | Auth Required |
|----------|-------------|---------------|
| `GET /api/v1` | API information and endpoints | No |
| `GET /api/v1/docs` | OpenAPI specification | No |
| `GET /api/docs` | Interactive API explorer | No |

## 👥 Users API

### List Users
```bash
GET /api/v1/users
```

**Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 20, max: 100)
- `role` (string): Filter by role (`farmer` or `carrier`)
- `trust_score.gte` (int): Minimum trust score
- `trust_score.lte` (int): Maximum trust score

**Example:**
```bash
curl -H "x-api-key: YOUR_KEY" \
     "https://yourapp.com/api/v1/users?role=farmer&limit=5"
```

### Get User by ID
```bash
GET /api/v1/users/{id}
```

### Create User (Admin Only)
```bash
POST /api/v1/users
```

**Body:**
```json
{
  "email": "farmer@example.com",
  "password": "securepassword",
  "role": "farmer",
  "name": "John Doe",
  "phone": "+1-555-0123",
  "crops": ["corn", "soybeans"]
}
```

### Update User
```bash
PUT /api/v1/users/{id}
```

**Body:**
```json
{
  "name": "Updated Name",
  "phone": "+1-555-9999",
  "equipment": ["flatbed", "refrigerated"]
}
```

## 🚚 Jobs API

### List Jobs
```bash
GET /api/v1/jobs
```

**Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by status (`open`, `accepted`, `in_transit`, `delivered`, `paid`, `cancelled`)
- `crop`: Filter by crop type (partial match)
- `farmer_id`: Filter by farmer ID
- `carrier_id`: Filter by carrier ID
- `is_perishable`: Filter perishable loads (`true` or `false`)
- `payout_min`, `payout_max`: Filter by payout range (in dollars)
- `load_size_min`, `load_size_max`: Filter by load size range

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://yourapp.com/api/v1/jobs?status=open&crop=corn&limit=10"
```

### Get Job Details
```bash
GET /api/v1/jobs/{id}
```

Returns job with related data including farmer/carrier profiles, events, POD assets, and ratings.

### Create Job
```bash
POST /api/v1/jobs
```

**Body:**
```json
{
  "crop": "Corn",
  "load_size": 25.5,
  "payout_dollars": 1500,
  "pickup_address": "123 Farm Road, Iowa City, IA",
  "dropoff_address": "456 Mill Street, Chicago, IL",
  "pickup_coordinates": [-91.5302, 41.6611],
  "dropoff_coordinates": [-87.6298, 41.8781],
  "equipment_needed": ["dry van"],
  "is_perishable": false,
  "notes": "Standard corn delivery"
}
```

### Accept Job
```bash
POST /api/v1/jobs/{id}/accept
```

**Body (when using API key):**
```json
{
  "carrier_id": "uuid-of-carrier"
}
```

### Update Job Status
```bash
PUT /api/v1/jobs/{id}
```

**Body:**
```json
{
  "status": "in_transit",
  "notes": "Updated delivery notes"
}
```

**Valid Status Transitions:**
- `open` → `accepted`, `cancelled`
- `accepted` → `in_transit`, `cancelled`
- `in_transit` → `delivered`, `cancelled`
- `delivered` → `paid`

## ⭐ Ratings API

### List Ratings
```bash
GET /api/v1/ratings
```

**Parameters:**
- `job_id`: Filter by job ID
- `rater_id`: Filter by rater ID
- `ratee_id`: Filter by ratee ID

### Submit Rating
```bash
POST /api/v1/ratings
```

**Body:**
```json
{
  "job_id": "job-uuid",
  "ratee_id": "user-uuid",
  "on_time": 9,
  "communication": 8,
  "accuracy": 10,
  "condition": 9,
  "compliance": 8,
  "resolution": 9,
  "comment": "Excellent service, on-time delivery!"
}
```

**Rating Scale:** 0-10 for each category
**Categories:**
- `on_time` (30% weight): Timeliness of pickup/delivery
- `accuracy` (20% weight): Load size/description accuracy
- `communication` (15% weight): Quality of communication
- `compliance` (15% weight): Following procedures/documentation
- `condition` (10% weight): Condition of goods/equipment
- `resolution` (10% weight): Problem-solving ability

## 📈 Statistics API

### Get Platform Stats
```bash
GET /api/v1/stats
```

Returns comprehensive platform statistics:

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1245,
      "farmers": 523,
      "carriers": 722
    },
    "jobs": {
      "total": 8923,
      "open": 234,
      "in_progress": 145,
      "completed": 8234,
      "total_value_dollars": 1234567.89,
      "average_payout_dollars": 1842.50
    },
    "ratings": {
      "total": 5432,
      "average_scores": {
        "on_time": 8.7,
        "communication": 8.2,
        "accuracy": 9.1,
        "overall": 8.6
      }
    },
    "recent_activity": {
      "jobs_posted": 45,
      "jobs_accepted": 38,
      "jobs_completed": 52
    }
  }
}
```

## 🔄 Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description"
}
```

## 🚦 Rate Limiting

### Default Limits
- **Unauthenticated requests:** 100 requests per minute
- **Authenticated requests:** 1000 requests per minute
- **Admin API key:** 5000 requests per minute

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Rate limit exceeded"
}
```
Status Code: `429 Too Many Requests`

## 🔐 Security

### API Key Security
- Keep your API keys secure and never expose them in client-side code
- Use environment variables for API keys
- Rotate keys regularly

### HTTPS Required
All API calls must be made over HTTPS. HTTP requests will be rejected.

### Input Validation
- All inputs are validated and sanitized
- SQL injection protection is built-in
- Rate limiting prevents abuse

## 📝 Common Use Cases

### 1. Integration with Logistics Systems
```bash
# Get open jobs for integration
curl -H "x-api-key: YOUR_KEY" \
     "https://yourapp.com/api/v1/jobs?status=open&limit=50"

# Create job from external system
curl -X POST -H "x-api-key: YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"crop":"Wheat","load_size":30,"payout_dollars":2000,...}' \
     https://yourapp.com/api/v1/jobs
```

### 2. Analytics Dashboard
```bash
# Get platform statistics
curl -H "x-api-key: YOUR_KEY" \
     https://yourapp.com/api/v1/stats

# Get user performance metrics
curl -H "x-api-key: YOUR_KEY" \
     "https://yourapp.com/api/v1/ratings?ratee_id=USER_ID"
```

### 3. Mobile App Integration
```bash
# User login flow (get bearer token from /auth endpoint)
# Then use bearer token for user-specific operations

curl -H "Authorization: Bearer USER_TOKEN" \
     https://yourapp.com/api/v1/jobs?farmer_id=USER_ID
```

### 4. Automated Job Matching
```bash
# Find carriers near pickup location
curl -H "x-api-key: YOUR_KEY" \
     "https://yourapp.com/api/v1/users?role=carrier&trust_score.gte=80"

# Accept job programmatically
curl -X POST -H "x-api-key: YOUR_KEY" \
     -d '{"carrier_id":"CARRIER_UUID"}' \
     https://yourapp.com/api/v1/jobs/JOB_ID/accept
```

## 🛠️ SDKs and Tools

### cURL Examples
All examples in this documentation use cURL for simplicity.

### Postman Collection
Import the OpenAPI spec from `/api/v1/docs` into Postman for easy testing.

### Testing with API Explorer
Visit `/api/docs` for an interactive API testing interface.

## 🐛 Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

## 📞 Support

- **API Documentation:** `/api/docs`
- **OpenAPI Spec:** `/api/v1/docs`
- **Issues:** Report bugs and request features on GitHub

## 🔄 Changelog

### v1.0.0 (2024-01-20)
- Initial API release
- User management endpoints
- Job lifecycle management
- Rating and trust score system
- Platform statistics
- Rate limiting and security features

---

**Happy coding!** 🚜🚚✨