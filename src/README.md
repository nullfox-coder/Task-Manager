# Task Management Service

A microservice for task management with LFU cache implementation.

## Features

- Task CRUD operations
- LFU cache with Redis
- PostgreSQL database integration
- Firebase metadata storage
- JWT authentication
- Rate limiting
- Request logging
- Error handling

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL
- Redis
- Firebase project

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd task-service
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgres://user:password@localhost:5432/taskdb
REDIS_HOST=localhost
REDIS_PORT=6379
FIREBASE_PROJECT_ID=your-project-id
JWT_SECRET=your-jwt-secret
```

4. Set up the database:
```bash
npx sequelize-cli db:create
npx sequelize-cli db:migrate
```

## Running the Service

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

- `POST /tasks` - Create a new task
- `GET /tasks` - List all tasks
- `GET /tasks/frequent` - Get frequent tasks
- `GET /tasks/{id}` - Get task details
- `PATCH /tasks/{id}` - Update task
- `DELETE /tasks/{id}` - Delete task

## Testing

Run tests:
```bash
npm test
```

## Linting

Check code style:
```bash
npm run lint
```

Format code:
```bash
npm run format
```

## Cache Configuration

The service uses an LFU cache with Redis:
- Max size: 10 items
- TTL: 1 hour
- User-specific caching

## Monitoring

The service includes:
- Request logging
- Error tracking
- Cache statistics
- Performance metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC 