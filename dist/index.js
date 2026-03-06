"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/router/router.ts
function matchRoute(pattern, url) {
  const urlPath = url.split("?")[0] ?? url;
  const patternParts = pattern.split("/").filter(Boolean);
  const urlParts = urlPath.split("/").filter(Boolean);
  if (patternParts.length !== urlParts.length) {
    return null;
  }
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const urlPart = urlParts[i];
    if (patternPart.startsWith(":")) {
      const paramName = patternPart.slice(1);
      params[paramName] = urlPart;
    } else if (patternPart !== urlPart) {
      return null;
    }
  }
  return params;
}
var Router = class {
  routes = [];
  add(method, path, handler) {
    this.routes.push({ method, path, handler });
  }
  handle(req, res) {
    const url = req.url || "/";
    for (const route of this.routes) {
      if (route.method !== req.method) {
        continue;
      }
      const params = matchRoute(route.path, url);
      if (params !== null) {
        route.handler(req, res, params);
        return;
      }
    }
    res.statusCode = 404;
    res.end("Not Found");
  }
};

// src/core/server.ts
var import_http = __toESM(require("http"));
var Server = class {
  requestListener;
  constructor(requestListener) {
    this.requestListener = requestListener;
  }
  listen(port, callback) {
    const server = import_http.default.createServer(this.requestListener);
    server.listen(port, callback);
  }
};

// src/core/app.ts
var Application = class {
  router;
  constructor() {
    this.router = new Router();
  }
  get(path, handler) {
    this.router.add("GET", path, handler);
  }
  post(path, handler) {
    this.router.add("POST", path, handler);
  }
  put(path, handler) {
    this.router.add("PUT", path, handler);
  }
  patch(path, handler) {
    this.router.add("PATCH", path, handler);
  }
  delete(path, handler) {
    this.router.add("DELETE", path, handler);
  }
  options(path, handler) {
    this.router.add("OPTIONS", path, handler);
  }
  head(path, handler) {
    this.router.add("HEAD", path, handler);
  }
  listen(port, callback) {
    const server = new Server((req, res) => {
      this.router.handle(req, res);
    });
    server.listen(port, callback);
  }
};
function createApp() {
  return new Application();
}

// src/index.ts
var app = createApp();
app.get("/", (req, res, params) => {
  res.end("Hello from my framework!");
});
app.get("/test", (req, res, params) => {
  res.end("This is a test route");
});
app.get("/users/:id", (req, res, params) => {
  res.end(`User ID: ${params.id}`);
});
app.get("/users/:id/posts/:postId", (req, res, params) => {
  res.end(`User ID: ${params.id}, Post ID: ${params.postId}`);
});
app.post("/submit", (req, res, params) => {
  res.end("POST request received");
});
app.listen(3e3, () => {
  console.log("Server running on http://localhost:3000");
});
//# sourceMappingURL=index.js.map