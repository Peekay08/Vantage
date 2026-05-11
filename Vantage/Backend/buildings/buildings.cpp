#include "buildings.h"
#include "../database/db.h"
#include "../json.hpp"
#include <pqxx/pqxx>
#include <chrono>
#include <ctime>
#include <vector>

using json = nlohmann::json;

// Helper to get current day of week as string
std::string getCurrentDayOfWeek() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_time = std::chrono::system_clock::to_time_t(now);
    std::tm* local_tm = std::localtime(&now_time);
    const char* days[] = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
    return days[local_tm->tm_wday];
}

// Helper to get current time as HH:MM:SS
std::string getCurrentTime() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_time = std::chrono::system_clock::to_time_t(now);
    std::tm* local_tm = std::localtime(&now_time);
    char buffer[10];
    std::strftime(buffer, sizeof(buffer), "%H:%M:%S", local_tm);
    return std::string(buffer);
}

std::string getStudentBuildings() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        std::string currentDay = getCurrentDayOfWeek();
        std::string currentTime = getCurrentTime();

        pqxx::result res = txn.exec(
            "SELECT b.id, b.name, b.capacity, "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'entry') - "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'exit') as occupancy "
            "FROM buildings b WHERE b.is_physical = TRUE"
        );

        json response = json::array();

        for (auto row : res) {
            std::string buildingId = row["id"].c_str();
            int capacity = row["capacity"].as<int>();
            int occupancy = row["occupancy"].as<int>();
            if (occupancy < 0) occupancy = 0;
            int percentage = capacity > 0 ? (occupancy * 100) / capacity : 0;

            // Fetch rooms for this building and their status
            pqxx::result roomsRes = txn.exec(
                "SELECT r.id, "
                "(SELECT course_code FROM classes c WHERE c.room_id = r.id AND c.day_of_week = " + txn.quote(currentDay) + 
                " AND c.start_time <= " + txn.quote(currentTime) + " AND c.end_time > " + txn.quote(currentTime) + " LIMIT 1) as active_course "
                "FROM rooms r WHERE r.building_id = " + txn.quote(buildingId)
            );

            json rooms = json::array();
            int activeClasses = 0;
            for (auto rrow : roomsRes) {
                bool isUse = !rrow["active_course"].is_null();
                if (isUse) activeClasses++;
                rooms.push_back({
                    {"id", rrow["id"].c_str()},
                    {"status", isUse ? "IN USE" : "FREE"},
                    {"course", isUse ? rrow["active_course"].c_str() : ""}
                });
            }
            int totalRooms = roomsRes.size();
            int freeClasses = totalRooms - activeClasses;

            response.push_back({
                {"id", buildingId},
                {"name", row["name"].c_str()},
                {"capacity", capacity},
                {"currentOccupancy", occupancy},
                {"usagePercentage", percentage},
                {"status", percentage > 70 ? "High Traffic" : "Normal"},
                {"totalRooms", totalRooms},
                {"activeClasses", activeClasses},
                {"freeClasses", freeClasses},
                {"rooms", rooms}
            });
        }

        return response.dump();
    }
    catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}

std::string getAdminBuildings() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        std::string currentDay = getCurrentDayOfWeek();
        std::string currentTime = getCurrentTime();

        pqxx::result res = txn.exec(
            "SELECT b.id, b.name, b.capacity, "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'entry') - "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'exit') as occupancy "
            "FROM buildings b WHERE b.is_physical = TRUE"
        );

        json response = json::array();

        for (auto row : res) {
            int capacity = row["capacity"].as<int>();
            int occupancy = row["occupancy"].as<int>();
            if (occupancy < 0) occupancy = 0;
            std::string buildingId = row["id"].c_str();
            std::string buildingName = row["name"].c_str();

            // Fetch rooms and their status
            pqxx::result roomsRes = txn.exec(
                "SELECT r.id, "
                "(SELECT course_code FROM classes c WHERE c.room_id = r.id AND c.day_of_week = " + txn.quote(currentDay) + 
                " AND c.start_time <= " + txn.quote(currentTime) + " AND c.end_time > " + txn.quote(currentTime) + " LIMIT 1) as active_course "
                "FROM rooms r WHERE r.building_id = " + txn.quote(buildingId)
            );

            json rooms = json::array();
            int activeClasses = 0;
            for (auto rrow : roomsRes) {
                std::string roomId = rrow["id"].c_str();
                bool isUse = !rrow["active_course"].is_null();
                if (isUse) activeClasses++;
                
                rooms.push_back({
                    {"id", roomId},
                    {"status", isUse ? "IN USE" : "FREE"},
                    {"course", isUse ? rrow["active_course"].c_str() : ""}
                });
            }
            int totalRooms = roomsRes.size();
            int freeClasses = totalRooms - activeClasses;

            // Fetch recent entries (last 5)
            pqxx::result entryRes = txn.exec(
                "SELECT u.name as student_name, u.id as student_id, m.timestamp "
                "FROM movement_logs m "
                "LEFT JOIN users u ON m.user_id = u.id "
                "WHERE m.building_id = " + txn.quote(buildingId) + " AND m.type = 'entry' "
                "ORDER BY m.timestamp DESC LIMIT 5"
            );

            json recentEntries = json::array();
            for (auto erow : entryRes) {
                recentEntries.push_back({
                    {"student", erow["student_name"].is_null() ? "Unknown" : erow["student_name"].c_str()},
                    {"studentId", erow["student_id"].is_null() ? "---" : erow["student_id"].c_str()},
                    {"time", erow["timestamp"].c_str()}
                });
            }

            // Fetch recent exits (last 5)
            pqxx::result exitRes = txn.exec(
                "SELECT u.name as student_name, u.id as student_id, m.timestamp "
                "FROM movement_logs m "
                "LEFT JOIN users u ON m.user_id = u.id "
                "WHERE m.building_id = " + txn.quote(buildingId) + " AND m.type = 'exit' "
                "ORDER BY m.timestamp DESC LIMIT 5"
            );

            json recentExits = json::array();
            for (auto xrow : exitRes) {
                recentExits.push_back({
                    {"student", xrow["student_name"].is_null() ? "Unknown" : xrow["student_name"].c_str()},
                    {"studentId", xrow["student_id"].is_null() ? "---" : xrow["student_id"].c_str()},
                    {"time", xrow["timestamp"].c_str()}
                });
            }

            // Fetch ALL classes in this building for reference
            pqxx::result classRes = txn.exec(
                "SELECT c.course_code, c.day_of_week, c.start_time, c.end_time, r.id as room_id "
                "FROM classes c "
                "JOIN rooms r ON c.room_id = r.id "
                "WHERE r.building_id = " + txn.quote(buildingId)
            );

            json classes = json::array();
            for (auto crow : classRes) {
                classes.push_back({
                    {"course", crow["course_code"].c_str()},
                    {"day", crow["day_of_week"].c_str()},
                    {"time", std::string(crow["start_time"].c_str()) + " - " + std::string(crow["end_time"].c_str())},
                    {"room", crow["room_id"].c_str()}
                });
            }

            response.push_back({
                {"id", buildingId},
                {"name", buildingName},
                {"capacity", capacity},
                {"currentOccupancy", occupancy},
                {"status", occupancy > (int)(capacity * 0.8) ? "High Traffic" : "Normal"},
                {"recentEntries", recentEntries},
                {"recentExits", recentExits},
                {"classes", classes},
                {"rooms", rooms},
                {"totalRooms", totalRooms},
                {"activeClasses", activeClasses},
                {"freeClasses", freeClasses}
            });
        }

        return response.dump();
    }
    catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}