import http from "http";

export class Server {
  private requestListener: http.RequestListener;

  constructor(requestListener: http.RequestListener) {
    this.requestListener = requestListener;
  }

  listen(port: number, callback?: () => void) {
    const server = http.createServer(this.requestListener);
    server.listen(port, callback);
  }
}
