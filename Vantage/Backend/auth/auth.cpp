#include "auth/auth.h"
#include "../database/db.h"
#include <pqxx/pqxx>
#include <string>

std::string loginUser(const std::string& email, const std::string& password) {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        pqxx::result res = txn.exec(
            "SELECT id, name, role FROM users WHERE email = " +
            txn.quote(email) +
            " AND password = " +
            txn.quote(password)
        );

        if (res.empty()) {
            return R"({"success":false,"message":"Invalid credentials"})";
        }

        auto row = res[0];

        return
            "{"
            "\"success\":true,"
            "\"id\":" + std::string(row["id"].c_str()) + ","
            "\"name\":\"" + std::string(row["name"].c_str()) + "\","
            "\"role\":\"" + std::string(row["role"].c_str()) + "\""
            "}";
    }
    catch (const std::exception& e) {
        return std::string("{\"error\":\"") + e.what() + "\"}";
    }
}