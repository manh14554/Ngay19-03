const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { generateKeyPairSync } = require("crypto");

let cachedKeys = null;

function resolveFromCwd(filePath) {
  if (path.isAbsolute(filePath)) return filePath;
  return path.join(process.cwd(), filePath);
}

function getKeyPaths() {
  let privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || "keys/jwtRS256.key";
  let publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || "keys/jwtRS256.key.pub";
  return {
    privateKeyPath: resolveFromCwd(privateKeyPath),
    publicKeyPath: resolveFromCwd(publicKeyPath),
  };
}

function ensureDevKeysExist(privateKeyPath, publicKeyPath) {
  if (process.env.NODE_ENV === "production") return;

  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) return;

  fs.mkdirSync(path.dirname(privateKeyPath), { recursive: true });

  let { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  if (!fs.existsSync(privateKeyPath)) {
    fs.writeFileSync(privateKeyPath, privateKey, { encoding: "utf8" });
  }
  if (!fs.existsSync(publicKeyPath)) {
    fs.writeFileSync(publicKeyPath, publicKey, { encoding: "utf8" });
  }
}

function loadKeys() {
  if (cachedKeys) return cachedKeys;

  let { privateKeyPath, publicKeyPath } = getKeyPaths();
  ensureDevKeysExist(privateKeyPath, publicKeyPath);

  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    throw new Error(
      "Missing RS256 keys. Create keys/jwtRS256.key and keys/jwtRS256.key.pub (or set JWT_PRIVATE_KEY_PATH/JWT_PUBLIC_KEY_PATH)."
    );
  }

  cachedKeys = {
    privateKey: fs.readFileSync(privateKeyPath, "utf8"),
    publicKey: fs.readFileSync(publicKeyPath, "utf8"),
  };
  return cachedKeys;
}

module.exports = {
  signAccessToken: function (payload, options = {}) {
    let { privateKey } = loadKeys();
    return jwt.sign(payload, privateKey, {
      algorithm: "RS256",
      ...options,
    });
  },
  verifyAccessToken: function (token, options = {}) {
    let { publicKey } = loadKeys();
    return jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
      ...options,
    });
  },
};

