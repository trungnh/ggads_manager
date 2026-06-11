import https from "https";

async function main() {
  console.log("=== Checking https://localhost:443 with https.get ===");

  const options = {
    hostname: "127.0.0.1",
    port: 443,
    path: "/",
    method: "GET",
    rejectUnauthorized: false
  };

  const req = https.request(options, (res) => {
    console.log("Response Status:", res.statusCode);
    console.log("Response Headers:", JSON.stringify(res.headers, null, 2));

    let body = "";
    res.on("data", (chunk) => {
      body += chunk;
    });
    res.on("end", () => {
      console.log("Body starts with:", body.substring(0, 300));
      process.exit(0);
    });
  });

  req.on("error", (e) => {
    console.error("Connection failed with error:", e.message || e);
    process.exit(0);
  });

  req.end();
}

main();
