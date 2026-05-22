const { createServer } = require("http");
const next = require("next");
const fs = require("fs");
const path = require("path");

const SOCKET = "/tmp/rave_ravesoft.sock";
const dir = path.join(__dirname);
const app = next({ dev: false, dir });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Remove stale socket file
  if (fs.existsSync(SOCKET)) {
    fs.unlinkSync(SOCKET);
  }

  createServer((req, res) => {
    // Ensure Next.js always sees the real hostname, not "localhost"
    req.headers["host"] = "ravesoftsolutions.com";
    handle(req, res);
  }).listen(SOCKET, (err) => {
    if (err) throw err;
    // Allow Apache/nginx to read the socket
    fs.chmodSync(SOCKET, "777");
    console.log("> RaveSoft ready on unix socket:", SOCKET);
  });
});
