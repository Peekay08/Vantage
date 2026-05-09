#include "server/routes.h"
#include "auth/auth.h"
#include "buildings/buildings.h"
#include "httplib.h"
#include <iostream>

void startServer() {
    httplib::Server app;

    std::cout << "[SERVER] Listening on port 8080...\n";

    // ---------------- LOGIN ----------------
    app.Post("/login", [](const httplib::Request& req, httplib::Response& res) {

        std::string email = req.get_param_value("email");
        std::string password = req.get_param_value("password");

        std::string result = loginUser(email, password);

        res.set_content(result, "application/json");
        });

    // ---------------- BUILDINGS ----------------
    app.Get("/buildings", [](const httplib::Request&, httplib::Response& res) {

        std::string result = getBuildingsSummary();

        res.set_content(result, "application/json");
        });

    app.listen("0.0.0.0", 8080);
}