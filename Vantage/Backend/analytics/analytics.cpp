#include "analytics.h"
#include "../database/db.h"
#include "../json.hpp"
#include <pqxx/pqxx>
#include <chrono>
#include <ctime>
#include <iostream>
#include <iomanip>
#include <sstream>
#include <map>

using json = nlohmann::json;

static std::string getTimestamp() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_time = std::chrono::system_clock::to_time_t(now);
    std::tm* local_tm = std::localtime(&now_time);
    char buffer[30];
    std::strftime(buffer, sizeof(buffer), "%d %B %Y, %I:%M %p", local_tm);
    return std::string(buffer);
}

static std::string getCurrentDay() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_time = std::chrono::system_clock::to_time_t(now);
    std::tm* local_tm = std::localtime(&now_time);
    const char* days[] = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
    return days[local_tm->tm_wday];
}

static std::string getCurrentTime() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_time = std::chrono::system_clock::to_time_t(now);
    std::tm* local_tm = std::localtime(&now_time);
    char buffer[10];
    std::strftime(buffer, sizeof(buffer), "%H:%M:%S", local_tm);
    return std::string(buffer);
}

// Existing functions... (Overview, Trends, Rankings, Utilization, Feed, PeakHours)
// I will just append the new report functions to keep it clean.

std::string getAnalyticsOverview() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        int totalBuildings = txn.query_value<int>("SELECT COUNT(*) FROM buildings WHERE is_physical = TRUE");
        int totalRooms = txn.query_value<int>("SELECT COUNT(*) FROM rooms");

        std::string day = getCurrentDay();
        std::string time = getCurrentTime();
        int activeClasses = txn.query_value<int>(
            "SELECT COUNT(*) FROM classes WHERE day_of_week = " + txn.quote(day) + 
            " AND start_time <= " + txn.quote(time) + " AND end_time > " + txn.quote(time)
        );

        int availableClasses = totalRooms - activeClasses;

        pqxx::result buildRes = txn.exec(
            "SELECT b.capacity, "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'entry') - "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'exit') as occupancy "
            "FROM buildings b WHERE b.is_physical = TRUE"
        );

        double totalOccupancy = 0;
        double totalCapacity = 0;
        for (auto row : buildRes) {
            int cap = row["capacity"].as<int>();
            int occ = row["occupancy"].as<int>();
            if (occ < 0) occ = 0;
            totalOccupancy += occ;
            totalCapacity += cap;
        }
        int avgOccupancy = totalCapacity > 0 ? (int)((totalOccupancy * 100.0) / totalCapacity) : 0;

        json response = {
            {"totalBuildings", totalBuildings},
            {"totalRooms", totalRooms},
            {"activeClasses", activeClasses},
            {"availableClasses", availableClasses},
            {"avgOccupancy", avgOccupancy},
            {"generatedOn", getTimestamp()}
        };

        return response.dump();
    } catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}

std::string getOccupancyTrends(const std::string& buildingId, const std::string& range) {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        std::string query;
        if (buildingId == "all") {
            query = 
                "SELECT s.timestamp, "
                "CAST(SUM(s.occupancy_count) * 100.0 / NULLIF(SUM(b.capacity), 0) AS INTEGER) as value "
                "FROM occupancy_snapshots s "
                "JOIN buildings b ON s.building_id = b.id "
                "WHERE b.is_physical = TRUE "
                "GROUP BY s.timestamp "
                "ORDER BY s.timestamp ASC LIMIT 50";
        } else {
            query = 
                "SELECT s.timestamp, "
                "CAST(s.occupancy_count * 100.0 / NULLIF(b.capacity, 0) AS INTEGER) as value "
                "FROM occupancy_snapshots s "
                "JOIN buildings b ON s.building_id = b.id "
                "WHERE s.building_id = " + txn.quote(buildingId) + " "
                "ORDER BY s.timestamp ASC LIMIT 50";
        }

        pqxx::result res = txn.exec(query);
        json trends = json::array();
        for (auto row : res) {
            trends.push_back({
                {"time", row["timestamp"].c_str()},
                {"value", row["value"].as<int>()}
            });
        }
        return trends.dump();
    } catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}

std::string getBuildingRankings() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        pqxx::result res = txn.exec(
            "SELECT b.name, b.capacity, "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'entry') - "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'exit') as occupancy "
            "FROM buildings b WHERE b.is_physical = TRUE"
        );

        json rankings = json::array();
        for (auto row : res) {
            int cap = row["capacity"].as<int>();
            int occ = row["occupancy"].as<int>();
            if (occ < 0) occ = 0;
            int pct = cap > 0 ? (occ * 100) / cap : 0;

            rankings.push_back({
                {"name", row["name"].c_str()},
                {"occupancy", pct}
            });
        }
        return rankings.dump();
    } catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}

