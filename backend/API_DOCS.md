# API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

Sử dụng JWT token trong header:

```
Authorization: Bearer <token>
```

## Endpoints Chi Tiết

### 🎬 MOVIES

#### Get All Movies

```http
GET /movies
```

**Response:**

```json
[
  {
    "_id": "...",
    "title": "The Dark Knight",
    "overview": "...",
    "poster_path": "https://...",
    "backdrop_path": "https://...",
    "release_date": "2008-07-18T00:00:00.000Z",
    "genres": ["Action", "Crime", "Drama"],
    "runtime": 152,
    "vote_average": 9.0,
    "vote_count": 28000
  }
]
```

#### Get Movie by ID

```http
GET /movies/:id
```

#### Create Movie (Admin)

```http
POST /movies
Content-Type: application/json

{
  "title": "Movie Title",
  "overview": "Description",
  "poster_path": "https://...",
  "backdrop_path": "https://...",
  "release_date": "2024-01-01",
  "genres": ["Action", "Drama"],
  "runtime": 120,
  "vote_average": 8.5
}
```

### 🎭 THEATERS

#### Get All Theaters

```http
GET /theaters
```

**Response:**

```json
[
  {
    "_id": "...",
    "name": "CGV VivoCity",
    "location": "TP. Hồ Chí Minh",
    "address": "...",
    "phone": "...",
    "email": "...",
    "totalRooms": 10,
    "amenities": ["IMAX", "4DX", "WiFi"]
  }
]
```

#### Get Theater by ID

```http
GET /theaters/:id
```

#### Create Theater (Admin)

```http
POST /theaters
Content-Type: application/json

{
  "name": "Theater Name",
  "location": "City",
  "address": "Address",
  "phone": "0123456789",
  "email": "theater@email.com",
  "totalRooms": 10,
  "amenities": ["IMAX", "4DX"]
}
```

### 🎪 SHOWS (Suất chiếu)

#### Get All Shows

```http
GET /shows
```

#### Get Shows by Date

```http
GET /shows/by-date/2024-01-15
```

#### Get Show by ID

```http
GET /shows/:id
```

**Response:**

```json
{
  "_id": "...",
  "movie": {
    "_id": "...",
    "title": "The Dark Knight",
    "..."
  },
  "theater": {
    "_id": "...",
    "name": "CGV VivoCity",
    "..."
  },
  "room": "Phòng chiếu 1",
  "showDateTime": "2024-01-15T19:30:00.000Z",
  "showPrice": 100000,
  "duration": 152,
  "language": "Vietnamese",
  "format": "2D",
  "occupiedSeats": {
    "A1": "userId1",
    "A2": "userId2"
  },
  "totalSeats": 140
}
```

#### Create Show (Admin)

```http
POST /shows
Content-Type: application/json

{
  "movie": "movieId",
  "theater": "theaterId",
  "room": "Phòng chiếu 1",
  "showDateTime": "2024-01-15T19:30:00Z",
  "showPrice": 100000,
  "duration": 152,
  "language": "Vietnamese",
  "format": "2D"
}
```

### 👤 USERS

#### Register

```http
POST /users/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGc..."
}
```

#### Login

```http
POST /users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "message": "Login successful",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGc..."
}
```

#### Get User Profile

```http
GET /users/profile/:id
```

#### Update User

```http
PUT /users/:id
Content-Type: application/json

{
  "name": "New Name",
  "phone": "0987654321",
  "avatar": "https://..."
}
```

### 🎫 BOOKINGS

#### Get User Bookings

```http
GET /bookings/user/:userId
```

**Response:**

```json
[
  {
    "_id": "...",
    "user": {...},
    "show": {...},
    "bookedSeats": ["A1", "A2"],
    "amount": 200000,
    "isPaid": false,
    "paymentMethod": null,
    "bookingCode": "BK1234567",
    "status": "confirmed",
    "bookedAt": "2024-01-10T10:00:00.000Z"
  }
]
```

#### Get Booking by ID

```http
GET /bookings/:id
```

#### Create Booking

```http
POST /bookings
Content-Type: application/json

{
  "userId": "userId",
  "showId": "showId",
  "bookedSeats": ["A1", "A2", "A3"]
}
```

**Response:**

```json
{
  "_id": "...",
  "user": "userId",
  "show": "showId",
  "bookedSeats": ["A1", "A2", "A3"],
  "amount": 300000,
  "isPaid": false,
  "bookingCode": "BK1234567",
  "status": "confirmed"
}
```

#### Cancel Booking

```http
PUT /bookings/:id/cancel
```

#### Mark as Paid

```http
PUT /bookings/:id/pay
Content-Type: application/json

{
  "paymentMethod": "credit_card"
}
```

### ❤️ FAVORITES

#### Get User Favorites

```http
GET /favorites/user/:userId
```

**Response:**

```json
[
  {
    "_id": "...",
    "user": "userId",
    "movie": {
      "_id": "...",
      "title": "The Dark Knight",
      "..."
    },
    "createdAt": "2024-01-10T10:00:00.000Z"
  }
]
```

#### Add Favorite

```http
POST /favorites
Content-Type: application/json

{
  "userId": "userId",
  "movieId": "movieId"
}
```

#### Remove Favorite

```http
DELETE /favorites/:id
```

## Error Responses

### 400 Bad Request

```json
{
  "message": "Error message"
}
```

### 401 Unauthorized

```json
{
  "message": "Invalid token or not authenticated"
}
```

### 404 Not Found

```json
{
  "message": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "message": "Something went wrong!"
}
```

## Status Codes

| Code | Meaning                            |
| ---- | ---------------------------------- |
| 200  | OK - Thành công                    |
| 201  | Created - Tạo mới thành công       |
| 400  | Bad Request - Dữ liệu không hợp lệ |
| 401  | Unauthorized - Chưa xác thực       |
| 404  | Not Found - Không tìm thấy         |
| 500  | Internal Server Error - Lỗi server |
