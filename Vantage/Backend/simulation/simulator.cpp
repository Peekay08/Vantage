#include "simulator.h"
#include "analytics/analytics.h"
#include "../database/db.h"
#include <pqxx/pqxx>
#include <thread>
#include <chrono>
#include <iostream>
#include <random>
#include <ctime>
#include <vector>

static std::vector<std::string> getAllUserIds(pqxx::work& txn) {
    pqxx::result res = txn.exec("SELECT id FROM users WHERE role = 'student'");
    std::vector<std::string> ids;
    for (auto row : res) {
        ids.push_back(row[0].as<std::string>());
    }
    std::cout << "[SIMULATOR] Found " << ids.size() << " students in database.\n";
    return ids;
}

void initializeOccupancy() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        std::cout << "[SIMULATOR] Initializing building occupancy states...\n";

        // Clear previous movement logs for a fresh start
        txn.exec("DELETE FROM movement_logs");

        pqxx::result buildingsRes = txn.exec("SELECT id, capacity FROM buildings WHERE is_physical = TRUE");
        std::vector<std::string> userIds = getAllUserIds(txn);
        
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> dist(5, 60); 
        std::uniform_int_distribution<> userDist(0, userIds.empty() ? 0 : userIds.size() - 1);

        int count = 0;
        for (auto row : buildingsRes) {
            std::string buildingId = row["id"].c_str();
            int capacity = row["capacity"].as<int>();
            int percentage = 0;

            if (count == 0) percentage = 88;      
            else if (count == 1) percentage = 55; 
            else if (count == 2) percentage = 12; 
            else percentage = dist(gen);          

            int startingOccupancy = (capacity * percentage) / 100;

            for (int i = 0; i < startingOccupancy; ++i) {
                std::string userId = userIds.empty() ? "" : userIds[userDist(gen)];
                txn.exec("INSERT INTO movement_logs (building_id, user_id, type) VALUES (" + 
                         txn.quote(buildingId) + ", " + (userId.empty() ? "NULL" : txn.quote(userId)) + ", 'entry')");
            }
            std::cout << " - Building " << buildingId << ": Initialized with " << startingOccupancy 
                      << " people (" << percentage << "%).\n";
            count++;
        }

        txn.commit();
        std::cout << "[SIMULATOR] Initialization complete.\n";
    } catch (const std::exception& e) {
        std::cerr << "[SIMULATOR ERROR] Initialization failed: " << e.what() << "\n";
    }
}

void runSimulationTick() {
    try {
        pqxx::connection conn(getConnectionString());
        pqxx::work txn(conn);

        pqxx::result buildingsRes = txn.exec("SELECT id, capacity FROM buildings");
        if (buildingsRes.empty()) return;

        std::vector<std::string> userIds = getAllUserIds(txn);

        // Get current hour for time-of-day awareness
        auto now = std::chrono::system_clock::now();
        std::time_t now_time = std::chrono::system_clock::to_time_t(now);
        std::tm* local_tm = std::localtime(&now_time);
        int hour = local_tm->tm_hour;

        // Activity multiplier based on time of day
        double entryWeight = 0.5;
        int maxEventsPerBuilding = 3;

        if (hour >= 6 && hour < 9) {
            entryWeight = 0.85; 
            maxEventsPerBuilding = 6;
        } else if (hour >= 9 && hour < 16) {
            entryWeight = 0.55; 
            maxEventsPerBuilding = 4;
        } else if (hour >= 16 && hour < 19) {
            entryWeight = 0.20; 
            maxEventsPerBuilding = 8;
        } else {
            entryWeight = 0.10; 
            maxEventsPerBuilding = 2;
        }

        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_real_distribution<> probDist(0.0, 1.0);
        std::uniform_int_distribution<> userDist(0, userIds.empty() ? 0 : userIds.size() - 1);

        for (auto bldgRow : buildingsRes) {
            std::string buildingId = bldgRow["id"].c_str();
            int capacity = bldgRow["capacity"].as<int>();

            // Get current occupancy
            pqxx::result occRes = txn.exec(
                "SELECT "
                "(SELECT COUNT(*) FROM movement_logs WHERE building_id = " + txn.quote(buildingId) + " AND type = 'entry') - "
                "(SELECT COUNT(*) FROM movement_logs WHERE building_id = " + txn.quote(buildingId) + " AND type = 'exit') as occupancy"
            );
            int currentOccupancy = occRes[0]["occupancy"].as<int>();

            // Determine number of events for this building (0 to max)
            std::uniform_int_distribution<> eventCountDist(0, maxEventsPerBuilding);
            int events = eventCountDist(gen);

            for (int i = 0; i < events; ++i) {
                std::string action;
                
                // Adjust weight based on current occupancy
                double currentEntryWeight = entryWeight;
                if (currentOccupancy >= capacity) currentEntryWeight = 0.0; 
                else if (currentOccupancy <= 0) currentEntryWeight = 1.0;   

                if (probDist(gen) < currentEntryWeight) {
                    action = "entry";
                    currentOccupancy++;
                } else {
                    action = "exit";
                    currentOccupancy--;
                }

                if (currentOccupancy < 0) {
                    currentOccupancy = 0;
                    continue; 
                }

                std::string userId = userIds.empty() ? "" : userIds[userDist(gen)];

                txn.exec(
                    "INSERT INTO movement_logs (building_id, user_id, type) VALUES (" +
                    txn.quote(buildingId) + ", " + (userId.empty() ? "NULL" : txn.quote(userId)) + ", " + txn.quote(action) + ")"
                );

                // LOG SPIKES
                if (action == "entry" && currentOccupancy >= (int)(capacity * 0.9)) {
                    logSystemEvent("occupancy_spike", "High capacity reached in " + buildingId);
                }
            }
        }

        txn.commit();
    } catch (const std::exception& e) {
        std::cerr << "[SIMULATOR ERROR] Tick failed: " << e.what() << "\n";
    }
}

static int tickCounter = 0;
void startSimulationThread() {
    initializeOccupancy();
    logSystemEvent("simulation_start", "Campus simulation engine initialized");

    std::thread([]() {
        std::cout << "[SIMULATOR] Simulation thread started.\n";
        while (true) {
            std::this_thread::sleep_for(std::chrono::seconds(10));
            runSimulationTick();

            tickCounter++;
            if (tickCounter >= 6) { // Every 1 minute (6 * 10s)
                captureOccupancySnapshots();
                tickCounter = 0;
            }
        }
    }).detach();
}
