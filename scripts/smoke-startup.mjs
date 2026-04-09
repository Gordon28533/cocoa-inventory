import process from "node:process";

function parseArgs(argv) {
  const options = {
    baseUrl: process.env.SMOKE_BASE_URL || "http://127.0.0.1:5000",
    staffName: process.env.SMOKE_STAFF_NAME || "",
    password: process.env.SMOKE_PASSWORD || "",
    skipLogin: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--url" && argv[index + 1]) {
      options.baseUrl = argv[index + 1];
      index += 1;
    } else if (arg === "--staff-name" && argv[index + 1]) {
      options.staffName = argv[index + 1];
      index += 1;
    } else if (arg === "--password" && argv[index + 1]) {
      options.password = argv[index + 1];
      index += 1;
    } else if (arg === "--skip-login") {
      options.skipLogin = true;
    }
  }

  return options;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  return { response, data };
}

function logPass(message) {
  console.log(`PASS ${message}`);
}

function logFail(message) {
  console.error(`FAIL ${message}`);
}

async function run() {
  const { baseUrl, staffName, password, skipLogin } = parseArgs(process.argv.slice(2));
  const trimmedBaseUrl = baseUrl.replace(/\/+$/, "");
  const shouldSkipLogin = skipLogin || (!staffName && !password);

  console.log(`Smoke check target: ${trimmedBaseUrl}`);

  const { response: healthResponse, data: healthData } = await requestJson(`${trimmedBaseUrl}/health`);

  if (!healthResponse.ok) {
    throw new Error(`Health check failed with HTTP ${healthResponse.status}`);
  }

  if (healthData.status !== "ok") {
    throw new Error(`Unexpected health status: ${JSON.stringify(healthData)}`);
  }

  logPass(`/health returned ok with database=${healthData.database}`);

  if (shouldSkipLogin) {
    console.log("Login smoke check skipped.");
    return;
  }

  if (!staffName || !password) {
    throw new Error("Login smoke check requires --staff-name and --password, or set SMOKE_STAFF_NAME and SMOKE_PASSWORD");
  }

  const { response: loginResponse, data: loginData } = await requestJson(`${trimmedBaseUrl}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ staffName, password })
  });

  if (!loginResponse.ok) {
    throw new Error(`Login failed with HTTP ${loginResponse.status}: ${JSON.stringify(loginData)}`);
  }

  if (!loginData.success || typeof loginData.token !== "string" || loginData.token.length < 20) {
    throw new Error(`Unexpected login response: ${JSON.stringify(loginData)}`);
  }

  logPass(`/login returned a token for ${staffName}`);
}

run().catch((error) => {
  logFail(error.message);
  process.exitCode = 1;
});
