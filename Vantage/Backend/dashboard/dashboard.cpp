#include "dashboard.h"
#include "../database/db.h"
#include "../json.hpp"
#include <pqxx/pqxx>
#include <chrono>
#include <ctime>

using json = nlohmann::json;

// Helper to get current day of week as string
static std::string getCurrentDayOfWeek() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_time = std::chrono::system_clock::to_time_t(now);
    std::tm* local_tm = std::localtime(&now_time);
    const char* days[] = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
    return days[local_tm->tm_wday];
}

// Helper to get current time as HH:MM:SS
static std::string getCurrentTime() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_time = std::chrono::system_clock::to_time_t(now);
    std::tm* local_tm = std::localtime(&now_time);
    char buffer[10];
    std::strftime(buffer, sizeof(buffer), "%H:%M:%S", local_tm);
    return std::string(buffer);
}

std::string getStudentDashboard(const std::string& studentId) {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        std::string currentDay = getCurrentDayOfWeek();
        std::string currentTime = getCurrentTime();

        // Fetch User Info
        pqxx::result userRes = txn.exec(
            "SELECT name, department FROM users WHERE id = " + txn.quote(studentId)
        );

        if (userRes.empty()) {
            return json{{"error", "User not found"}}.dump();
        }

        // Fetch Today's Classes
        pqxx::result classesRes = txn.exec(
            "SELECT c.course_code, c.start_time, c.end_time, r.id as room_id, b.name as building_name "
            "FROM student_classes sc "
            "JOIN classes c ON sc.class_id = c.id "
            "JOIN rooms r ON c.room_id = r.id "
            "JOIN buildings b ON r.building_id = b.id "
            "WHERE sc.student_id = " + txn.quote(studentId) + " AND c.day_of_week = " + txn.quote(currentDay) + " "
            "ORDER BY c.start_time"
        );

        json todayClasses = json::array();
        json nextClass = nullptr;

        for (auto row : classesRes) {
            std::string startTime = row["start_time"].c_str();
            json classObj = {
                {"course", row["course_code"].c_str()},
                {"time", startTime},
                {"venue", std::string(row["building_name"].c_str()) + " " + std::string(row["room_id"].c_str())}
            };
            todayClasses.push_back(classObj);

            // Find the next upcoming class
            if (nextClass.is_null() && startTime > currentTime) {
                nextClass = classObj;
            }
        }
        
        // If no upcoming classes today, take the first class of tomorrow? (Keep it simple for now: first of today if nothing left)
        if (nextClass.is_null() && !todayClasses.empty()) {
             // Already past all classes, nextClass stays null
        }

        // Fetch Notifications
        pqxx::result notifRes = txn.exec("SELECT message FROM notifications ORDER BY created_at DESC LIMIT 5");
        json notifications = json::array();
        for (auto row : notifRes) {
            notifications.push_back({{"message", row["message"].c_str()}});
        }

        json response = {
            {"student", {
                {"name", userRes[0]["name"].c_str()},
                {"department", userRes[0]["department"].c_str()}
            }},
            {"attendanceRate", 87}, // Mocked
            {"nextClass", nextClass},
            {"todayClasses", todayClasses},
            {"notifications", notifications}
        };

        return response.dump();
    } catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}

std::string getAdminDashboard() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        std::string currentDay = getCurrentDayOfWeek();
        std::string currentTime = getCurrentTime();

        // 1. Total Buildings
        pqxx::result bldgCountRes = txn.exec("SELECT COUNT(*) FROM buildings");
        int totalBuildings = bldgCountRes[0][0].as<int>();

        // 2. Total Rooms
        pqxx::result roomCountRes = txn.exec("SELECT COUNT(*) FROM rooms");
        int totalRooms = roomCountRes[0][0].as<int>();

        // 3. Active Classes (Rooms currently in use by a class)
        pqxx::result activeClassesRes = txn.exec(
            "SELECT COUNT(*) FROM classes "
            "WHERE day_of_week = " + txn.quote(currentDay) + " "
            "AND start_time <= " + txn.quote(currentTime) + " "
            "AND end_time > " + txn.quote(currentTime)
        );
        int activeClasses = activeClassesRes[0][0].as<int>();

        // 4. Available Rooms
        int availableRooms = totalRooms - activeClasses;

        // Fetch Building Usage for Chart/List
        pqxx::result buildRes = txn.exec(
            "SELECT b.id, b.name, b.capacity, "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'entry') - "
            "(SELECT COUNT(*) FROM movement_logs m WHERE m.building_id = b.id AND m.type = 'exit') as occupancy "
            "FROM buildings b"
        );

        json buildingUsage = json::array();
        for (auto row : buildRes) {
            int capacity = row["capacity"].as<int>();
            int occupancy = row["occupancy"].as<int>();
            int percentage = capacity > 0 ? (occupancy * 100) / capacity : 0;

            buildingUsage.push_back({
                {"building", row["name"].c_str()},
                {"occupancyPercentage", percentage}
            });
        }

        // Fetch Live Activity (Recent movement logs)
        pqxx::result activityRes = txn.exec(
            "SELECT b.name as building_name, m.type, m.timestamp "
            "FROM movement_logs m "
            "JOIN buildings b ON m.building_id = b.id "
            "ORDER BY m.timestamp DESC LIMIT 15"
        );

        json alerts = json::array();
        for (auto row : activityRes) {
            std::string type = row["type"].c_str();
            std::string building = row["building_name"].c_str();
            
            alerts.push_back(json{
                {"type", type},
                {"building", building}
            });
        }

        json response = {
            {"totalBuildings", totalBuildings},
            {"totalRooms", totalRooms},
            {"activeClasses", activeClasses},
            {"availableRooms", availableRooms},
            {"buildingUsage", buildingUsage},
            {"alerts", alerts}
        };

        return response.dump();
    } catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}
