/*
oxide-js/
│
├── src/
│   │
│   ├── core/
│   │   ├── app.ts              # Application class (main entry logic)
│   │   ├── server.ts           # HTTP server wrapper
│   │   └── context.ts          # Shared request/response context
│   │
│   ├── router/
│   │   ├── router.ts           # Router implementation
│   │   ├── route.ts            # Route model
│   │   ├── matcher.ts          # Path matching & param extraction
│   │   └── methods.ts          # HTTP method utilities
│   │
│   ├── middleware/
│   │   ├── runner.ts           # Middleware execution pipeline
│   │   ├── types.ts            # Middleware type definitions
│   │   └── error-handler.ts    # Error middleware logic
│   │
│   ├── request/
│   │   ├── request.ts          # Extended request object
│   │   └── query-parser.ts     # Query parsing utility
│   │
│   ├── response/
│   │   └── response.ts         # Extended response helpers
│   │
│   ├── body/
│   │   ├── json.ts             # JSON body parser
│   │   └── urlencoded.ts       # URL-encoded parser
│   │
│   ├── types/
│   │   └── index.ts            # Shared public types
│   │
│   ├── utils/
│   │   ├── compose.ts          # Middleware composition utility
│   │   └── path-to-regex.ts    # Path → regex converter
│   │
│   └── index.ts                # Public export entry
│
├── tests/
│   ├── router.test.ts
│   ├── middleware.test.ts
│   └── server.test.ts
│
├── examples/
│   └── basic-server.ts         # Example usage
│
├── package.json
├── tsconfig.json
├── tsup.config.ts              # Build config (or esbuild)
├── README.md
├── LICENSE
└── ROADMAP.md
*/