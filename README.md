# QRforge — Flask QR Code Generator

A dark-aesthetic QR code generator with a Flask backend handling all QR generation server-side using the `qrcode` + `Pillow` Python libraries.

## Project Structure

```
qrforge/
├── app.py               # Flask app + API routes
├── requirements.txt     # Python dependencies
├── templates/
│   └── index.html       # Frontend (Bootstrap 5)
└── README.md
```

## Setup & Run

```bash
# 1. Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run
python app.py
```

Then open **http://localhost:5000** in your browser.

## API Endpoints

### `POST /api/generate`
Generates a QR code and returns it as a base64-encoded PNG.

**Request body:**
```json
{
  "mode": "url",              // url | text | wifi | vcard
  "data": {
    "url": "https://..."      // fields depend on mode
  },
  "errorCorrection": "M",     // L | M | Q | H
  "size": 10,                 // module box size (4–20)
  "margin": 4,                // border in modules (0–10)
  "fgColor": "#000000",
  "bgColor": "#ffffff"
}
```

**Response:**
```json
{
  "success": true,
  "image": "data:image/png;base64,...",
  "dataString": "https://...",
  "charCount": 19,
  "errorCorrection": "M"
}
```

### `POST /api/download`
Same request body as `/api/generate` — returns a PNG file attachment for direct download.

## Modes

| Mode    | Required fields               |
|---------|-------------------------------|
| `url`   | `data.url`                    |
| `text`  | `data.text`                   |
| `wifi`  | `data.ssid`, `data.password`, `data.encryption` |
| `vcard` | `data.first` or `data.last`  |
