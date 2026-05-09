#include "timetable/timetable.h"
#include "../database/db.h"
#include <pqxx/pqxx>
#include <string>

std::string getStudentTimetable(int studentId) {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        pqxx::result res = txn.exec(
            "SELECT course_code, day, time, venue "
            "FROM timetable "
            "WHERE student_id = " + txn.quote(studentId)
        );

        std::string result = "[";
        bool first = true;

        for (auto row : res) {
            if (!first) result += ",";
            first = false;

            result += "{";
            result += "\"course\":\"" + std::string(row["course_code"].c_str()) + "\",";
            result += "\"day\":\"" + std::string(row["day"].c_str()) + "\",";
            result += "\"time\":\"" + std::string(row["time"].c_str()) + "\",";
            result += "\"venue\":\"" + std::string(row["venue"].c_str()) + "\"";
            result += "}";
        }

        result += "]";

        return result;
    }
    catch (const std::exception& e) {
        return std::string("{\"error\":\"") + e.what() + "\"}";
    }
}