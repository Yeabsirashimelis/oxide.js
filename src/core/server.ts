import http from "http";
import https from "https";

export interface SSLOptions {
  key: string | Buffer;
  cert: string | Buffer;
  ca?: string | Buffer;
}

export class Server {
  private requestListener: http.RequestListener;

  constructor(requestListener: http.RequestListener) {
    this.requestListener = requestListener;
  }

  listen(port: number, callback?: () => void): http.Server;
  listen(port: number, ssl: SSLOptions, callback?: () => void): https.Server;
  listen(port: number, sslOrCallback?: SSLOptions | (() => void), callback?: () => void): http.Server | https.Server {
    if (typeof sslOrCallback === "object" && sslOrCallback !== null) {
      // HTTPS
      const server = https.createServer(sslOrCallback, this.requestListener);
      server.listen(port, callback);
      return server;
    } else {
      // HTTP
      const server = http.createServer(this.requestListener);
      server.listen(port, sslOrCallback as (() => void) | undefined);
      return server;
    }
  }
}
