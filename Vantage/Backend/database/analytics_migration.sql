-- Update rooms table with capacity
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 50;

-- Create occupancy_snapshots table for historical trends
CREATE TABLE IF NOT EXISTS occupancy_snapshots (
    id SERIAL PRIMARY KEY,
    building_id VARCHAR(50) REFERENCES buildings(id),
    occupancy_count INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system_logs table for activity timeline
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50), -- 'class_start', 'class_end', 'occupancy_spike', etc.
    message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_snapshots_building_time ON occupancy_snapshots(building_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_time ON system_logs(timestamp);
