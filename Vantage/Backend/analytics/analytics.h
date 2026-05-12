#pragma once
#include <string>

// Core Analytics
std::string getAnalyticsOverview();
std::string getOccupancyTrends(const std::string& buildingId, const std::string& range);
std::string getBuildingRankings();
std::string getRoomUtilization(const std::string& buildingId, const std::string& filter);
std::string getActivityFeed();
std::string getPeakHours();

// Professional Reports
std::string getOccupancyReport();
std::string getUsageReport();
std::string getTimetableReport(const std::string& buildingId, const std::string& dept, const std::string& day);
std::string getRoomUtilizationReport(const std::string& buildingId, const std::string& dept);
std::string getAlertReport();

// Metadata for filters
std::string getDepartments();
std::string getBuildingsList();

// Support
void logSystemEvent(const std::string& type, const std::string& message);
void captureOccupancySnapshots();
