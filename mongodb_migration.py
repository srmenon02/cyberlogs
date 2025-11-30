import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dateutil import parser

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "cryptosecure"
COLLECTION_NAME = "logs"
BATCH_SIZE = 1000  # process 1000 logs at a time

async def migrate_timestamps():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    # Find documents where timestamp is a string
    query = {"timestamp": {"$type": "string"}}
    total_to_update = await collection.count_documents(query)
    print(f"Total documents to update: {total_to_update}")

    cursor = collection.find(query).batch_size(BATCH_SIZE)

    updated_count = 0
    async for doc in cursor:
        ts_str = doc["timestamp"]
        try:
            ts_dt = parser.isoparse(ts_str)
            await collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"timestamp": ts_dt}}
            )
            updated_count += 1
            if updated_count % 100 == 0:
                print(f"Updated {updated_count}/{total_to_update}")
        except Exception as e:
            print(f"Skipping doc {_id} due to error: {e}")

    print(f"Migration complete! Total updated: {updated_count}")

if __name__ == "__main__":
    asyncio.run(migrate_timestamps())
