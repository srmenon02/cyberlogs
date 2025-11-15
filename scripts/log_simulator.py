import json
import random
import time
from datetime import datetime
from datetime import timezone
from kafka import KafkaProducer

try:
    producer = KafkaProducer(
        bootstrap_servers='localhost:50849',  # or 'localhost:9092' depending on your OS
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    print("Kafka producer connected.")
except Exception as e:
    print("Failed to connect to Kafka:", e)
    exit(1)

# Send a test message
topic = "test-topic"
test_message = {"event": "test", "status": "ok"}

try:
    print("Sending message...")
    producer.send(topic, test_message)
    producer.flush()
    print("✅ Message sent successfully.")
except Exception as e:
    print("❌ Failed to send message:", e)

log_levels = ["INFO", "WARNING", "ERROR", "CRITICAL"]
events = [
    "User login successful",
    "User login failed",
    "CPU usage spike",
    "Unauthorized access attempt",
    "File deleted",
    "Disk space low",
    "System rebooted",
    "Suspicious network activity"
]

def generate_log():
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": random.choices(log_levels, weights=[50, 30, 15, 5])[0],
        "event": random.choice(events),
        "host": f"server-{random.randint(1,3)}",
        "ip": f"192.168.1.{random.randint(1, 100)}"
    }

if __name__ == "__main__":
    topic = "test-logs"
    print(f"Sending logs to Kafka topic: {topic}")
    try:
        while True:
            log = generate_log()
            time.sleep(0.1)
            producer.send(topic, log)
            print("Sent:", log)
            time.sleep(random.uniform(5, 10))
    except KeyboardInterrupt:
        print("Stopped log simulation.")
    finally:
        producer.close()
