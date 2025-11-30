# AI Coding Agent Instructions - CryptoSecure Insights

## Project Overview
**CryptoSecure Insights** is a real-time cybersecurity monitoring dashboard that ingests simulated log streams via Kafka, processes them through FastAPI, stores in MongoDB, and visualizes in a React dashboard.

### Architecture
```
Log Simulator (Python) 
    → Kafka Topic (test-logs)
    → Kafka Consumer (async Kafka polling)
    → MongoDB (logs collection)
    → FastAPI /api/analytics, /logs endpoints
    → React Vite Frontend (http://localhost:5173)
```

## Critical Developer Workflows

### Startup Command
```bash
./start_all.sh  # Spawns 5 Terminal tabs: Docker, FastAPI, Kafka Consumer, Log Simulator, React
```
- **Requires**: Conda env `myConda`, Docker running, ports 8000, 5173, 9092 free
- **Ports**: Backend=8000, Frontend=5173, Kafka=50849
- **Note**: MongoDB URI from `.env` (`MONGO_URI`), must be set for backend to work

### Database Management
```bash
# Clear MongoDB for fresh start
mongo mongodb://localhost:27017/cryptosecure --eval "db.dropDatabase()"

# Check log collection size
mongo mongodb://localhost:27017/cryptosecure --eval "db.logs.count()"
```

### Performance Debugging
- **Aggregation analytics slow?** Check `/api/analytics` timing breakdown in `backend/logs/backend_debug.log`
  - **After optimization**: count (~0.01s) + aggregation (~2-3s) = total ~2-3s (was 8.5s)
  - With frontend cache: <100ms for repeated requests
  - Primary bottleneck solved: Compound indexes + single-pass aggregation
  - Secondary optimization: 300ms frontend debouncing + 120s backend cache TTL

## Project Structure & Key Files

| Path | Purpose |
|------|---------|
| `backend/main.py` | FastAPI app, analytics endpoints, health checks, CSV export |
| `backend/kafka_consumer_mongo.py` | Kafka consumer loop, MongoDB writer, log filtering/pagination |
| `backend/db.py` | Placeholder for database utilities (currently unused) |
| `scripts/log_simulator.py` | Generates fake security logs → Kafka topic |
| `frontend/src/` | React components (analytics dashboard, log viewer) |
| `docker-compose.yml` | Kafka, MongoDB, Zookeeper containers |
| `.env` | Environment config (MONGO_URI, KAFKA_BOOTSTRAP_SERVERS) |

## Critical Patterns & Conventions

### 1. **Timestamp Handling (Backend)**
- **Store**: ISO 8601 string format in JSON from Kafka (`2025-11-16T16:14:33.044087+00:00`)
- **Convert to DateTime**: In `save_log()` function when inserting to MongoDB
  ```python
  if "timestamp" in log and isinstance(log["timestamp"], str):
      log["timestamp"] = datetime.fromisoformat(log["timestamp"])
  ```
- **Query**: Always convert to ISO string for aggregation (`{"$gte": since.isoformat()}`)
- **Why**: MongoDB ISODate fields are queryable; string comparisons fail

### 2. **Caching Analytics Responses**
- Cache storage: `cache_storage = {}` in `backend/main.py` (in-memory)
- TTL: 30-60 seconds (configurable)
- Key format: `f"{interval}:{since_timestamp}"`
- **Pattern**: Check cache on request → hit returns cached data → miss runs aggregation → store result
- **Performance impact**: Repeated timeframe changes hit cache (~100ms vs 8s)

### 3. **MongoDB Aggregation Pipeline Optimization** ⚡ OPTIMIZED
- Use compound indexes: `await collection.create_index([("timestamp", 1), ("level", 1)])` ✅
- Single-pass aggregation (no $facet for simple grouping) ✅
- Always `$match` early to filter before `$group` ✅
- **Current performance**: 2-3s for ~20k documents (was 6.5s)
- **Frontend cache**: 120s TTL + 300ms debounce = <100ms for repeated changes

### 4. **Kafka Consumer Error Handling**
- Consumer polls indefinitely via `for message in consumer:` loop
- Errors caught in broad `except` blocks → logged, not re-raised
- MongoDB insert failures logged but don't crash consumer
- **Restart pattern**: Consumer runs as background task, failure = silent

### 5. **CORS Configuration**
- Hardcoded for frontend: `allow_origins=["http://localhost:5173"]`
- Remove this when deploying (use env var or wildcard carefully)
- Both `main.py` and `kafka_consumer_mongo.py` define CORS (duplication → use one)

### 6. **Log Levels in Aggregation**
- Levels: INFO, WARNING, CRITICAL, ERROR (tracked in logs collection)
- Analytics pie chart groups by level
- Filter logs endpoint: `?level=INFO` filters exact match

## Common Integration Points

### Frontend → Backend API Calls
```javascript
// Analytics: GET /api/analytics?interval=day|week|month|year|hour
// Logs: GET /logs?page=1&page_size=10&level=INFO&start_time=ISO&end_time=ISO
// Export: GET /export/csv?level=INFO&start_time=ISO&end_time=ISO
```

### Kafka → MongoDB Data Flow
1. Log simulator produces JSON to topic `test-logs`
2. Kafka consumer polls messages (default offset=earliest)
3. Each message deserialized to dict
4. `save_log()` converts timestamp string → datetime
5. `collection.insert_one()` writes to MongoDB

### Environment Variables (from `.env`)
```
MONGO_URI=mongodb://localhost:27017/
ENABLE_KAFKA=true  # Toggle Kafka consumer startup
KAFKA_BOOTSTRAP_SERVERS=localhost:50849
```

## Performance Troubleshooting Checklist

- [ ] Is MongoDB connected? Check `/health` endpoint
- [ ] Are indexes created? Check `db.logs.getIndexes()` in MongoDB
- [ ] Is cache working? Look for "Cache HIT/MISS" in logs
- [ ] Large dataset? Use pagination on `/logs` endpoint
- [ ] Slow aggregation? Enable timing logs in `get_analytics()` (already instrumented)

## AI Agent Guidance

When modifying this codebase:
1. **Always check CORS origins** when adding endpoints - verify frontend can access
2. **Timestamp consistency**: If touching log insertion or querying, ensure ISO 8601 format throughout
3. **Index management**: Adding new `$group` or `$sort` fields? Add corresponding index
4. **Testing aggregations**: Use `mongo` CLI to test pipelines before integrating
5. **Kafka consumer stability**: Catch broad exceptions to prevent crash on malformed messages
6. **Cache invalidation**: If log data changes, clear `cache_storage` dict or reduce TTL

