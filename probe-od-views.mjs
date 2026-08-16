import fs from "node:fs"
for (const f of ["cataloghi", "cerca", "i-miei-poster", "impostazioni", "personalizza-poster"]) {
  const t = fs.readFileSync(`.od-probe-${f}.html`, "utf8")
  const b = t.slice(t.indexOf("<body"))
  const ids = [...b.matchAll(/data-od-id="([^"]+)"/g)].map((m) => m[1])
  const headings = [...b.matchAll(/<(h1|h2|h3)[^>]*>([^<]{0,70})/g)].map((m) => `${m[1]}:${m[2].trim()}`)
  const buttons = [...b.matchAll(/<button[^>]*>([^<]{0,40})/g)].map((m) => m[1].trim()).filter((x) => x)
  console.log(`\n===== ${f} =====`)
  console.log("ids:", ids.slice(0, 40).join(", "))
  console.log("headings:", headings.join(" | "))
  console.log("buttons:", buttons.slice(0, 30).join(" | "))
}
