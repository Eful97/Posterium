import path from "node:path"

export const DATA_DIR = process.env.POSTERIUM_DATA_DIR || path.join(process.cwd(), "data")
