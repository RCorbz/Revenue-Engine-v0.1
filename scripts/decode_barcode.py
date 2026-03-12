import cv2
import sys
import json
import base64
import numpy as np
from pyzbar.pyzbar import decode

def decode_barcode(input_data):
    try:
        # Check if input_data is a file path
        if os.path.isfile(input_data):
            img = cv2.imread(input_data)
        else:
            # Assume base64
            if ',' in input_data:
                input_data = input_data.split(',')[1]
                
            img_data = base64.b64decode(input_data)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"success": False, "error": "Could not decode image"}

        # pyzbar decode
        barcodes = decode(img)
        
        results = []
        for barcode in barcodes:
            data = barcode.data.decode('utf-8')
            results.append({
                "type": barcode.type,
                "data": data
            })
            
        if not results:
            return {"success": False, "error": "No barcode found"}
            
        return {"success": True, "barcodes": results}

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import os
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No input provided"}))
        sys.exit(1)
        
    result = decode_barcode(sys.argv[1])
    print(json.dumps(result))
