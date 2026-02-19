import io
import base64
import qrcode
from qrcode.image.styledpil import StyledPilImage
from PIL import Image
from flask import Flask, render_template, request, jsonify, send_file

app = Flask(__name__)


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color string to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def build_data_string(mode: str, data: dict) -> str:
    """Build the QR data string based on mode."""
    if mode == 'url':
        url = data.get('url', '').strip()
        if not url:
            raise ValueError('URL is required.')
        return url

    elif mode == 'text':
        text = data.get('text', '').strip()
        if not text:
            raise ValueError('Text content is required.')
        return text

    elif mode == 'wifi':
        ssid = data.get('ssid', '').strip()
        password = data.get('password', '')
        encryption = data.get('encryption', 'WPA')
        if not ssid:
            raise ValueError('Wi-Fi SSID is required.')
        return f'WIFI:T:{encryption};S:{ssid};P:{password};;'

    elif mode == 'vcard':
        first = data.get('first', '').strip()
        last = data.get('last', '').strip()
        if not first and not last:
            raise ValueError('At least a first or last name is required.')
        phone = data.get('phone', '').strip()
        email = data.get('email', '').strip()
        url = data.get('url', '').strip()
        return (
            f'BEGIN:VCARD\n'
            f'VERSION:3.0\n'
            f'FN:{first} {last}\n'
            f'N:{last};{first}\n'
            f'TEL:{phone}\n'
            f'EMAIL:{email}\n'
            f'URL:{url}\n'
            f'END:VCARD'
        )

    else:
        raise ValueError(f'Unknown mode: {mode}')


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/generator')
def generator():
    return render_template('generator.html')


@app.route('/api/generate', methods=['POST'])
def generate():
    """Generate a QR code and return it as a base64 PNG."""
    try:
        payload = request.get_json(force=True)

        mode       = payload.get('mode', 'url')
        ec_map     = {'L': qrcode.constants.ERROR_CORRECT_L,
                      'M': qrcode.constants.ERROR_CORRECT_M,
                      'Q': qrcode.constants.ERROR_CORRECT_Q,
                      'H': qrcode.constants.ERROR_CORRECT_H}
        ec_level   = ec_map.get(payload.get('errorCorrection', 'M'), qrcode.constants.ERROR_CORRECT_M)
        size       = max(1, min(20, int(payload.get('size', 10))))   # box size (modules)
        margin     = max(0, min(10, int(payload.get('margin', 4))))
        fg_hex     = payload.get('fgColor', '#000000')
        bg_hex     = payload.get('bgColor', '#ffffff')

        # Build data string
        data_str = build_data_string(mode, payload.get('data', {}))

        # Generate QR
        qr = qrcode.QRCode(
            version=None,           # auto-size
            error_correction=ec_level,
            box_size=size,
            border=margin,
        )
        qr.add_data(data_str)
        qr.make(fit=True)

        fg_rgb = hex_to_rgb(fg_hex)
        bg_rgb = hex_to_rgb(bg_hex)

        img = qr.make_image(fill_color=fg_rgb, back_color=bg_rgb)

        # Encode to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        img_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{img_b64}',
            'dataString': data_str,
            'charCount': len(data_str),
            'errorCorrection': payload.get('errorCorrection', 'M'),
        })

    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        app.logger.error(f'QR generation error: {e}')
        return jsonify({'success': False, 'error': 'Server error during QR generation.'}), 500


@app.route('/api/download', methods=['POST'])
def download():
    """Return QR code as a downloadable PNG file."""
    try:
        payload = request.get_json(force=True)

        mode     = payload.get('mode', 'url')
        ec_map   = {'L': qrcode.constants.ERROR_CORRECT_L,
                    'M': qrcode.constants.ERROR_CORRECT_M,
                    'Q': qrcode.constants.ERROR_CORRECT_Q,
                    'H': qrcode.constants.ERROR_CORRECT_H}
        ec_level = ec_map.get(payload.get('errorCorrection', 'M'), qrcode.constants.ERROR_CORRECT_M)
        size     = max(1, min(20, int(payload.get('size', 10))))
        margin   = max(0, min(10, int(payload.get('margin', 4))))
        fg_rgb   = hex_to_rgb(payload.get('fgColor', '#000000'))
        bg_rgb   = hex_to_rgb(payload.get('bgColor', '#ffffff'))

        data_str = build_data_string(mode, payload.get('data', {}))

        qr = qrcode.QRCode(version=None, error_correction=ec_level,
                           box_size=size, border=margin)
        qr.add_data(data_str)
        qr.make(fit=True)
        img = qr.make_image(fill_color=fg_rgb, back_color=bg_rgb)

        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        return send_file(
            buffer,
            mimetype='image/png',
            as_attachment=True,
            download_name='qrforge.png'
        )

    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        app.logger.error(f'Download error: {e}')
        return jsonify({'success': False, 'error': 'Server error.'}), 500


if __name__ == '__main__':
    app.run(debug=True)
