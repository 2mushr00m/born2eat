// docs/mountDocs.js
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function mountDocs(app) {
  const specPath = path.join(__dirname, 'Born2Eat API.openapi.yaml');

  app.get('/openapi.yml', (req, res, next) => {
    fs.stat(specPath, (err) => {
      if (err) return next(err); // 404/500로 잡히게
      res.type('text/yaml; charset=utf-8');
      fs.createReadStream(specPath).pipe(res);
    });
  });

  app.use(
    '/swagger',
    swaggerUi.serve,
    swaggerUi.setup(null, {
      swaggerOptions: { url: '/openapi.yml' },
    }),
  );

  app.get('/apis', (req, res) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' https: data: blob:; script-src 'self' https: 'unsafe-inline'; style-src 'self' https: 'unsafe-inline'; img-src 'self' https: data: blob:;",
    );
    res.type('text/html; charset=utf-8').send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Born2Eat API Docs</title>
    <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css" />
    <style>
      body { margin: 0; }
      elements-api { display: block; height: 100vh; }
    </style>
  </head>
  <body>
    <elements-api apiDescriptionUrl="/openapi.yml" router="hash"></elements-api>
  </body>
</html>`);
  });
}
