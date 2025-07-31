# Pet Pantry Label Generator

This is the public frontend for the SPCA Pet Pantry label app. It allows volunteers to:

- Scan or enter a UPC
- Automatically check the master Google Sheet for known product info
- If no match is found, upload two photos (front + ingredients)
- GPT extracts full label details and fills out the form
- Label is saved to Google Sheets and opened for printing

## How to Deploy

1. Drag and drop these files into your GitHub repo
2. Go to Settings > Pages
3. Set deployment source: main branch, root folder
4. App will be live at `https://<your-org>.github.io/pet-pantry-labels/`