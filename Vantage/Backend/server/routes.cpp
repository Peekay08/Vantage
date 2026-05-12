#include "server/routes.h"
#include "auth/auth.h"
#include "buildings/buildings.h"
#include "dashboard/dashboard.h"
#include "timetable/timetable.h"
#include "simulation/simulator.h"
#include "analytics/analytics.h"
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

    // ---------------- ANALYTICS ----------------
    app.Get("/api/analytics/overview", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(getAnalyticsOverview(), "application/json");
    });

    app.Get("/api/analytics/occupancy-trends", [](const httplib::Request& req, httplib::Response& res) {
        std::string building = req.get_param_value("building");
        if (building.empty()) building = "all";
        res.set_content(getOccupancyTrends(building, "today"), "application/json");
    });

    app.Get("/api/analytics/building-rankings", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(getBuildingRankings(), "application/json");
    });

    app.Get("/api/analytics/room-utilization", [](const httplib::Request& req, httplib::Response& res) {
        std::string building = req.get_param_value("building");
        std::string dept = req.get_param_value("dept");
        if (building.empty()) building = "all";
        if (dept.empty()) dept = "all";
        res.set_content(getRoomUtilization(building, dept), "application/json");
    });

    app.Get("/api/analytics/activity-feed", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(getActivityFeed(), "application/json");
    });

    app.Get("/api/analytics/peak-hours", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(getPeakHours(), "application/json");
    });

    app.Get("/api/analytics/departments", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(getDepartments(), "application/json");
    });

    app.Get("/api/analytics/buildings", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(getBuildingsList(), "application/json");
    });

    // ---------------- REPORTS ----------------
    app.Get("/api/reports/occupancy", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(getOccupancyReport(), "application/json");
    });

    app.Get("/api/reports/usage", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(getUsageReport(), "application/json");
    });

    app.Get("/api/reports/room-utilization", [](const httplib::Request& req, httplib::Response& res) {
        std::string b = req.get_param_value("building");
        std::string d = req.get_param_value("dept");
        if (b.empty()) b = "all";
        if (d.empty()) d = "all";
        res.set_content(getRoomUtilizationReport(b, d), "application/json");
    });

    app.Get("/api/reports/timetable", [](const httplib::Request& req, httplib::Response& res) {
        std::string b = req.get_param_value("building");
        std::string d = req.get_param_value("dept");
        std::string day = req.get_param_value("day");
        if (b.empty()) b = "all";
        if (d.empty()) d = "all";
        if (day.empty()) day = "all";
        res.set_content(getTimetableReport(b, d, day), "application/json");
    });

    app.Get("/api/reports/alerts", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(getAlertReport(), "application/json");
    });

    app.listen("0.0.0.0", 8080);
}