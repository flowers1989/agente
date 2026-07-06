import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.0.108"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // Marcar paquetes Node.js como externos al bundle del cliente.
  // Evita que dockerode, ssh2 y sus dependencias (child_process, fs, net)
  // intenten ser incluidas en el bundle del browser.
  serverExternalPackages: ["dockerode", "ssh2", "docker-modem", "cpu-features", "sshpk"],

  // Turbopack: silenciar el warning y configurar aliases para módulos Node.js
  turbopack: {
    resolveAlias: {
      // Reemplazar módulos Node.js con módulos vacíos en el bundle del cliente
      "child_process": { browser: "./src/lib/empty-module.ts" },
      "fs": { browser: "./src/lib/empty-module.ts" },
      "net": { browser: "./src/lib/empty-module.ts" },
      "tls": { browser: "./src/lib/empty-module.ts" },
      "dns": { browser: "./src/lib/empty-module.ts" },
    },
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        child_process: false,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        os: false,
        path: false,
        stream: false,
        crypto: false,
        http: false,
        https: false,
        zlib: false,
        readline: false,
        assert: false,
        util: false,
        events: false,
        buffer: false,
      };
    }
    return config;
  },
};

export default nextConfig;