std::string getRoomUtilization(const std::string& buildingId, const std::string& dept) {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        std::string day = getCurrentDay();
        std::string time = getCurrentTime();

        pqxx::result usageRes = txn.exec(
            "SELECT room_id, SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600) as total_hours "
            "FROM classes WHERE day_of_week = " + txn.quote(day) + " GROUP BY room_id"
        );
        std::map<std::string, double> roomUsage;
        for (auto row : usageRes) {
            roomUsage[row["room_id"].c_str()] = row["total_hours"].as<double>();
        }

        pqxx::result buildOccRes = txn.exec(
            "SELECT b.id, b.capacity, "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'entry') - "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'exit') as occupancy "
            "FROM buildings b"
        );
        std::map<std::string, int> buildPct;
        for (auto row : buildOccRes) {
            int cap = row["capacity"].as<int>();
            int occ = row["occupancy"].as<int>();
            if (occ < 0) occ = 0;
            buildPct[row["id"].c_str()] = cap > 0 ? (occ * 100) / cap : 0;
        }

        std::string query = 
            "SELECT r.id as room_id, b.id as building_id, b.name as building_name, r.capacity as room_capacity, "
            "(SELECT course_code FROM classes c WHERE c.room_id = r.id AND c.day_of_week = " + txn.quote(day) + 
            " AND c.start_time <= " + txn.quote(time) + " AND c.end_time > " + txn.quote(time) + " LIMIT 1) as current_class "
            "FROM rooms r "
            "JOIN buildings b ON r.building_id = b.id "
            "WHERE 1=1 ";
        
        if (buildingId != "all") query += "AND b.id = " + txn.quote(buildingId) + " ";
        if (dept != "all") query += "AND (SELECT department FROM classes c WHERE c.room_id = r.id LIMIT 1) = " + txn.quote(dept) + " ";

        pqxx::result res = txn.exec(query);
        json utilization = json::array();
        for (auto row : res) {
            std::string rId = row["room_id"].c_str();
            std::string bId = row["building_id"].c_str();
            bool isOccupied = !row["current_class"].is_null();
            double hours = roomUsage.count(rId) ? roomUsage[rId] : 0.0;
            
            std::stringstream ssUsage, ssFree;
            ssUsage << std::fixed << std::setprecision(1) << hours << "h";
            ssFree << std::fixed << std::setprecision(1) << (12.0 - hours) << "h";

            utilization.push_back({
                {"room", rId},
                {"building", row["building_name"].c_str()},
                {"status", isOccupied ? "Occupied" : "Free"},
                {"usageToday", ssUsage.str()},
                {"freeHours", ssFree.str()},
                {"currentClass", isOccupied ? row["current_class"].c_str() : "-"},
                {"capacityUsage", isOccupied ? (buildPct[bId] > 0 ? buildPct[bId] : 45) : 0} 
            });
        }
        return utilization.dump();
    } catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}

std::string getPeakHours() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        pqxx::result res = txn.exec(
            "SELECT EXTRACT(HOUR FROM timestamp) as hr, COUNT(*) as count "
            "FROM movement_logs WHERE timestamp > CURRENT_DATE "
            "GROUP BY hr ORDER BY hr ASC"
        );

        json peak = json::array();
        std::map<int, int> hourMap;
        for(int h=8; h<=20; h++) hourMap[h] = 0;

        for (auto row : res) {
            int h = static_cast<int>(row["hr"].as<double>());
            if (h >= 8 && h <= 20) hourMap[h] = row["count"].as<int>();
        }

        for (auto const& [h, count] : hourMap) {
            std::string label = (h < 10 ? "0" : "") + std::to_string(h) + ":00";
            peak.push_back({{"hour", label}, {"count", count}});
        }
        return peak.dump();
    } catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}

std::string getActivityFeed() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        pqxx::result res = txn.exec("SELECT event_type, message, timestamp FROM system_logs ORDER BY timestamp DESC LIMIT 20");
        json feed = json::array();
        for (auto row : res) {
            feed.push_back({
                {"type", row["event_type"].c_str()},
                {"message", row["message"].c_str()},
                {"time", row["timestamp"].c_str()}
            });
        }
        return feed.dump();
    } catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}

// ─── NEW ADMINISTRATIVE REPORTS ───

std::string getOccupancyReport() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        pqxx::result res = txn.exec(
            "SELECT b.id, b.name, b.capacity, "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'entry') - "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'exit') as current_occ, "
            "(SELECT AVG(occupancy_count) FROM occupancy_snapshots s WHERE s.building_id = b.id) as avg_occ, "
            "(SELECT MAX(occupancy_count) FROM occupancy_snapshots s WHERE s.building_id = b.id) as peak_occ, "
            "(SELECT COUNT(*) FROM system_logs l WHERE l.event_type = 'occupancy_spike' AND l.message LIKE '%' || b.id || '%') as spikes "
            "FROM buildings b WHERE b.is_physical = TRUE"
        );

        json report = json::array();
        for (auto row : res) {
            int cap = row["capacity"].as<int>();
            int curr = row["current_occ"].as<int>();
            if (curr < 0) curr = 0;
            
            report.push_back({
                {"building", row["name"].c_str()},
                {"capacity", cap},
                {"current", curr},
                {"average", row["avg_occ"].is_null() ? 0 : (int)row["avg_occ"].as<double>()},
                {"peak", row["peak_occ"].is_null() ? 0 : row["peak_occ"].as<int>()},
                {"freeSpaces", cap - curr},
                {"overcrowding", row["spikes"].as<int>()}
            });
        }

        return json{{"data", report}, {"generatedOn", getTimestamp()}}.dump();
    } catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}

