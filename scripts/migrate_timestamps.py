#!/usr/bin/env python3
"""
Migration script to convert timestamp strings to datetime objects in MongoDB.
Run this BEFORE restarting the backend with the new code.
"""

import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import asyncio
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("migrate_timestamps")

load_dotenv()
MONGODB_URI = os.getenv("MONGO_URI")
DATABASE_NAME = "cryptosecure"
COLLECTION_NAME = "logs"


async def migrate_timestamps():
    """Convert all timestamp strings to datetime objects"""
    
    if not MONGODB_URI:
        logger.error("❌ MONGO_URI not set in .env file")
        return
    
    logger.info("🔗 Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    collection = db[COLLECTION_NAME]
    
    try:
        # Test connection
        await client.admin.command('ping')
        logger.info("✅ MongoDB connected successfully!")
        
        # Find all documents where timestamp is a string
        count_before = await collection.count_documents({})
        logger.info(f"📊 Total documents in collection: {count_before}")
        
        # Find documents with string timestamps
        string_timestamp_count = await collection.count_documents({
            "timestamp": {"$type": "string"}
        })
        logger.info(f"🔍 Found {string_timestamp_count} documents with string timestamps")
        
        if string_timestamp_count == 0:
            logger.info("✅ All timestamps are already datetime objects. No migration needed!")
            client.close()
            return
        
        # Migrate string timestamps to datetime
        logger.info("🚀 Starting migration...")
        
        # Use aggregation pipeline to update documents
        # This is more efficient than updating one-by-one
        pipeline = [
            {
                "$match": {"timestamp": {"$type": "string"}}
            },
            {
                "$set": {
                    "timestamp": {"$dateFromString": {"dateString": "$timestamp"}}
                }
            }
        ]
        
        try:
            result = await collection.update_many(
                {"timestamp": {"$type": "string"}},
                [
                    {
                        "$set": {
                            "timestamp": {"$dateFromString": {"dateString": "$timestamp"}}
                        }
                    }
                ]
            )
            
            logger.info(f"✅ Migration completed!")
            logger.info(f"   Modified: {result.modified_count} documents")
            logger.info(f"   Matched: {result.matched_count} documents")
            
            # Verify the migration
            datetime_timestamp_count = await collection.count_documents({
                "timestamp": {"$type": "date"}
            })
            logger.info(f"✅ Verified: {datetime_timestamp_count} documents now have datetime timestamps")
            
            if datetime_timestamp_count == count_before:
                logger.info("🎉 Migration successful! All timestamps are now datetime objects.")
            else:
                logger.warning(f"⚠️ Some documents may not have been migrated. Expected {count_before}, got {datetime_timestamp_count}")
                
        except Exception as e:
            logger.error(f"❌ Migration error: {e}")
            logger.info("💡 Attempting fallback migration method...")
            
            # Fallback: fetch and update one-by-one
            docs = await collection.find({"timestamp": {"$type": "string"}}).to_list(length=None)
            logger.info(f"Found {len(docs)} documents with string timestamps (fallback method)")
            
            migrated = 0
            failed = 0
            
            for doc in docs:
                try:
                    dt = datetime.fromisoformat(doc["timestamp"])
                    await collection.update_one(
                        {"_id": doc["_id"]},
                        {"$set": {"timestamp": dt}}
                    )
                    migrated += 1
                    if migrated % 100 == 0:
                        logger.info(f"  Migrated {migrated} documents...")
                except Exception as e:
                    logger.error(f"  Failed to migrate document {doc['_id']}: {e}")
                    failed += 1
            
            logger.info(f"✅ Fallback migration completed: {migrated} migrated, {failed} failed")
            
    except Exception as e:
        logger.error(f"❌ Connection error: {e}")
    finally:
        client.close()
        logger.info("🔌 MongoDB connection closed.")


if __name__ == "__main__":
    asyncio.run(migrate_timestamps())
