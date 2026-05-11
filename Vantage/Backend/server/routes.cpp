#include "server/routes.h"
#include "auth/auth.h"
#include "buildings/buildings.h"
#include "dashboard/dashboard.h"
#include "timetable/timetable.h"
#include "simulation/simulator.h"
#include "httplib.h"
#include "../json.hpp"
#include <iostream>

using json = nlohmann::json;

// Simple mock for auth check
std::string getUserIdFromReq(const httplib::Request& req) {
    if (req.has_header("Authorization")) {
        return "1"; // Mocked student ID for now
    }
    return "1"; // Fallback for easy testing without token
}

void startServer() {
    httplib::Server app;

    std::cout << "[SERVER] Starting Simulation Engine...\n";
    startSimulationThread();

    std::cout << "[SERVER] Listening on port 8080...\n";

    // Add CORS globally
    app.set_post_routing_handler([](const httplib::Request&, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    });

    app.Options(R"(.*)", [](const httplib::Request&, httplib::Response& res) {
        res.status = 200;
    });

    // ---------------- AUTH ----------------
    app.Post("/api/login", [](const httplib::Request& req, httplib::Response& res) {
        std::string email = req.get_param_value("email");
        std::string password = req.get_param_value("password");

        // Try parsing JSON if form-data is empty
        if (email.empty() && !req.body.empty()) {
            try {
                auto j = json::parse(req.body);
                if (j.contains("email")) email = j["email"];
                if (j.contains("password")) password = j["password"];
            } catch (...) {}
        }

        std::string result = loginUser(email, password);
        res.set_content(result, "application/json");
    });

    app.Post("/api/logout", [](const httplib::Request& req, httplib::Response& res) {
        json response = {{"success", true}, {"message", "Logged out successfully"}};
        res.set_content(response.dump(), "application/json");
    });

    // ---------------- DASHBOARD ----------------
    app.Get("/api/dashboard/student", [](const httplib::Request& req, httplib::Response& res) {
        std::string studentId = getUserIdFromReq(req);
        std::string result = getStudentDashboard(studentId);
        res.set_content(result, "application/json");
    });

    app.Get("/api/dashboard/admin", [](const httplib::Request&, httplib::Response& res) {
        std::string result = getAdminDashboard();
        res.set_content(result, "application/json");
    });

    // ---------------- BUILDINGS ----------------
    app.Get("/api/buildings/student", [](const httplib::Request&, httplib::Response& res) {
        std::string result = getStudentBuildings();
        res.set_content(result, "application/json");
    });

    app.Get("/api/buildings/admin", [](const httplib::Request&, httplib::Response& res) {
        std::string result = getAdminBuildings();
        res.set_content(result, "application/json");
    });

    // ---------------- TIMETABLE ----------------
    app.Get(R"(/api/timetable/student/(.+))", [](const httplib::Request& req, httplib::Response& res) {
        std::string studentId = req.matches[1];
        std::string result = getStudentTimetable(studentId);
        res.set_content(result, "application/json");
    });

    app.Get("/api/timetable/student", [](const httplib::Request& req, httplib::Response& res) {
        std::string studentId = getUserIdFromReq(req);
        std::string result = getStudentTimetable(studentId);
        res.set_content(result, "application/json");
    });

    app.Get("/api/timetable/admin", [](const httplib::Request&, httplib::Response& res) {
        std::string result = getAdminTimetable();
        res.set_content(result, "application/json");
    });

    app.listen("0.0.0.0", 8080);
}