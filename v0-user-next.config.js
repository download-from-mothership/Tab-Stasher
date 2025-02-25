const path = require("path")
const fs = require("fs")

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    const srcPath = path.join(__dirname, "src")
    console.log("Src directory path:", srcPath)
    console.log("Src directory contents:", fs.readdirSync(srcPath))

    const hooksPath = path.join(srcPath, "hooks")
    console.log("Hooks directory path:", hooksPath)
    console.log("Hooks directory exists:", fs.existsSync(hooksPath))

    if (fs.existsSync(hooksPath)) {
      console.log("Hooks directory contents:", fs.readdirSync(hooksPath))
    }

    config.resolve.alias["@"] = srcPath
    console.log("@ alias configured to:", config.resolve.alias["@"])

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      }
    }

    return config
  },
}

module.exports = nextConfig

