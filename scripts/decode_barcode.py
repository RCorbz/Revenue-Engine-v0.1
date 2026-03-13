import cv2
import sys
import json
import base64
import numpy as np
import os
from pyzbar.pyzbar import decode

def decode_barcode():
    try:
        # Read from stdin to handle large payloads on Windows
        input_data = sys.stdin.read().strip()
        
        if not input_data:
            return {"success": False, "error": "No input provided"}

        # Assume base64
        if ',' in input_data:
            input_data = input_data.split(',')[1]
            
        try:
            img_data = base64.b64decode(input_data)
        except Exception as e:
            return {"success": False, "error": f"Base64 decode failed: {str(e)}"}
            
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"success": False, "error": "Could not decode image (OpenCV)"}

        # pyzbar decode
        barcodes = decode(img)
        
        results = []
        for barcode in barcodes:
            try:
                data = barcode.data.decode('utf-8')
                results.append({
                    "type": barcode.type,
                    "data": data
                })
            except Exception:
                continue # Skip unreadable data
            
        if not results:
            return {"success": False, "error": "No barcode found"}
            
        return {"success": True, "barcodes": results}

    except Exception as e:
        return {"success": False, "error": f"Runtime error: {str(e)}"}

if __name__ == "__main__":
    result = decode_barcode()
    print(json.dumps(result))
