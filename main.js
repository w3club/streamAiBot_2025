import fs from "fs";
import { generateDeviceId, loadProxies, loadFile } from "./utils/scripts.js";
import { Gateway } from "./utils/gateway.js";
import log from "./utils/logger.js";
import banner from "./utils/banner.js";
import { User } from "./utils/userService.js";

const PROXIES_FILE = "proxy.txt";
const DEVICES_FILE = "deviceIds.json";
const USERS_FILE = "accounts.txt";
const SERVER = "gw0.streamapp365.com";

const proxies = loadProxies(PROXIES_FILE);

async function setupGatewaysForUser(user, email, index = 0, deviceIds = {}) {
  const userGateways = [];
  const proxy = proxies[index];
  const multipleProxy = proxy?.split(",");
  for (let p = 0; p < multipleProxy?.length; p++) {
    const proxy = multipleProxy[p];
    const deviceId = deviceIds[proxy] || generateDeviceId();
    try {
      log.info(
        `Connecting to Gateway ${p + 1} for User ${email} using ${
          deviceIds[proxy] ? "existed" : "new"
        } Device ID: ${deviceId} via Proxy: ${proxy}`
      );
      const gateway = new Gateway(SERVER, user, deviceId, proxy);
      userGateways.push(gateway);
      if (!fs.existsSync(DEVICES_FILE)) {
        fs.writeFileSync(DEVICES_FILE, JSON.stringify({ [proxy]: deviceId })); // 创建新文件并写入键值对
      } else {
        const fileContent = JSON.parse(fs.readFileSync(DEVICES_FILE, "utf-8"));
        // 更新或添加键值对
        fileContent[proxy] = deviceId;
        fs.writeFileSync(DEVICES_FILE, JSON.stringify(fileContent)); // 重新写入文件
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (err) {
      log.error(
        `Failed to connect Gateway ${p + 1} for User ${user}: ${err.message}`
      );
    }
  }
  return userGateways;
}

async function getUsersUUid(users) {
  const requests = users.map(async (user) => {
    const [email, password] = user?.split("|");
    const userInstance = new User(email, password);
    await userInstance.login(email, password);
    const uuid = await userInstance.getUserInfo();
    return uuid;
  });
  const result = await Promise.all(requests);
  return result;
}

async function main() {
  log.info(banner);
  const USERS = loadFile(USERS_FILE);
  const userUUids = await getUsersUUid(USERS);

  let deviceIds = {};

  if (fs.existsSync(DEVICES_FILE)) {
    deviceIds = JSON.parse(fs.readFileSync(DEVICES_FILE, "utf-8"));
  } else {
    log.warn(`File ${DEVICES_FILE} does not exist. Using empty deviceIds.`);
  }

  try {
    log.info("Setting up gateways for all users...");

    const results = await Promise.allSettled(
      userUUids.map((user, index) => {
        console.log(user, index);
        return setupGatewaysForUser(
          user,
          USERS[index].split("|")?.[0],
          index,
          deviceIds
        );
      })
    );

    results.forEach((result, index) => {
      const [email] = USERS[index].split("|");
      if (result.status === "fulfilled") {
        log.info(
          `User ${email}: Successfully set up ${result.value.length} gateways.`
        );
      } else {
        log.error(
          `User ${email}: Failed to set up gateways. Reason: ${result.reason}`
        );
      }
    });

    log.info("All user gateway setups attempted.");

    process.on("SIGINT", () => {
      log.info("Cleaning up gateways...");
      results
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value)
        .forEach((gateway, index) => {
          if (gateway.ws) {
            log.info(`Closing Gateway ${index + 1}`);
            gateway.ws.close();
          }
        });
      process.exit();
    });
  } catch (error) {
    log.error("Unexpected error during gateway setup:", error);
  }
}

// Run
main().catch((error) => log.error("Unexpected error:", error));
