#include <iostream>
#include "server/routes.h"

int main() {
    std::cout << "[SERVER] Starting backend...\n";

    startServer();

    return 0;
}