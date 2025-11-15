from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Query, HTTPException
from fastapi.responses import JSONResponse
from fastapi import Query
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import StreamingResponse
import pandas as pd
import io
from kafka import KafkaConsumer
from typing import Optional
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, validator
import asyncio
import json
from fastapi.middleware.gzip import GZipMiddleware
from dotenv import load_dotenv
import os
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FIXED: Only create FastAPI app once
app = FastAPI()

# Add middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configs
load_dotenv()
MONGODB_URI = os.getenv("MONGO_URI")
DATABASE_NAME = "cryptosecure"
COLLECTION_NAME = "logs"
KAFKA_TOPIC = "test-logs"
KAFKA_BOOTSTRAP_SERVERS = "localhost:50849"

# MongoDB client (will be initialized in startup)
client = None
db = None
collection = None

@app.get("/health")
async def health():
    try:
        # Test MongoDB connection
        if client:
            await client.admin.command('ping')
            return {"status": "ok", "mongodb": "connected"}
        return {"status": "ok", "mongodb": "not_initialized"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "error", "message": str(e)}

def validate_iso_datetime(value: Optional[str], field_name: str) -> Optional[datetime]:
    if value is None:
        return None
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid ISO datetime format for '{field_name}'. "
                   f"Expected format like '2025-07-11T12:00:00'.",
        )

@app.get("/logs")
async def get_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    level: Optional[str] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    sort_by: str = Query("timestamp"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    event_keyword: Optional[str] = Query(None, description="Substring to match in event field"),
    host: Optional[str] = Query(None, description="Filter logs by exact host name"),
):
    if not collection:
        raise HTTPException(status_code=503, detail="Database not available")
        
    start_dt = validate_iso_datetime(start_time, "start_time")
    end_dt = validate_iso_datetime(end_time, "end_time")

    query: dict = {}
    if level:
        query["level"] = level
    if host:
        query["host"] = host
    if event_keyword:
        query["event"] = {"$regex": event_keyword, "$options": "i"}
    if start_dt or end_dt:
        time_filter: dict = {}
        if start_dt:
            time_filter["$gte"] = start_dt
        if end_dt:
            time_filter["$lte"] = end_dt
        query["timestamp"] = time_filter

    # Validate sorting
    allowed_sort_fields = {"timestamp", "level", "_id"}
    if sort_by not in allowed_sort_fields:
        raise HTTPException(status_code=400, detail=f"Invalid sort_by field. Choose from {allowed_sort_fields}")
    sort_direction = 1 if sort_order == "asc" else -1

    total_count = await collection.count_documents(query)
    skip = (page - 1) * page_size
    projection = {
        "_id": 1,
        "timestamp": 1,
        "level": 1,
        "event": 1,
        "host": 1,
        "ip": 1
    }
    cursor = collection.find(query, projection).sort(sort_by, sort_direction).skip(skip).limit(page_size)

    logs = []
    async for log in cursor:
        log["_id"] = str(log["_id"])
        logs.append(log)

    return {
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "logs": logs,
    }

@app.get("/logs/export")
async def export_logs_as_csv():
    if not collection:
        raise HTTPException(status_code=503, detail="Database not available")
        
    # You can later apply filters here
    logs_cursor = collection.find().sort("timestamp", -1)
    logs = await logs_cursor.to_list(length=1000)  # Adjust the number as needed

    if not logs:
        raise HTTPException(status_code=404, detail="No logs found")

    # Normalize MongoDB documents (remove _id or convert it)
    for log in logs:
        log["_id"] = str(log["_id"])

    df = pd.DataFrame(logs)

    stream = io.StringIO()
    df.to_csv(stream, index=False)
    stream.seek(0)

    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=logs_export.csv"},
    )

# Kafka consumer background task and control
consumer_task = None

def get_kafka_consumer():
    return KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        auto_offset_reset='earliest',
        enable_auto_commit=True,
        group_id='cryptosecure-group',
        value_deserializer=lambda v: json.loads(v.decode('utf-8'))
    )

async def save_log(log):
    try:
        if collection:
            # Convert timestamp string to datetime object
            if "timestamp" in log and isinstance(log["timestamp"], str):
                try:
                    log["timestamp"] = datetime.fromisoformat(log["timestamp"])
                except ValueError:
                    log["timestamp"] = datetime.utcnow()  # Fallback to current time
            elif "timestamp" not in log:
                log["timestamp"] = datetime.utcnow()  # Add timestamp if missing
            result = await collection.insert_one(log)
            logger.info(f"Saved log with id: {result.inserted_id}")
    except Exception as e:
        logger.error(f"Error saving log to MongoDB: {e}")

async def consume_and_store():
    try:
        consumer = get_kafka_consumer()
        logger.info("Kafka consumer connected. Listening for messages...")
        loop = asyncio.get_event_loop()
        
        while True:
            # Poll with timeout to allow task cancellation
            msg_pack = consumer.poll(timeout_ms=1000)
            if not msg_pack:
                await asyncio.sleep(0)  # Yield to event loop
                continue
            for tp, messages in msg_pack.items():
                for message in messages:
                    log_data = message.value
                    logger.info(f"📥 Received: {log_data}")
                    loop.create_task(save_log(log_data))
    except asyncio.CancelledError:
        logger.info("Kafka consumer task cancelled via asyncio.")
    except Exception as e:
        logger.error(f"Kafka error: {e}")
    finally:
        if 'consumer' in locals():
            consumer.close()
        logger.info("Kafka consumer closed.")

@app.on_event("startup")
async def startup_event():
    global client, db, collection, consumer_task
    
    logger.info("FastAPI app is starting up!")
    
    # Initialize MongoDB
    try:
        if MONGODB_URI:
            client = AsyncIOMotorClient(MONGODB_URI)
            db = client[DATABASE_NAME]
            collection = db[COLLECTION_NAME]
            # Test connection
            await client.admin.command('ping')
            logger.info("✅ MongoDB connected successfully!")
        else:
            logger.warning("⚠️ MONGO_URI not found in environment")
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        # Don't fail startup, just log the error
    
    # DISABLED: Don't start Kafka consumer automatically (will fail in Fly.io)
    # Uncomment this line when you have Kafka available:
    # consumer_task = asyncio.create_task(consume_and_store())
    logger.info("📡 Kafka consumer disabled for deployment")

@app.on_event("shutdown")
async def shutdown_event():
    global consumer_task, client
    
    if consumer_task:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
        logger.info("Kafka consumer task cancelled gracefully.")
    
    if client:
        client.close()
        logger.info("MongoDB client closed.")