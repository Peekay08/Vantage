#include "auth.h"
#include "../database/db.h"
#include "../json.hpp"
#include <pqxx/pqxx>
#include <string>
#include <iostream>

using json = nlohmann::json;

std::string loginUser(const std::string& email, const std::string& password) {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        // Include department in the query
        pqxx::result res = txn.exec(
            "SELECT id, name, role, department FROM users WHERE email = " +
            txn.quote(email) +
            " AND password = " +
            txn.quote(password)
        );

        if (res.empty()) {
            json errorResponse = {
                {"success", false},
                {"message", "Invalid credentials"}
            };
            return errorResponse.dump();
        }

        auto row = res[0];

        // Construct the expected JSON response
        json successResponse = {
            {"success", true},
            {"token", "DUMMY_JWT_TOKEN_123"}, // Dummy token for now
            {"user", {
                {"id", row["id"].c_str()},
                {"name", row["name"].c_str()},
                {"role", row["role"].c_str()},
                {"department", row["department"].c_str()}
            }}
        };

        return successResponse.dump();
    }
    catch (const std::exception& e) {
        json errorResponse = {
            {"success", false},
            {"error", e.what()}
        };
        return errorResponse.dump();
    }
}