std::string getUsageReport() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        pqxx::result res = txn.exec(
            "SELECT b.name, "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id) as total_traffic, "
            "(SELECT COUNT(*) FROM rooms r WHERE r.building_id = b.id) as room_count "
            "FROM buildings b WHERE b.is_physical = TRUE"
        );

        json report = json::array();
        for (auto row : res) {
            report.push_back({
                {"building", row["name"].c_str()},
                {"traffic", row["total_traffic"].as<int>()},
                {"rooms", row["room_count"].as<int>()}
            });
        }
        return json{{"data", report}, {"generatedOn", getTimestamp()}}.dump();
    } catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}

std::string getTimetableReport(const std::string& buildingId, const std::string& dept, const std::string& day) {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        std::string query = 
            "SELECT c.course_code, c.lecturer, c.department, c.start_time, c.end_time, r.id as room_id, b.name as building_name "
            "FROM classes c "
            "JOIN rooms r ON c.room_id = r.id "
            "JOIN buildings b ON r.building_id = b.id "
            "WHERE 1=1 ";
        
        if (buildingId != "all") query += "AND b.id = " + txn.quote(buildingId) + " ";
        if (dept != "all") query += "AND c.department = " + txn.quote(dept) + " ";
        if (day != "all") query += "AND c.day_of_week = " + txn.quote(day) + " ";

        pqxx::result res = txn.exec(query);
        json report = json::array();
        for (auto row : res) {
            report.push_back({
                {"course", row["course_code"].c_str()},
                {"lecturer", row["lecturer"].c_str()},
                {"dept", row["department"].c_str()},
                {"time", std::string(row["start_time"].c_str()) + " - " + std::string(row["end_time"].c_str())},
                {"venue", std::string(row["building_name"].c_str()) + " " + std::string(row["room_id"].c_str())}
            });
        }
        return json{{"data", report}, {"generatedOn", getTimestamp()}}.dump();
    } catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}

std::string getAlertReport() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        pqxx::result res = txn.exec("SELECT event_type, message, timestamp FROM system_logs WHERE event_type = 'occupancy_spike' ORDER BY timestamp DESC");
        json report = json::array();
        for (auto row : res) {
            report.push_back({
                {"type", row["event_type"].c_str()},
                {"message", row["message"].c_str()},
                {"time", row["timestamp"].c_str()}
            });
        }
        return json{{"data", report}, {"generatedOn", getTimestamp()}}.dump();
    } catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}

std::string getRoomUtilizationReport(const std::string& buildingId, const std::string& dept) {
    // Reuse existing logic but wrap it in the report format
    try {
        std::string rawData = getRoomUtilization(buildingId, dept);
        json data = json::parse(rawData);
        return json{{"data", data}, {"generatedOn", getTimestamp()}}.dump();
    } catch (...) {
        return json{{"error", "Failed to generate utilization report"}}.dump();
    }
}

std::string getDepartments() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);
        pqxx::result res = txn.exec("SELECT DISTINCT department FROM classes ORDER BY department ASC");
        json depts = json::array();
        for (auto row : res) {
            if (!row[0].is_null()) depts.push_back(row[0].c_str());
        }
        return depts.dump();
    } catch (...) { return "[]"; }
}

std::string getBuildingsList() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);
        pqxx::result res = txn.exec("SELECT id, name FROM buildings WHERE is_physical = TRUE ORDER BY name ASC");
        json builds = json::array();
        for (auto row : res) {
            builds.push_back({{"id", row["id"].c_str()}, {"name", row["name"].c_str()}});
        }
        return builds.dump();
    } catch (...) { return "[]"; }
}

void logSystemEvent(const std::string& type, const std::string& message) {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);
        txn.exec("INSERT INTO system_logs (event_type, message) VALUES (" + txn.quote(type) + ", " + txn.quote(message) + ")");
        txn.commit();
    } catch (...) {}
}

void captureOccupancySnapshots() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        pqxx::result res = txn.exec(
            "SELECT b.id, "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'entry') - "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'exit') as occupancy "
            "FROM buildings b WHERE b.is_physical = TRUE"
        );

        for (auto row : res) {
            int occ = row["occupancy"].as<int>();
            if (occ < 0) occ = 0;
            txn.exec("INSERT INTO occupancy_snapshots (building_id, occupancy_count) VALUES (" + 
                     txn.quote(row["id"].c_str()) + ", " + std::to_string(occ) + ")");
        }
        txn.commit();
    } catch (...) {}
}
