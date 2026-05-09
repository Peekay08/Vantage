async function login() {
    console.log("LOGIN CLICKED");

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const response = await fetch("http://localhost:8080/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `email=${email}&password=${password}`
    });

    const data = await response.json();

    console.log(data);

    if (data.success) {

        localStorage.setItem("user", JSON.stringify(data));

        if (data.role === "admin") {
            window.location.href = "../pages/dashboard.html";
        }
        else {
            window.location.href = "../pages/student-dashboard.html";
        }

    } else {
        alert("Invalid credentials");
    }
}