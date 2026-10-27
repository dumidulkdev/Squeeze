# Squeeze

Compress PNG and JPG images to **WebP** or **SVG** in bulk, right in your browser.
Built for people with lots of large images who need them small enough for a website without a visible drop in quality.

**Live app:** https://YOUR-APP.vercel.app  <!-- replace with your Vercel URL after deploying -->

## Features

- Batch convert hundreds of images at once
- Output as WebP, SVG (embedded WebP) or SVG (traced vectors)
- Quality slider and optional max width to shrink big images
- Real progress bar with elapsed time and time left
- Keeps the original file names (`photo.png` becomes `photo.webp`)
- Download one file directly, or many as a single ZIP
- Accepts only PNG, JPG and JPEG (checked by file contents, not just the name)
- Private: images are processed on your device and never uploaded

## Which format should I pick?

| Format | Best for | Notes |
| --- | --- | --- |
| WebP | Photos and general website images | Usually 60-90% smaller. Start with quality 75-85. |
| SVG embed | When you need an `.svg` file but the same look | A compressed WebP wrapped in an SVG. |
| SVG trace | Logos, icons, flat graphics | Real vector shapes. Photos look posterized and the file can get larger. |

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build   # production build
npm start       # run the production build
```

## Deploy to Vercel

1. Push this project to a GitHub repository.
2. Go to https://vercel.com/new and import the repository.
3. Click **Deploy**. No settings or environment variables are needed.
4. Copy your live URL and paste it into the **Live app** line above.

Optional: if you add a custom domain, set the environment variable `NEXT_PUBLIC_SITE_URL` (for example `https://squeeze.example.com`) so link previews use it.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) and TypeScript
- [Tailwind CSS](https://tailwindcss.com) with the Poppins font
- [lucide-react](https://lucide.dev) icons
- Web Workers for off-thread conversion, [JSZip](https://stuk.github.io/jszip/) for ZIP downloads
- [ImageTracer.js](https://github.com/jankovicsandras/imagetracerjs) for SVG tracing
- [@jsquash/webp](https://github.com/jamsinclair/jSquash) as a WebP fallback for browsers that cannot encode WebP

## Project structure

```
app/          page, layout, metadata, icons
components/   UI (settings bar, drop zone, file table, progress)
lib/          validation, naming, ZIP, worker pool helpers
workers/      the image conversion worker
```

## Notes

- Very large batches use your device's memory. If a browser tab gets slow, convert in smaller groups.
- Safari cannot encode WebP natively, so the WASM fallback is used there and is a bit slower.
