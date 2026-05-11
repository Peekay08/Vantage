#include "timetable.h"
#include "../database/db.h"
#include "../json.hpp"
#include <pqxx/pqxx>

using json = nlohmann::json;

std::string getStudentTimetable(const std::string& studentId) {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        pqxx::result res = txn.exec(
            "SELECT c.course_code, c.day_of_week as day, c.start_time as time, b.name as building, r.id as room "
            "FROM student_classes sc "
            "JOIN classes c ON sc.class_id = c.id "
            "JOIN rooms r ON c.room_id = r.id "
            "JOIN buildings b ON r.building_id = b.id "
            "WHERE sc.student_id = " + txn.quote(studentId)
        );

        json response = json::array();

        for (auto row : res) {
            response.push_back({
                {"course", row["course_code"].c_str()},
                {"day", row["day"].c_str()},
                {"time", row["time"].c_str()},
                {"venue", std::string(row["building"].c_str()) + " " + std::string(row["room"].c_str())}
            });
        }

        return response.dump();
    }
    catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}

std::string getAdminTimetable() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        pqxx::result res = txn.exec(
            "SELECT c.course_code, c.day_of_week as day, c.start_time as time, b.name as building, r.id as room "
            "FROM classes c "
            "JOIN rooms r ON c.room_id = r.id "
            "JOIN buildings b ON r.building_id = b.id "
        );

        json response = json::array();

        for (auto row : res) {
            response.push_back({
                {"course", row["course_code"].c_str()},
                {"day", row["day"].c_str()},
                {"time", row["time"].c_str()},
                {"venue", std::string(row["building"].c_str()) + " " + std::string(row["room"].c_str())}
            });
        }

        return response.dump();
    }
    catch (const std::exception& e) {
        return json{{"error", e.what()}}.dump();
    }
}