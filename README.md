# Bubble Pop!

Fast, fun bubble popping game. Click or tap bubbles to score before time runs out.

## Local run

- Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari).
- Or use a simple static server:

```bash
# Python 3
python3 -m http.server 5173
# then open http://localhost:5173
```

## Game rules

- You have 60 seconds.
- Pop bubbles to gain points.
- Smaller bubbles are worth more points.
- The game speeds up as you score.

## Deploy to Azure Static Web Apps (via GitHub)

1. Push this folder to a new GitHub repository.
2. In Azure Portal, create a new "Static Web App".
   - Deployment source: GitHub
   - Build details: Framework preset: "Custom"
   - App location: `/`
   - Output location: leave empty
3. Azure will create a GitHub Actions workflow automatically. If you prefer using the included workflow in `.github/workflows/azure-static-web-apps.yml`, set the repository secret:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN`: the deployment token from your Static Web App (Azure Portal → your Static Web App → Deployment tokens)
4. Commit and push. Deployments will trigger on pushes to `main`.

## Notes

- Best score and mute preference are stored in `localStorage`.
- Works on desktop and mobile; uses synthesized pop sounds (no assets).
