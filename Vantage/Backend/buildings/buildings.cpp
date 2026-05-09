#include "buildings/buildings.h"
#include "../database/db.h"
#include <pqxx/pqxx>
#include <string>

std::string getBuildingsSummary() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        pqxx::result res = txn.exec(R"(
            SELECT 
                b.id,
                b.name,
                COALESCE(SUM(r.capacity), 0) AS capacity
            FROM buildings b
            LEFT JOIN rooms r ON b.id = r.building_id
            GROUP BY b.id, b.name
        )");

        std::string result = "[";
        bool first = true;

        for (auto row : res) {
            if (!first) result += ",";
            first = false;

            result += "{";
            result += "\"id\":" + std::string(row["id"].c_str()) + ",";
            result += "\"name\":\"" + std::string(row["name"].c_str()) + "\",";
            result += "\"capacity\":" + std::string(row["capacity"].c_str());
            result += "}";
        }

        result += "]";

        return result;
    }
    catch (const std::exception& e) {
        return std::string("{\"error\":\"") + e.what() + "\"}";
    }
}