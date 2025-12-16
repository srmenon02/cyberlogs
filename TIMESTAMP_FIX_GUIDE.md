# Timestamp Bug Fix Guide

## The Problem

Your analytics dashboard is only showing logs from today (November 30th) because of a **critical timestamp handling bug**.

### Root Cause

1. **Timestamps stored as strings**: Kafka sends timestamps as ISO 8601 strings (e.g., `"2025-11-30T14:30:00+00:00"`)
2. **Saved directly without conversion**: The backend was saving these strings directly to MongoDB without converting them to datetime objects
3. **String comparison vs datetime comparison**: MongoDB was doing lexicographic (alphabetical) comparison instead of chronological comparison
4. **All old timestamps "greater than" today**: When comparing strings chronologically, older dates like `"2025-01-15T..."` are lexicographically **smaller** than today's `"2025-11-30T...""`

### Example of the Bug

```
String comparison (WRONG):
"2025-01-15T12:00:00" < "2025-11-30T14:30:00"  ✓ Alphabetically smaller
"2025-11-15T12:00:00" > "2025-11-30T14:30:00"  ✗ Alphabetically larger!

DateTime comparison (CORRECT):
2025-01-15 12:00:00 < 2025-11-30 14:30:00  ✓ Chronologically earlier
2025-11-15 12:00:00 < 2025-11-30 14:30:00  ✓ Chronologically earlier
```

When looking for logs from the past 30 days with `timestamp >= 2025-10-31`:
- Old logs with string timestamps DON'T match (because "2025-01-" < "2025-10-")
- Only today's logs match

## The Solution

### Step 1: Migrate Existing Data (One-time)

Convert all existing timestamp strings to datetime objects in MongoDB:

```bash
cd /Users/smeno/Documents/Personal/Projects/cryptosecure-insights
python scripts/migrate_timestamps.py
```

**What it does:**
- ✅ Checks connection to MongoDB
- ✅ Counts documents with string timestamps
- ✅ Converts all string timestamps to datetime objects
- ✅ Verifies the migration was successful

**Output will look like:**
```
INFO:migrate_timestamps:🔗 Connecting to MongoDB...
INFO:migrate_timestamps:✅ MongoDB connected successfully!
INFO:migrate_timestamps:📊 Total documents in collection: 2345
INFO:migrate_timestamps:🔍 Found 2345 documents with string timestamps
INFO:migrate_timestamps:🚀 Starting migration...
INFO:migrate_timestamps:✅ Migration completed!
INFO:migrate_timestamps:   Modified: 2345 documents
INFO:migrate_timestamps:🎉 Migration successful! All timestamps are now datetime objects.
```

### Step 2: Restart Backend

The backend code is already fixed. Restart to apply the changes:

```bash
./start_all.sh
```

Or if only restarting the backend:
```bash
# Kill existing backend
pkill -f "python.*main.py"

# Restart backend
cd backend && python main.py
```

### Step 3: Verify the Fix

1. Open your analytics dashboard at `http://localhost:5173`
2. Try the **Month** view
3. You should now see analytics spanning **multiple months**, not just today
4. Check the backend logs for confirmation:

```
📊 Found 2345 documents matching filter in 0.023s
⏱️ Aggregation pipeline completed in 1.234s
```

## What Changed in the Code

### `backend/main.py`

**1. Fixed `save_log()` function (lines 272-291):**
```python
# Now converts timestamp strings to datetime objects
if "timestamp" in log and isinstance(log["timestamp"], str):
    try:
        log["timestamp"] = datetime.fromisoformat(log["timestamp"])
    except (ValueError, TypeError) as e:
        logger.error(f"Failed to parse timestamp: {e}")
```

**2. Fixed analytics endpoint queries:**
- Changed `since.isoformat()` → `since` (use datetime object directly)
- Updated aggregation pipeline to use `$timestamp` instead of `{"$toDate": "$timestamp"}`

### `scripts/migrate_timestamps.py` (NEW):
- One-time migration script to fix existing data
- Converts all string timestamps in MongoDB to datetime objects
- Includes fallback method if the aggregation pipeline fails

## Verification Checklist

- [ ] Run `python scripts/migrate_timestamps.py` - shows successful migration
- [ ] Restart backend with `./start_all.sh`
- [ ] Open analytics dashboard
- [ ] Select "Month" from interval dropdown
- [ ] See data from multiple months (not just today)
- [ ] Backend logs show proper timestamp handling
- [ ] No errors in `logs/backend_debug.log`

## FAQ

**Q: Why does the migration script exist?**
A: MongoDB can only compare datetimes properly if they're stored as datetime objects, not strings. Existing logs need to be converted.

**Q: Will this affect future logs?**
A: No. The fixed `save_log()` function ensures all new logs are stored correctly as datetime objects.

**Q: Can I run the migration multiple times?**
A: Yes, it's safe. It only migrates string timestamps, so running it again won't cause issues.

**Q: What if the migration fails?**
A: The script has a fallback that converts documents one-by-one. Check the logs for specific errors.

**Q: How long does the migration take?**
A: Typically <1 second for a few thousand documents. It depends on collection size and MongoDB performance.

## Before/After

**Before (Bug):**
- User looks at "Month" analytics → Only today's data visible
- Queries like `timestamp >= 2025-10-31` return 0 results from October
- String comparison breaks chronological ordering

**After (Fixed):**
- User looks at "Month" analytics → Last 30 days of data visible
- Queries like `timestamp >= 2025-10-31` return all logs from October onwards
- Proper datetime comparison works correctly

## Emergency Rollback

If you need to revert this change:

1. Restore old code: `git checkout HEAD -- backend/main.py`
2. Restore MongoDB: Your existing string timestamps still work (but only show today's data)
3. Delete the migration script if desired: `rm scripts/migrate_timestamps.py`

However, this is **not recommended** as the bug will return.
