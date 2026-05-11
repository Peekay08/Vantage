async function login() {
    console.log("LOGIN CLICKED");

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    const params = new URLSearchParams();
    params.append("email", email);
    params.append("password", password);

    try {
        const response = await fetch("http://localhost:8080/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params.toString()
        });

        const data = await response.json();
        console.log(data);

        if (data.success) {
            localStorage.setItem("user", JSON.stringify(data));

            if (data.user && data.user.role === "admin") {
                window.location.href = "../pages/dashboard.html";
            }
            else {
                window.location.href = "../pages/student-dashboard.html";
            }
        } else {
            alert(data.message || "Invalid credentials");
        }
    } catch (e) {
        console.error("Login error:", e);
        alert("Could not connect to server. Please check if backend is running.");
    }
}